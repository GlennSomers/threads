#!/usr/bin/env python3
"""Run one Studio job away from the Studio server. Used by the hosted app (GitHub Actions) and by its local dev mode.

Usage: python3 studio_job.py <job> '<json args>'
Jobs
  prepare {clip}                  clips/<file> -> proxy/<stem>.mp4 + clips/<stem>.words.json
  ingest  {id, source}            references-src/<file> -> references/<id>/ (report, measurements, caption.json, sheets)
  import  {url, kind}             download a direct or Google Drive link into clips/ or references-src/, then prepare/ingest it
  shot    {url, file}             real page screenshot -> shots/<file>
  render  {style}                 styles/<name>.json -> renders/<name>/<name>-vN.mp4
Every job writes jobs/<job-id>.json ("running", then "done" or "error: ...").

Storage: STORAGE=fs keeps everything under STORAGE_DIR (local dev). Otherwise Vercel Blob, through studio-app/scripts/blob.mjs.
"""
import json, os, re, shutil, subprocess, sys, tempfile, time, urllib.parse, urllib.request
from pathlib import Path

TOOLS = Path(__file__).resolve().parent
EDIT = TOOLS.parent
APP = EDIT.parent.parent / "studio-app"
FS = os.environ.get("STORAGE") == "fs"
DATA = Path(os.environ.get("STORAGE_DIR", APP / ".data")).resolve()
VIDEO = {".mp4", ".mov", ".m4v", ".webm", ".mkv"}


# ---- storage -------------------------------------------------------------------------------------------------
def blob(*args):
    return subprocess.run(["node", str(APP / "scripts" / "blob.mjs"), *map(str, args)], capture_output=True, text=True, check=True).stdout


def put(path, src, ctype=None):
    if FS:
        d = DATA / path; d.parent.mkdir(parents=True, exist_ok=True); shutil.copyfile(src, d)
    else:
        blob("put", path, src, ctype or "")


def put_text(path, text):
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
        f.write(text); tmp = f.name
    try:
        put(path, tmp, "application/json")
    finally:
        os.unlink(tmp)


def get(path, dst):
    dst = Path(dst); dst.parent.mkdir(parents=True, exist_ok=True)
    if FS:
        shutil.copyfile(DATA / path, dst)
    else:
        blob("get", path, dst)


def exists(path):
    return (DATA / path).exists() if FS else any(b["pathname"] == path for b in json.loads(blob("list", path)))


def status(job_id, state, msg=""):
    put_text(f"jobs/{job_id}.json", json.dumps({"id": job_id, "status": state, "message": msg, "at": int(time.time())}))


def slug(s):
    return re.sub(r"[^a-z0-9-]+", "-", s.lower()).strip("-") or "item"


def safe(name):
    return re.sub(r"[^A-Za-z0-9._-]+", "_", Path(name).name).strip("._") or "file"


# ---- a throwaway copy of the editing-studio folder, so the existing tools run unchanged ---------------------------
def workspace():
    w = Path(tempfile.mkdtemp(prefix="studio-job-"))
    (w / "tools").mkdir()
    for f in TOOLS.glob("*"):
        if f.suffix in (".py", ".js", ".html"):
            shutil.copy(f, w / "tools" / f.name)
    (w / "studio").mkdir(); shutil.copy(EDIT / "studio" / "engine.js", w / "studio" / "engine.js")
    for d in ("clips", "references", "styles", "shots", "luts", "projects"):
        (w / d).mkdir()
    return w


def download(url, dst):
    if url.startswith("/data/"):                       # local dev
        shutil.copyfile(DATA / urllib.parse.unquote(url[6:]), dst); return
    m = re.search(r"/d/([\w-]+)", url) or re.search(r"[?&]id=([\w-]+)", url)
    if m and "drive.google" in url:
        url = f"https://drive.google.com/uc?export=download&id={m.group(1)}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=300) as r, open(dst, "wb") as f:
        if "text/html" in r.headers.get("Content-Type", ""):
            raise RuntimeError("That link isn't a direct file. Share it as 'anyone with the link' and try again.")
        shutil.copyfileobj(r, f)


# ---- jobs ----------------------------------------------------------------------------------------------------
def j_prepare(a, w):
    name = Path(a["clip"]).name; stem = Path(name).stem
    get(f"clips/{name}", w / "clips" / name)
    sys.path.insert(0, str(w / "tools"))
    from proxy import make_proxy
    make_proxy(w / "clips" / name, w / "proxy.mp4")
    words = w / "clips" / f"{stem}.words.json"
    if exists(f"clips/{stem}.words.json"):
        get(f"clips/{stem}.words.json", words)          # already transcribed: keep it
    if not words.exists():
        r = subprocess.run([sys.executable, str(w / "tools" / "transcribe.py"), str(w / "clips" / name)], capture_output=True, text=True)
        if r.returncode:
            put(f"proxy/{stem}.mp4", w / "proxy.mp4", "video/mp4")      # still usable without words
            raise RuntimeError("Transcription failed: " + (r.stderr.strip().splitlines() or ["?"])[-1])
    put(f"proxy/{stem}.mp4", w / "proxy.mp4", "video/mp4")
    put(f"clips/{stem}.words.json", words, "application/json")


def j_ingest(a, w):
    rid = slug(a["id"]); name = Path(a["source"]).name
    get(f"references-src/{name}", w / name)
    r = subprocess.run([sys.executable, str(w / "tools" / "ingest.py"), str(w / name), rid], capture_output=True, text=True)
    if r.returncode:
        raise RuntimeError("Ingest failed: " + (r.stderr.strip().splitlines() or ["?"])[-1])
    for f in (w / "references" / rid).iterdir():
        put(f"references/{rid}/{f.name}", f, "image/jpeg" if f.suffix == ".jpg" else "application/json" if f.suffix == ".json" else "text/plain")


def j_import(a, w):
    kind = a.get("kind", "clip"); name = safe(a.get("name") or Path(urllib.parse.urlparse(a["url"]).path).name or "import.mp4")
    if Path(name).suffix.lower() not in VIDEO: name += ".mp4"
    tmp = w / name; download(a["url"], tmp)
    if kind == "clip":
        put(f"clips/{name}", tmp, "video/mp4"); run("prepare", {"clip": name}, f"prep-{Path(name).stem}")
    else:
        rid = slug(Path(name).stem); put(f"references-src/{name}", tmp, "video/mp4"); run("ingest", {"id": rid, "source": name}, f"ing-{rid}")


def j_shot(a, w):
    out = w / "shot.png"
    r = subprocess.run(["node", str(w / "tools" / "screenshot.js"), a["url"], str(out)], capture_output=True, text=True)
    if r.returncode:
        raise RuntimeError("Screenshot failed: " + (r.stderr.strip().splitlines() or ["?"])[-1])
    put(f"shots/{safe(a['file'])}", out, "image/png")


def j_render(a, w):
    style = a["style"]; name = slug(style["name"])
    (w / "styles" / f"{name}.json").write_text(json.dumps(style))
    clip = safe(style["clip"]); stem = Path(clip).stem
    get(f"clips/{clip}", w / "clips" / clip); get(f"clips/{stem}.words.json", w / "clips" / f"{stem}.words.json")
    for b in style.get("beats", []):
        if b.get("shot"): get(f"shots/{safe(b['shot'])}", w / "shots" / safe(b["shot"]))
    if style.get("lut"): get(f"luts/{slug(style['lut'])}.cube", w / "luts" / f"{slug(style['lut'])}.cube")
    r = subprocess.run([sys.executable, str(w / "tools" / "render.py"), name], capture_output=True, text=True)
    sys.stdout.write(r.stdout[-2000:])
    if r.returncode:
        raise RuntimeError("Render failed: " + (r.stderr.strip().splitlines() or ["?"])[-1])
    outs = sorted((w / "projects" / name / "renders").glob("*.mp4"))
    # keep numbering across runs: the workspace is fresh, so pick the next free version in storage
    v = 1
    while exists(f"renders/{name}/{name}-v{v}.mp4"): v += 1
    put(f"renders/{name}/{name}-v{v}.mp4", outs[-1], "video/mp4")


JOBS = {"prepare": j_prepare, "ingest": j_ingest, "import": j_import, "shot": j_shot, "render": j_render}


def run(job, args, job_id=None):
    job_id = job_id or f"{job}-{int(time.time())}"
    status(job_id, "running")
    w = workspace()
    try:
        JOBS[job](args, w); status(job_id, "done")
    except Exception as e:
        status(job_id, "error", str(e)[:300]); raise
    finally:
        shutil.rmtree(w, ignore_errors=True)


if __name__ == "__main__":
    if len(sys.argv) < 3 or sys.argv[1] not in JOBS:
        sys.exit(__doc__)
    args = json.loads(sys.argv[2])
    try:
        run(sys.argv[1], args, args.get("job_id"))
    except Exception as e:
        print("error:", e, file=sys.stderr); sys.exit(1)
