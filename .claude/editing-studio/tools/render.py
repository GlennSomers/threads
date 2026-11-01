#!/usr/bin/env python3
"""Render a reel in a saved style with HyperFrames: 1080x1920, 30 fps, audio mastered to -14 LUFS.

Usage: python3 render.py <style-name>
Reads styles/<style-name>.json (saved from the Studio) and the clip it names in clips/.
Builds a HyperFrames project in projects/<style-name>/hf/ (regenerated each time, not committed),
renders it with `npx hyperframes render`, then masters the audio.
Writes projects/<style-name>/renders/<style-name>-vN.mp4 (never overwrites an older version).
Needs ffmpeg and Node 22+. HyperFrames is fetched by npx on first use.
"""
import json, math, os, random, shutil, struct, subprocess, sys, wave
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FPS, SR = 30, 44100


HF = "hyperframes@0.8.227"


def run(*a, **k):
    subprocess.run([str(x) for x in a], check=True, **k)


def synth(kind, path, dur=None):
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
        n = int(SR * (dur or 60))
        out = [sum(math.sin(2 * math.pi * f * i / SR) for f in (220, 277.2, 329.6)) / 3 for i in range(n)]
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(b"".join(struct.pack("<h", int(max(-1, min(1, s)) * 32000)) for s in out))


SFX_LEN = {"whoosh": .45, "pop": .12, "ping": .6, "click": .03}
FONTS = ("Anton&family=Bebas+Neue&family=DM+Serif+Display:ital@0;1&family=Inter:wght@400;600;800&family=Playfair+Display:ital,wght@0,700;1,700"
         "&family=Montserrat:wght@600;800&family=Space+Grotesk:wght@500;700&family=Poppins:wght@600;800&family=Caveat:wght@700"
         "&family=JetBrains+Mono:wght@500;800&family=Lora:ital,wght@1,600")


def build_project(name, style, clip, words, proj):
    """Write the HyperFrames composition: the clip, the sound effects and a seekable overlay."""
    if not (proj / "hyperframes.json").exists():
        proj.parent.mkdir(parents=True, exist_ok=True)
        run("npx", "--yes", HF, "init", proj.name, "--example", "blank", "--resolution", "portrait",
            "--non-interactive", "--skip-skills", cwd=proj.parent, stdout=subprocess.DEVNULL)
    (proj / "sfx").mkdir(exist_ok=True); (proj / "shots").mkdir(exist_ok=True)
    shutil.copy(clip, proj / "clip.mp4")
    shutil.copy(ROOT / "studio" / "engine.js", proj / "engine.js")
    for b in style["beats"]:
        if b.get("shot") and (ROOT / "shots" / b["shot"]).exists():
            shutil.copy(ROOT / "shots" / b["shot"], proj / "shots" / b["shot"])
    dur = style["dur"]
    # sound effects: the moves come from the same engine the Studio uses
    ev = json.loads(subprocess.run(["node", "-e", """
      global.window = {}; global.document = {};
      const fs = require('fs'); eval(fs.readFileSync(process.argv[1], 'utf8') + ';global.E = { S, soundEvents };');
      const st = JSON.parse(process.argv[2]);
      E.S.words = []; E.S.dur = st.dur;
      E.S.beats = st.beats.map(b => ({ t0: b.start, t1: b.end, text: b.text }));
      const fx = {}; st.beats.forEach((b, i) => fx[i] = b.effects || []);
      console.log(JSON.stringify(E.soundEvents({ fx, whole: new Set(st.whole || []) }, new Set(st.sounds || []))));
    """, str(proj / "engine.js"), json.dumps(style)], capture_output=True, text=True, check=True).stdout)
    audio, n = [], 0
    for kind in sorted({e["snd"] for e in ev}):
        synth("click" if kind == "typing" else kind, proj / "sfx" / f"{'click' if kind == 'typing' else kind}.wav")
    for e in ev:
        kind = "click" if e["snd"] == "typing" else e["snd"]
        for j in range(6 if e["snd"] == "typing" else 1):
            t = e["t"] + j * .07; n += 1
            audio.append(f'<audio id="sfx{n}" class="clip" src="sfx/{kind}.wav" data-start="{t:.2f}" data-duration="{SFX_LEN[kind]}" data-volume=".35"></audio>')
    if "music" in style.get("sounds", []):
        synth("music", proj / "sfx" / "music.wav", dur)
        audio.append(f'<audio id="music" class="clip" src="sfx/music.wav" data-start="0" data-duration="{dur}" data-volume=".04"></audio>')
    cfg = {"style": style, "words": json.loads(words.read_text())}
    html = f"""<!doctype html>
<html lang="en" data-resolution="portrait">
<head>
<meta charset="UTF-8" /><meta name="viewport" content="width=1080, height=1920" />
<script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
<link href="https://fonts.googleapis.com/css2?family={FONTS}&display=swap" rel="stylesheet">
<style>
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  html, body {{ width: 1080px; height: 1920px; overflow: hidden; background: #000; }}
  #root {{ position: relative; width: 1080px; height: 1920px; overflow: hidden; container-type: size; }}
  #v {{ position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }}
  #ov {{ position: absolute; inset: 0; overflow: hidden; }}
</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="{dur}" data-width="1080" data-height="1920" data-fps="30">
  <video id="v" class="clip" src="clip.mp4" data-start="0" data-duration="{dur}" data-has-audio="true" playsinline></video>
  <div id="ov" class="clip" data-start="0" data-duration="{dur}"></div>
  {chr(10).join("  " + a for a in audio)}
</div>
<script src="engine.js"></script>
<script>
  window.SHOT_BASE = 'shots/';
  const CFG = {json.dumps(cfg)};
  const st = CFG.style;
  S.words = CFG.words; S.dur = st.dur;
  S.beats = st.beats.map(b => ({{ t0: b.start, t1: b.end, text: b.text, shot: b.shot }}));
  const fx = {{}}; st.beats.forEach((b, i) => fx[i] = b.effects || []);
  const cfg = {{ grade: st.grade, font: st.font, caption: st.caption, hook: st.hook, fx, whole: new Set(st.whole || []) }};
  const video = document.getElementById('v'), ov = document.getElementById('ov'), root = document.getElementById('root');
  // The overlay is a pure function of time, so it is safe to seek.
  function draw(t) {{
    const f = compose(t, cfg, false);
    video.style.filter = f.filter; video.style.transform = 'scale(' + f.scale + ')';
    root.style.setProperty('--hf', f.font);
    if (ov.dataset.last !== f.html) {{ ov.innerHTML = f.html; ov.dataset.last = f.html; }}
  }}
  window.__timelines = window.__timelines || {{}};
  const proxy = {{ t: 0 }};
  const tl = gsap.timeline({{ paused: true }});
  tl.to(proxy, {{ t: {dur}, duration: {dur}, ease: 'none', modifiers: {{ t: v => {{ draw(v); return v; }} }} }}, 0);
  window.__timelines['main'] = tl;
  draw(0); tl.seek(0);
</script>
</body>
</html>
"""
    (proj / "index.html").write_text(html)


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
    proj = ROOT / "projects" / name / "hf"
    print("1/3 building the HyperFrames project")
    build_project(name, style, clip, words, proj)
    print("2/3 rendering with HyperFrames")
    raw = proj / "render.mp4"
    run("npx", "--yes", HF, "render", "-q", "standard", "-o", raw, cwd=proj)
    print("3/3 mastering audio to -14 LUFS")
    run("ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-c:v", "copy",
        "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", out)
    raw.unlink()
    print("Saved", out)


if __name__ == "__main__":
    main()
