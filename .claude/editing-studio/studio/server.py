#!/usr/bin/env python3
"""Studio server: static files with HTTP range support, plus a small API.

Run: python3 server.py   (opens on http://localhost:8765)
API
  GET  /api/clips            list clips with their transcript and proxy status
  POST /api/upload?name=x.mp4  raw body -> saved to ../clips/, then processed
  POST /api/import           {"url": "<Google Drive / direct link>"} -> saved to ../clips/
  POST /api/process?name=x   (re)make proxy + transcript for a clip
  POST /api/shot             {"url": "..."} -> ../shots/<name>.png (needs Playwright)
  POST /api/ingest-upload?name=x.mp4 | /api/ingest-import   analyse a reference video -> ../references/<name>/
  GET  /api/ingests          analysed references
  POST /api/preset           save a caption preset (only when you press Save)
  GET  /api/presets          saved caption presets
  POST /api/lut-save         {"name", "text"} -> ../luts/<id>.cube (only when you press Save)
  GET  /api/luts             saved LUT presets
  POST /api/render {name}    render a saved style (tools/render.py); GET /api/renders?name=...
  POST /save                 {"name": "...", ...} -> ../styles/<name>.json
  GET  /api/styles           saved styles
"""
import json, os, re, subprocess, sys, threading, urllib.parse, urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
CLIPS, STYLES, TOOLS, SHOTS = ROOT / "clips", ROOT / "styles", ROOT / "tools", ROOT / "shots"
REFS, PRESETS, LUTS = ROOT / "references", ROOT / "styles" / "captions", ROOT / "luts"
PROXY = HERE / "proxy"
VIDEO_EXT = {".mp4", ".mov", ".m4v", ".webm", ".mkv"}
render_status = {}
ingest_status = {}
status = {}  # clip name -> "processing" | "ready" | "error: ..."


def safe(name):
    name = re.sub(r"[^A-Za-z0-9._-]+", "_", Path(name).name).strip("._") or "clip.mp4"
    return name if Path(name).suffix.lower() in VIDEO_EXT else name + ".mp4"


def process(name):
    """Small proxy with a keyframe every 0.2s, then word timings."""
    status[name] = "processing"
    try:
        PROXY.mkdir(exist_ok=True)
        src = CLIPS / name
        subprocess.run(["ffmpeg", "-y", "-i", str(src), "-vf", "scale=-2:480", "-r", "30",
                        "-g", "6", "-keyint_min", "6", "-c:v", "libx264", "-preset", "veryfast",
                        "-crf", "26", "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart",
                        str(PROXY / (Path(name).stem + ".mp4"))], check=True,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        words = src.with_suffix(".words.json")
        if not words.exists():
            r = subprocess.run([sys.executable, str(TOOLS / "transcribe.py"), str(src)],
                               capture_output=True, text=True)
            if r.returncode:
                raise RuntimeError("transcription failed: " + (r.stderr.strip().splitlines() or ["?"])[-1])
        status[name] = "ready"
    except Exception as e:
        status[name] = f"error: {e}"


def run_render(name):
    render_status[name] = {"status": "running", "message": ""}
    r = subprocess.run([sys.executable, str(TOOLS / "render.py"), name], capture_output=True, text=True)
    render_status[name] = {"status": "done", "message": ""} if r.returncode == 0 else \
        {"status": "error", "message": (r.stderr.strip().splitlines() or ["render failed"])[-1]}


def run_ingest(rid, src):
    ingest_status[rid] = "processing"
    r = subprocess.run([sys.executable, str(TOOLS / "ingest.py"), str(src), rid], capture_output=True, text=True)
    ingest_status[rid] = "ready" if r.returncode == 0 else "error: " + ((r.stderr.strip().splitlines() or ["ingest failed"])[-1])


def list_ingests():
    out = []
    for d in sorted(REFS.iterdir()) if REFS.exists() else []:
        if not d.is_dir(): continue
        m, c = d / "measurements.json", d / "caption.json"
        st = ingest_status.get(d.name) or ("ready" if m.exists() else "new")
        if st == "new": continue
        meas = json.loads(m.read_text()) if m.exists() else None
        out.append({"id": d.name, "name": (meas or {}).get("source", d.name), "status": st, "measurements": meas,
                    "caption": json.loads(c.read_text()) if c.exists() else None, "grade_ok": bool(meas)})
    return out


def drive_url(url):
    m = re.search(r"/d/([\w-]+)", url) or re.search(r"[?&]id=([\w-]+)", url)
    return f"https://drive.google.com/uc?export=download&id={m.group(1)}" if m and "drive.google" in url else url


def list_clips():
    out = []
    for p in sorted(CLIPS.iterdir()) if CLIPS.exists() else []:
        if p.suffix.lower() in VIDEO_EXT:
            w = p.with_suffix(".words.json")
            proxy = PROXY / (p.stem + ".mp4")
            st = status.get(p.name) or ("ready" if proxy.exists() and w.exists() else "new")
            out.append({"name": p.name, "status": st,
                        "proxy": f"/proxy/{p.stem}.mp4" if proxy.exists() else None,
                        "words": json.loads(w.read_text()) if w.exists() else []})
    return out


class H(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=str(HERE), **k)

    def translate_path(self, path):
        p = path.split("?")[0]
        if p.startswith("/shots/"):
            return str(SHOTS / Path(p).name)
        if p.startswith("/renders/"):
            parts = urllib.parse.unquote(p).split("/")
            if len(parts) == 4 and ".." not in parts:
                return str(ROOT / "projects" / parts[2] / "renders" / parts[3])
        if p.startswith("/luts/"):
            return str(LUTS / Path(urllib.parse.unquote(p)).name)
        if p.startswith("/refs/"):
            parts = urllib.parse.unquote(p).split("/")
            if len(parts) == 4 and ".." not in parts:
                return str(REFS / parts[2] / parts[3])
        return super().translate_path(path)

    def json(self, obj, code=200):
        b = json.dumps(obj).encode()
        self.send_response(code); self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(b))); self.end_headers(); self.wfile.write(b)

    def body(self):
        return self.rfile.read(int(self.headers.get("Content-Length") or 0))

    def start(self, name):
        if status.get(name) != "processing":
            threading.Thread(target=process, args=(name,), daemon=True).start()
            status[name] = "processing"

    # ---- range-capable file serving
    def send_head(self):
        path = Path(self.translate_path(self.path.split("?")[0]))
        rng = self.headers.get("Range")
        if not rng or not path.is_file():
            return super().send_head()
        m = re.match(r"bytes=(\d*)-(\d*)", rng)
        size = path.stat().st_size
        start = int(m.group(1)) if m.group(1) else 0
        end = int(m.group(2)) if m.group(2) else size - 1
        end = min(end, size - 1)
        if start > end:
            self.send_error(416); return None
        f = open(path, "rb"); f.seek(start)
        self.send_response(206)
        self.send_header("Content-Type", self.guess_type(str(path)))
        self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.send_header("Content-Length", str(end - start + 1))
        self.send_header("Accept-Ranges", "bytes"); self.end_headers()
        self._left = end - start + 1
        return f

    def copyfile(self, src, dst):
        left = getattr(self, "_left", None)
        self._left = None
        while True:
            chunk = src.read(65536 if left is None else min(65536, left))
            if not chunk: break
            dst.write(chunk)
            if left is not None:
                left -= len(chunk)
                if left <= 0: break

    def end_headers(self):
        self.send_header("Accept-Ranges", "bytes"); self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self):
        u = urllib.parse.urlparse(self.path)
        if u.path == "/api/clips": return self.json(list_clips())
        if u.path == "/api/config": return self.json({"blob": False, "auth": False, "authed": True})
        if u.path == "/api/renders":
            n = re.sub(r"[^a-z0-9-]+", "-", urllib.parse.parse_qs(u.query).get("name", [""])[0].lower()).strip("-")
            d = ROOT / "projects" / n / "renders"
            files = [{"file": f.name, "url": f"/renders/{n}/{f.name}", "size": f.stat().st_size} for f in sorted(d.glob("*.mp4"))] if d.exists() else []
            return self.json({"files": files, "job": render_status.get(n)})
        if u.path == "/api/ingests": return self.json(list_ingests())
        if u.path == "/api/luts":
            LUTS.mkdir(exist_ok=True)
            return self.json([json.loads(p.read_text()) for p in sorted(LUTS.glob("*.json"))])
        if u.path == "/api/presets":
            PRESETS.mkdir(parents=True, exist_ok=True)
            return self.json([json.loads(p.read_text()) for p in sorted(PRESETS.glob("*.json"))])
        if u.path == "/api/styles":
            STYLES.mkdir(exist_ok=True)
            return self.json([json.loads(p.read_text()) for p in sorted(STYLES.glob("*.json"))])
        return super().do_GET()

    def do_POST(self):
        u = urllib.parse.urlparse(self.path); q = urllib.parse.parse_qs(u.query)
        CLIPS.mkdir(exist_ok=True)
        try:
            if u.path == "/api/upload":
                name = safe(q.get("name", ["clip.mp4"])[0])
                (CLIPS / name).write_bytes(self.body()); self.start(name)
                return self.json({"name": name})
            if u.path == "/api/import":
                url = drive_url(json.loads(self.body())["url"])
                if not url.startswith("https://"): return self.json({"error": "https links only"}, 400)
                req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req, timeout=120) as r:
                    ctype = r.headers.get("Content-Type", "")
                    if "text/html" in ctype:
                        return self.json({"error": "That link isn't a direct file. Share it as 'anyone with the link' and try again."}, 400)
                    cd = r.headers.get("Content-Disposition", "")
                    m = re.search(r'filename="?([^";]+)', cd)
                    name = safe(m.group(1) if m else Path(urllib.parse.urlparse(url).path).name or "drive-clip.mp4")
                    with open(CLIPS / name, "wb") as f:
                        while chunk := r.read(1 << 20): f.write(chunk)
                self.start(name); return self.json({"name": name})
            if u.path == "/api/shot":
                url = json.loads(self.body())["url"].strip()
                if not re.match(r"https?://", url): url = "https://" + url
                SHOTS.mkdir(exist_ok=True)
                fname = re.sub(r"[^a-z0-9]+", "-", re.sub(r"^https?://", "", url.lower())).strip("-")[:60] + ".png"
                r = subprocess.run(["node", str(TOOLS / "screenshot.js"), url, str(SHOTS / fname)], capture_output=True, text=True, timeout=90)
                if r.returncode:
                    return self.json({"error": "Screenshot failed: " + ((r.stderr.strip().splitlines() or ["?"])[-1])}, 500)
                return self.json({"file": fname})
            if u.path in ("/api/ingest-upload", "/api/ingest-import"):
                if u.path == "/api/ingest-upload":
                    fname = safe(q.get("name", ["reference.mp4"])[0]); data = self.body()
                else:
                    url = drive_url(json.loads(self.body())["url"])
                    if not url.startswith("https://"): return self.json({"error": "https links only"}, 400)
                    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"}), timeout=180) as r:
                        if "text/html" in r.headers.get("Content-Type", ""):
                            return self.json({"error": "That link isn't a direct file. Share it as 'anyone with the link' and try again."}, 400)
                        m = re.search(r'filename="?([^";]+)', r.headers.get("Content-Disposition", ""))
                        fname = safe(m.group(1) if m else Path(urllib.parse.urlparse(url).path).name or "reference.mp4"); data = r.read()
                rid = re.sub(r"[^a-z0-9-]+", "-", Path(fname).stem.lower()).strip("-") or "reference"
                (REFS / rid).mkdir(parents=True, exist_ok=True)
                src = REFS / rid / ("source" + Path(fname).suffix.lower()); src.write_bytes(data)
                ingest_status[rid] = "processing"
                threading.Thread(target=run_ingest, args=(rid, src), daemon=True).start()
                return self.json({"name": fname})
            if u.path == "/api/lut-save":
                d = json.loads(self.body()); text = d["text"]
                size = re.search(r"^\s*LUT_3D_SIZE\s+(\d+)", text, re.M)
                rows = sum(1 for l in text.splitlines() if re.match(r"^\s*-?[\d.]+\s+-?[\d.]+\s+-?[\d.]+", l))
                if not size or rows != int(size.group(1)) ** 3:
                    return self.json({"error": "Not a valid 3D .cube file."}, 400)
                lid = re.sub(r"[^a-z0-9-]+", "-", str(d.get("name", "lut")).lower()).strip("-") or "lut"
                LUTS.mkdir(exist_ok=True)
                (LUTS / f"{lid}.cube").write_text(text)
                (LUTS / f"{lid}.json").write_text(json.dumps({"id": lid, "name": str(d.get("name", lid)), "size": int(size.group(1)),
                                                              "warnings": d.get("warnings", [])}, indent=1))
                return self.json({"id": lid})
            if u.path == "/api/render":
                n = re.sub(r"[^a-z0-9-]+", "-", str(json.loads(self.body()).get("name", "")).lower()).strip("-")
                if not (STYLES / f"{n}.json").exists(): return self.json({"error": "Save the style first, then render it."}, 404)
                if render_status.get(n, {}).get("status") != "running":
                    threading.Thread(target=run_render, args=(n,), daemon=True).start()
                    render_status[n] = {"status": "running", "message": ""}
                return self.json({"job": f"render-{n}"})
            if u.path == "/api/preset":
                d = json.loads(self.body()); PRESETS.mkdir(parents=True, exist_ok=True)
                n = re.sub(r"[^a-z0-9-]+", "-", str(d.get("name", "preset")).lower()).strip("-") or "preset"
                d["name"] = n; (PRESETS / f"{n}.json").write_text(json.dumps(d, indent=1))
                return self.json({"saved": f"styles/captions/{n}.json"})
            if u.path == "/api/process":
                name = safe(q["name"][0]); self.start(name); return self.json({"name": name})
            if u.path == "/save":
                d = json.loads(self.body()); STYLES.mkdir(exist_ok=True)
                n = re.sub(r"[^a-z0-9-]+", "-", str(d.get("name", "my-style")).lower()).strip("-") or "my-style"
                d["name"] = n; (STYLES / f"{n}.json").write_text(json.dumps(d, indent=1))
                return self.json({"saved": f"styles/{n}.json"})
        except Exception as e:
            return self.json({"error": str(e)}, 500)
        self.send_error(404)

    def log_message(self, *a): pass


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8765))
    print(f"Studio on http://localhost:{port}")
    ThreadingHTTPServer(("0.0.0.0", port), H).serve_forever()
