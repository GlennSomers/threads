#!/usr/bin/env python3
"""Run one Studio job away from the Studio server. Used by the hosted app (GitHub Actions) and by its local dev mode.

Usage: python3 studio_job.py <job> '<json args>'
Jobs
  prepare {clip}                  clips/<file> -> proxy/<stem>.mp4 + clips/<stem>.words.json
  ingest  {id, source}            references-src/<file> -> references/<id>/ (report, measurements, caption.json, sheets)
  import  {url, kind}             download a direct or Google Drive link into clips/ or references-src/, then prepare/ingest it
  shot    {url, file}             real page screenshot -> shots/<file>
  render  {style}                 styles/<name>.json -> renders/<name>/<name>-vN.mp4
  fxcheck {clip, effect, file}    three check frames of one effect (effects skill) -> shots/<file>
  chat    {id}                    chat/<id>-in.json -> Claude Code (Glenn's Claude login) -> chat/<id>.json {reply, ops}
  anim    {source, id, name, start, end, box, kind}   grab one animation from a reference -> animations/<id>.json + shots/anim-<id>.jpg
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
# the effects skill lives next to the editing studio; render.py runs it from a throwaway workspace, so point at it
os.environ.setdefault("FX_DIR", str(EDIT.parent / "skills" / "effects"))
os.environ.setdefault("REANIMATE_EASING", str(EDIT.parent / "skills" / "reanimate" / "scripts" / "easing.ts"))


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
    (w / "studio").mkdir(); shutil.copy(EDIT / "studio" / "engine.js", w / "studio" / "engine.js"); shutil.copy(EDIT / "studio" / "motion.js", w / "studio" / "motion.js")
    for d in ("clips", "references", "styles", "shots", "luts", "projects", "fonts"):
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
        for key in ("shot", "image"):
            if b.get(key): get(f"shots/{safe(b[key])}", w / "shots" / safe(b[key]))
    for f in style.get("fonts") or []:
        if f.get("file"): get(f"fonts/{safe(f['file'])}", w / "fonts" / safe(f["file"]))
    for e in style.get("els") or []:
        if e.get("file"): get(f"shots/{safe(e['file'])}", w / "shots" / safe(e["file"]))
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


def j_fxcheck(a, w):
    """Three frames (35%, 60% and 90% in: several effects build up late) of one effect, side by side, so it can be checked before a render."""
    sys.path.insert(0, str(w / "tools"))
    from render import fx_tool
    name = safe(a["clip"]); e = a["effect"]
    get(f"clips/{name}", w / name)
    s0, s1 = float(e["start"]), float(e["end"]); pad = min(0.6, s0)
    seg = w / "seg.mp4"   # only the part around the effect: tracking reads every frame
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{s0 - pad:.3f}", "-i", str(w / name), "-t", f"{s1 - s0 + pad + 0.6:.3f}",
                    "-vf", "scale='if(lt(iw,ih),720,-2)':'if(lt(iw,ih),-2,720)'", "-c:v", "libx264", "-crf", "16", "-preset", "veryfast", "-an", str(seg)], check=True)
    d = {"fx": e["fx"], "start": round(pad, 3), "end": round(pad + s1 - s0, 3)}
    d.update({k: str(v) for k, v in (e.get("opts") or {}).items() if str(v).strip()})
    (w / "plan.json").write_text(json.dumps({"effects": [d]}))
    ts = [pad + (s1 - s0) * k for k in (0.35, 0.6, 0.9)]
    fx, py = fx_tool()
    r = subprocess.run([py, str(fx), "--plan", str(w / "plan.json"), str(seg), str(w / "c.png"), "--still", ",".join(f"{t:.2f}" for t in ts), "--width", "720"],
                       capture_output=True, text=True)
    if r.returncode:
        raise RuntimeError("Effect check failed: " + (r.stderr.strip().splitlines() or ["?"])[-1])
    pngs = sorted(w.glob("c_*.png"), key=lambda p: float(p.stem[2:])) or [w / "c.png"]
    out = w / "check.jpg"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *sum((["-i", str(p)] for p in pngs), []), "-filter_complex",
                    "".join(f"[{i}:v]scale=360:-2[s{i}];" for i in range(len(pngs))) + "".join(f"[s{i}]" for i in range(len(pngs))) + f"hstack=inputs={len(pngs)}" if len(pngs) > 1 else "[0:v]scale=360:-2",
                    "-q:v", "3", str(out)], check=True)
    put(f"shots/{safe(a['file'])}", out, "image/jpeg")


def j_anim(a, w):
    """One animation from a reference reel, as a Studio preset (tools/grab_anim.py; easing named by the reanimate skill)."""
    name = safe(a["source"]); pid = slug(a["id"])
    get(f"references-src/{name}", w / name)
    box = ",".join(f"{float(v):.4f}" for v in a["box"])
    r = subprocess.run([sys.executable, str(w / "tools" / "grab_anim.py"), str(w / name), f"{float(a['start']):.3f}", f"{float(a['end']):.3f}", box,
                        str(w / "anim.json"), "--name", str(a.get("name") or pid), "--kind", a.get("kind") or "auto", "--sheet", str(w / "anim.jpg"),
                        "--source", str(a.get("ref") or name)], capture_output=True, text=True)
    if r.returncode:
        raise RuntimeError("Grab failed: " + (r.stderr.strip().splitlines() or ["?"])[-1])
    j = json.loads((w / "anim.json").read_text()); j["id"] = pid; j["sheet"] = f"anim-{pid}.jpg"
    (w / "anim.json").write_text(json.dumps(j, indent=1))
    put(f"shots/anim-{pid}.jpg", w / "anim.jpg", "image/jpeg")
    put(f"animations/{pid}.json", w / "anim.json", "application/json")


def j_chat(a, w):
    """Answer one edit-chat message with Claude Code, logged in with CLAUDE_CODE_OAUTH_TOKEN (no API key)."""
    cid = re.sub(r"[^a-z0-9-]", "", a["id"])
    if os.environ.get("GITHUB_ACTIONS") and not os.environ.get("CLAUDE_CODE_OAUTH_TOKEN"):
        raise RuntimeError("The repo secret CLAUDE_CODE_OAUTH_TOKEN is missing (run 'claude setup-token' and add it in GitHub).")
    get(f"chat/{cid}-in.json", w / "in.json")
    req = json.loads((w / "in.json").read_text())
    (w / "system.md").write_text(req["system"])
    r = subprocess.run(["claude", "-p", "--output-format", "json", "--json-schema", json.dumps(req["schema"]), "--system-prompt-file", str(w / "system.md"),
                        "--tools", "", "--max-turns", "3"], input=req["user"], capture_output=True, text=True, timeout=300, cwd=str(w))
    out = None
    try:
        res = json.loads(r.stdout)
        out = res.get("structured_output")
        if out is None:
            txt = res.get("result") or ""
            out = json.loads(txt[txt.index("{"):txt.rindex("}") + 1])
    except (ValueError, KeyError, AttributeError):
        pass
    if not isinstance(out, dict) or "ops" not in out:
        msg = (r.stderr.strip().splitlines() or [r.stdout.strip()[:200] or "no answer"])[-1]
        if "auth" in msg.lower() or "login" in msg.lower() or "token" in msg.lower():
            msg = "Claude Code is not logged in: check the CLAUDE_CODE_OAUTH_TOKEN repo secret. " + msg
        raise RuntimeError("Claude did not answer: " + msg)
    (w / "out.json").write_text(json.dumps({"reply": str(out.get("reply") or ""), "ops": out.get("ops") or []}))
    put(f"chat/{cid}.json", w / "out.json", "application/json")


JOBS = {"chat": j_chat, "anim": j_anim, "fxcheck": j_fxcheck, "prepare": j_prepare, "ingest": j_ingest, "import": j_import, "shot": j_shot, "render": j_render}


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
