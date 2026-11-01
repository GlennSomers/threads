#!/usr/bin/env python3
"""Render a reel in a saved style: 1080x1920, 30 fps, audio mastered to -14 LUFS.

Usage: python3 render.py <style-name>
Reads styles/<style-name>.json (saved from the Studio) and the clip it names in clips/.
Writes projects/<style-name>/renders/<style-name>-vN.mp4 (never overwrites an older version).
Needs ffmpeg, Node and Playwright (for the frame overlay).
"""
import json, math, random, shutil, struct, subprocess, sys, tempfile, wave
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FPS, SR = 30, 44100


def run(*a, **k):
    subprocess.run([str(x) for x in a], check=True, **k)


def synth(kind, path):
    """Tiny sound effects, written as mono 16-bit WAV."""
    def env(i, n, a=.01, r=.9):
        x = i / n
        return min(1, x / a) * (1 - x) ** (r * 3)
    out = []
    if kind == "whoosh":
        n = int(SR * .45); lp = 0
        for i in range(n):
            f = .05 + .6 * (i / n); lp += f * (random.uniform(-1, 1) - lp)
            out.append(lp * math.sin(math.pi * i / n) * 1.6)
    elif kind == "pop":
        n = int(SR * .12); ph = 0
        for i in range(n):
            ph += 2 * math.pi * (700 - 520 * i / n) / SR; out.append(math.sin(ph) * env(i, n))
    elif kind == "ping":
        n = int(SR * .6)
        out = [math.sin(2 * math.pi * 1320 * i / SR) * env(i, n, .005, .6) for i in range(n)]
    elif kind == "click":
        n = int(SR * .03)
        out = [(1 if (i // 25) % 2 else -1) * env(i, n, .02, 1) * .5 for i in range(n)]
    elif kind == "music":
        n = int(SR * 60)
        out = [sum(math.sin(2 * math.pi * f * i / SR) for f in (220, 277.2, 329.6)) / 3 for i in range(n)]
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(b"".join(struct.pack("<h", int(max(-1, min(1, s)) * 32000)) for s in out))


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    name = sys.argv[1]
    style = json.loads((ROOT / "styles" / f"{name}.json").read_text())
    clip = ROOT / "clips" / style["clip"]
    words = clip.with_suffix(".words.json")
    if not clip.exists() or not words.exists():
        sys.exit(f"Need {clip} and {words.name} (add the clip in the Studio first).")
    renders = ROOT / "projects" / name / "renders"; renders.mkdir(parents=True, exist_ok=True)
    v = 1
    while (renders / f"{name}-v{v}.mp4").exists():
        v += 1
    out = renders / f"{name}-v{v}.mp4"
    tmp = Path(tempfile.mkdtemp(prefix="render-"))
    try:
        fin, fout, sfx = tmp / "in", tmp / "out", tmp / "sfx"
        for d in (fin, fout, sfx): d.mkdir()
        print("1/4 extracting frames")
        run("ffmpeg", "-y", "-loglevel", "error", "-i", clip, "-vf",
            f"fps={FPS},scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920",
            "-q:v", "3", "-t", style["dur"], fin / "%05d.jpg")
        print("2/4 drawing the overlay on every frame")
        run("node", ROOT / "tools" / "render.js", ROOT / "styles" / f"{name}.json", words, fin, fout, ROOT / "shots", FPS)
        events = json.loads((fout / "events.json").read_text())
        print("3/4 mixing sound")
        inputs, filt, labels = ["-i", clip], ["[1:a]volume=1[v]"], ["[v]"]
        k = 2
        for kind in sorted({e["snd"] for e in events}):
            synth("click" if kind == "typing" else kind, sfx / f"{kind}.wav")
        for e in events:
            hits = [e["t"] + j * .07 for j in range(6)] if e["snd"] == "typing" else [e["t"]]
            for t in hits:
                f = sfx / ("click" if e["snd"] == "typing" else e["snd"])
                inputs += ["-i", str(f) + ".wav"]
                filt.append(f"[{k}:a]volume=.35,adelay={int(t * 1000)}|{int(t * 1000)}[s{k}]"); labels.append(f"[s{k}]"); k += 1
        if "music" in style.get("sounds", []):
            synth("music", sfx / "music.wav"); inputs += ["-i", str(sfx / "music.wav")]
            filt.append(f"[{k}:a]volume=.04[s{k}]"); labels.append(f"[s{k}]"); k += 1
        filt.append("".join(labels) + f"amix=inputs={len(labels)}:normalize=0:duration=first,loudnorm=I=-14:TP=-1.5:LRA=11[a]")
        print("4/4 encoding")
        run("ffmpeg", "-y", "-loglevel", "error", "-framerate", FPS, "-i", fout / "%05d.jpg", *inputs,
            "-filter_complex", ";".join(filt), "-map", "0:v", "-map", "[a]", "-c:v", "libx264", "-pix_fmt", "yuv420p",
            "-preset", "medium", "-crf", "18", "-r", FPS, "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-shortest", out)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    print("Saved", out)


if __name__ == "__main__":
    main()
