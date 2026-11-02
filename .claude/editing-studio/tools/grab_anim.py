#!/usr/bin/env python3
"""Grab one animation from a reference video and save it as a Studio animation preset.

Usage: python3 grab_anim.py <video> <start> <end> <x,y,w,h> <out.json> [--name N] [--kind auto|in|out] [--sheet out.jpg]
  start, end   seconds around the move (a little before it starts and after it settles)
  x,y,w,h      box around the thing that moves, as fractions of the frame (0..1); keep the background in it
  --kind       in = it appears (the default guess), out = it leaves (saved reversed, as an entrance)

How: frames inside the box at 30 fps. The frame where the thing is absent is the background; every other frame is
compared with it, which gives the thing's outline on each frame. From that: position and size against its final
state, and opacity from how strongly it differs. The motion is written as keys [p, x%, y%, scale, opacity, rotate].
The easing is named by the reanimate skill's easing.ts (bun) when it is there.
Works best on one thing moving over a still background (a word popping in, a sticker sliding, a card dropping).
"""
import argparse, json, os, re, shutil, subprocess, sys
from pathlib import Path
import numpy as np

FPS = 30
REANIMATE = Path(os.environ.get("REANIMATE_EASING") or Path(__file__).resolve().parents[2] / "skills" / "reanimate" / "scripts" / "easing.ts")


def frames(video, start, end, box, width=240):
    probe = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", str(video)],
                           capture_output=True, text=True, check=True).stdout.strip().split(",")
    W, H = int(probe[0]), int(probe[1])
    x, y, w, h = box
    cx, cy, cw, ch = int(x * W), int(y * H), max(8, int(w * W)), max(8, int(h * H))
    ow = width; oh = max(8, int(round(ch * ow / cw / 2)) * 2)
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{start:.3f}", "-i", str(video), "-t", f"{end - start:.3f}",
                          "-vf", f"crop={cw}:{ch}:{cx}:{cy},scale={ow}:{oh},fps={FPS}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                         capture_output=True, check=True).stdout
    n = len(raw) // (ow * oh * 3)
    return np.frombuffer(raw[:n * ow * oh * 3], np.uint8).reshape(n, oh, ow, 3).astype(np.float32), (ow, oh)


def detail(f):   # edge energy: the frame with the thing on it has more edges than the empty one
    g = f.mean(2)
    return float(np.abs(np.diff(g, axis=0)).mean() + np.abs(np.diff(g, axis=1)).mean())


def measure(F, bg, thr=28):
    out = []
    for f in F:
        d = np.abs(f - bg).max(2)
        m = d > thr
        # drop specks: keep rows/cols that have a few pixels set
        if m.sum() < 12:
            out.append(None); continue
        ys, xs = np.nonzero(m)
        x0, x1 = np.percentile(xs, [2, 98]); y0, y1 = np.percentile(ys, [2, 98])
        out.append(dict(cx=(x0 + x1) / 2, cy=(y0 + y1) / 2, w=max(1.0, x1 - x0), h=max(1.0, y1 - y0), strength=float(d[m].mean()), area=int(m.sum())))
    return out


def easing_name(series):
    if not shutil.which("bun") or not REANIMATE.exists() or len(series) < 4:
        return None
    r = subprocess.run(["bun", str(REANIMATE), "--series", json.dumps(series)], capture_output=True, text=True)
    try:
        j = json.loads(r.stdout)
        return {"verdict": j.get("verdict"), "overshootPct": j.get("overshootPct"), "best": (j.get("bestFits") or [{}])[0].get("name")}
    except ValueError:
        return None


def grab(video, start, end, box, kind="auto"):
    F, size = frames(video, start, end, box)
    if len(F) < 4:
        sys.exit("Too few frames: widen the time range.")
    first, last = F[0], F[-1]
    if kind == "auto":
        kind = "in" if detail(last) >= detail(first) else "out"
    if kind == "out":
        F = F[::-1]          # an exit, played backwards, is an entrance
    bg, full = F[0], F[-1]
    M = measure(F, bg)
    fin = M[-1]
    if not fin:
        sys.exit("Nothing moves in that box: draw it around the thing that animates, with some background around it.")
    keys = []
    for m in M:
        if m is None:
            keys.append([0.0, 0.0, 0.0, 0.0, 0.0]); continue
        s = float(np.sqrt((m["w"] * m["h"]) / (fin["w"] * fin["h"])))
        x = (m["cx"] - fin["cx"]) / fin["w"] * 100
        y = (m["cy"] - fin["cy"]) / fin["h"] * 100
        o = min(1.0, m["strength"] / max(1e-3, fin["strength"]))
        keys.append([x, y, s, o, 0.0])
    keys = np.array(keys)
    # absent frames: hold the first visible position, invisible
    vis = np.nonzero(keys[:, 3] > 0.05)[0]
    if not len(vis):
        sys.exit("Could not see the thing in that box.")
    for i in range(vis[0]):
        keys[i, :3] = keys[vis[0], :3]; keys[i, 2] = keys[vis[0], 2]
    # smooth a little (median of 3)
    sm = keys.copy()
    for i in range(1, len(keys) - 1):
        sm[i] = np.median(keys[i - 1:i + 2], axis=0)
    keys = sm
    rest = np.array([0, 0, 1, 1, 0.0])
    # trim: start one frame before it shows up, end when everything is within 1.5% of rest
    a = max(0, vis[0] - 1)
    tol = np.array([1.5, 1.5, .015, .03, 1])
    moving = [i for i in range(len(keys)) if np.any(np.abs(keys[i] - rest) > tol)]
    b = (moving[-1] + 1) if moving else len(keys) - 1
    b = min(len(keys) - 1, max(b, a + 3))
    keys = keys[a:b + 1]; keys[-1] = rest
    n = len(keys) - 1; dur = n / FPS
    out_keys = [[round(i / n, 3)] + [round(float(v), 3) for v in k] for i, k in enumerate(keys)]
    # which property carries the move, and its easing (reanimate)
    span = np.abs(keys - rest).max(0)
    names = ["x", "y", "scale", "opacity"]
    main = int(np.argmax([span[0] / 100, span[1] / 100, span[2], span[3] * .5]))
    series = [[round(i * 1000 / FPS), round(float(k[main]) * (1 if main > 1 else 1), 3)] for i, k in enumerate(keys)]
    return {"dur": round(dur, 3), "keys": out_keys, "kind": kind, "main": names[main], "easing": easing_name(series),
            "moves": {nm: round(float(span[i]), 3) for i, nm in enumerate(names)}, "frames": len(F), "box_px": size}


def sheet(video, start, end, box, out):
    """A strip of 8 frames from the box, to see what was grabbed."""
    F, (w, h) = frames(video, start, end, box, width=160)
    idx = np.linspace(0, len(F) - 1, min(8, len(F))).astype(int)
    strip = np.concatenate([F[i] for i in idx], axis=1).astype(np.uint8)
    from PIL import Image
    Image.fromarray(strip).save(out, quality=82)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("video"); ap.add_argument("start", type=float); ap.add_argument("end", type=float); ap.add_argument("box"); ap.add_argument("out")
    ap.add_argument("--name", default=""); ap.add_argument("--kind", default="auto", choices=["auto", "in", "out"]); ap.add_argument("--sheet")
    ap.add_argument("--source", default="")
    a = ap.parse_args()
    box = [float(v) for v in a.box.split(",")]
    if a.end <= a.start or len(box) != 4:
        sys.exit("Need start < end and a box x,y,w,h")
    r = grab(a.video, a.start, a.end, box, a.kind)
    pid = re.sub(r"[^a-z0-9-]+", "-", (a.name or Path(a.out).stem).lower()).strip("-") or "grabbed"
    preset = {"id": pid, "name": a.name or pid, "dur": r["dur"], "ease": (r["easing"] or {}).get("verdict") or "", "keys": r["keys"],
              "from": {"source": a.source or Path(a.video).name, "start": a.start, "end": a.end, "box": box, "recorded_as": r["kind"]},
              "measured": {"main": r["main"], "moves": r["moves"], "easing": r["easing"], "frames": r["frames"]}}
    Path(a.out).write_text(json.dumps(preset, indent=1))
    if a.sheet:
        sheet(a.video, a.start, a.end, box, a.sheet)
    print(json.dumps({k: preset[k] for k in ("id", "dur", "ease")} | {"main": r["main"], "moves": r["moves"]}))


if __name__ == "__main__":
    main()
