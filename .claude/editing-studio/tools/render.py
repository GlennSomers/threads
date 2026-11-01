#!/usr/bin/env python3
"""Render a reel in a saved style with HyperFrames: 1080x1920, 30 fps, audio mastered to -14 LUFS.

Usage: python3 render.py <style-name | path/to/style.json>
Reads styles/<style-name>.json (a saved style) or any style JSON file (the Studio's current picks), and the clip it names in clips/.
Builds a HyperFrames project in projects/<style-name>/hf/ (regenerated each time, not committed),
renders it with `npx hyperframes render`, then masters the audio.
Writes projects/<style-name>/renders/<style-name>-vN.mp4 (never overwrites an older version).
Needs ffmpeg and Node 22+. HyperFrames is fetched by npx on first use.
"""
import json, math, os, random, re, shutil, struct, subprocess, sys, wave
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


def keep_segments(style):
    """Applied cuts -> the parts of the source we keep, as (start, end) in source seconds."""
    dur = float(style["dur"]); cuts = sorted((max(0.0, float(a)), min(dur, float(b))) for a, b in style.get("cuts") or [] if float(b) > float(a))
    keep, t = [], 0.0
    for a, b in cuts:
        if a > t + 0.01: keep.append((t, a))
        t = max(t, b)
    if dur > t + 0.01: keep.append((t, dur))
    return keep or [(0.0, dur)]


def src_to_out(t, keep):
    """Source time -> output time, or None if that moment was cut."""
    o = 0.0
    for a, b in keep:
        if a <= t <= b: return o + (t - a)
        o += b - a
    return None


VOICE = {"light": dict(hp=70, nr=6, deess=0.1, ratio=2, makeup=1, presence=1.5, warmth=0),
         "clean": dict(hp=80, nr=12, deess=0.3, ratio=3, makeup=2, presence=3, warmth=0),
         "podcast": dict(hp=90, nr=18, deess=0.5, ratio=4, makeup=3, presence=4, warmth=2)}


def voice_filter(v):
    """Same numbers as voiceParams() in studio/engine.js, as an ffmpeg audio chain. None when off."""
    v = v or {}; P = VOICE.get(v.get("preset"))
    if not P: return None
    k = max(0.0, min(1.0, float(v.get("amount", 100) if v.get("amount") is not None else 100) / 100))
    if k <= 0: return None
    hp = round(30 + (P["hp"] - 30) * k); nr = float(v["nr"]) if v.get("nr") is not None else P["nr"] * k
    deess, ratio, makeup = P["deess"] * k, 1 + (P["ratio"] - 1) * k, P["makeup"] * k
    presence, warmth = P["presence"] * k, P["warmth"] * k
    f = [f"highpass=f={hp}"]
    if nr >= 1: f.append(f"afftdn=nr={min(97, nr):.1f}:nf=-40")
    if warmth > 0.05: f.append(f"lowshelf=f=160:g={warmth:.2f}")
    if presence > 0.05: f.append(f"equalizer=f=3500:t=q:w=1:g={presence:.2f}")
    if deess > 0.01: f.append(f"deesser=i={deess:.2f}")
    if ratio > 1.01: f.append(f"acompressor=threshold=-20dB:ratio={ratio:.2f}:attack=10:release=150:makeup={max(1, 10 ** (makeup / 20)):.3f}")
    return ",".join(f)


def build_project(name, style, clip, words, proj):
    """Write the HyperFrames composition: the clip, the sound effects and a seekable overlay."""
    if not (proj / "hyperframes.json").exists():
        proj.parent.mkdir(parents=True, exist_ok=True)
        run("npx", "--yes", HF, "init", proj.name, "--example", "blank", "--resolution", "portrait",
            "--non-interactive", "--skip-skills", cwd=proj.parent, stdout=subprocess.DEVNULL)
    (proj / "sfx").mkdir(exist_ok=True); (proj / "shots").mkdir(exist_ok=True)
    keep = keep_segments(style); out_dur = round(sum(b - a for a, b in keep), 3)
    if len(keep) > 1 or keep[0][0] > 0.01 or keep[0][1] < float(style["dur"]) - 0.01:
        # join the kept parts, at the output size, with 10 ms audio fades at each join so there are no clicks
        fit = "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1"
        parts, labels = [], ""
        for i, (a, b) in enumerate(keep):
            d = b - a
            parts.append(f"[0:v]trim=start={a:.3f}:end={b:.3f},setpts=PTS-STARTPTS,{fit}[v{i}]")
            parts.append(f"[0:a]atrim=start={a:.3f}:end={b:.3f},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.01,afade=t=out:st={max(0, d - 0.01):.3f}:d=0.01[a{i}]")
            labels += f"[v{i}][a{i}]"
        parts.append(f"{labels}concat=n={len(keep)}:v=1:a=1[v][a]")
        run("ffmpeg", "-y", "-loglevel", "error", "-i", clip, "-filter_complex", ";".join(parts), "-map", "[v]", "-map", "[a]",
            "-c:v", "libx264", "-crf", "12", "-preset", "fast", "-pix_fmt", "yuv420p", "-r", "30", "-c:a", "aac", "-b:a", "192k", proj / "cut.mp4")
        clip = proj / "cut.mp4"
    lut = ROOT / "luts" / f"{style['lut']}.cube" if style.get("lut") else None
    if lut and lut.exists():
        # The LUT grades the footage only. Captions and effects are drawn on top afterwards, so they are never graded.
        shutil.copy(lut, proj / "grade.cube")
        k = max(0.0, min(1.0, float(style.get("lutAmount", 100) if style.get("lutAmount") is not None else 100) / 100))
        # work at the output size (cover-crop, same as the composition), and tag the result as Rec.709 so nothing downstream guesses
        fit = "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920"
        to709 = "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p"
        graded = f"lut3d=file=grade.cube:interp=tetrahedral,{to709}"
        fc = f"[0:v]{fit},{graded}[v]" if k >= 1 else f"[0:v]{fit},format=yuv420p,split[a][b];[b]{graded}[g];[a][g]blend=all_mode=normal:all_opacity={k:.3f}[v]"
        run("ffmpeg", "-y", "-loglevel", "error", "-i", clip, "-filter_complex", fc, "-map", "[v]", "-map", "0:a?",
            "-c:v", "libx264", "-crf", "12", "-preset", "fast", "-pix_fmt", "yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709",
            "-color_trc", "bt709", "-color_range", "tv", "-c:a", "copy", proj / "clip.mp4", cwd=proj)
    else:
        shutil.copy(clip, proj / "clip.mp4")
    vf = voice_filter(style.get("voice"))
    if vf:   # clean up the voice on the clip itself, so sound effects and music are not processed
        run("ffmpeg", "-y", "-loglevel", "error", "-i", proj / "clip.mp4", "-map", "0:v", "-map", "0:a?", "-c:v", "copy", "-af", vf,
            "-c:a", "aac", "-b:a", "192k", proj / "clip-voice.mp4")
        (proj / "clip-voice.mp4").replace(proj / "clip.mp4")
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
    ev = [dict(e, t=src_to_out(e["t"], keep)) for e in ev]
    ev = [e for e in ev if e["t"] is not None]
    audio, n = [], 0
    for kind in sorted({e["snd"] for e in ev}):
        synth("click" if kind == "typing" else kind, proj / "sfx" / f"{'click' if kind == 'typing' else kind}.wav")
    for e in ev:
        kind = "click" if e["snd"] == "typing" else e["snd"]
        for j in range(6 if e["snd"] == "typing" else 1):
            t = e["t"] + j * .07; n += 1
            audio.append(f'<audio id="sfx{n}" class="clip" src="sfx/{kind}.wav" data-start="{t:.2f}" data-duration="{SFX_LEN[kind]}" data-volume=".35"></audio>')
    if "music" in style.get("sounds", []):
        synth("music", proj / "sfx" / "music.wav", out_dur)
        audio.append(f'<audio id="music" class="clip" src="sfx/music.wav" data-start="0" data-duration="{out_dur}" data-volume=".04"></audio>')
    cfg = {"style": style, "words": json.loads(words.read_text()), "keep": keep}
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
<div id="root" data-composition-id="main" data-start="0" data-duration="{out_dur}" data-width="1080" data-height="1920" data-fps="30">
  <video id="v" class="clip" src="clip.mp4" data-start="0" data-duration="{out_dur}" data-has-audio="true" playsinline></video>
  <div id="ov" class="clip" data-start="0" data-duration="{out_dur}"></div>
  {chr(10).join("  " + a for a in audio)}
</div>
<script src="engine.js"></script>
<script>
  window.SHOT_BASE = 'shots/';
  const CFG = {json.dumps(cfg)};
  const st = CFG.style;
  S.words = CFG.words; S.dur = st.dur; S.cuts = (st.cuts || []).map(c => ({{ a: c[0], b: c[1] }})); refreshLive();
  // output time -> source time: the overlay is drawn in source time, the video has the cuts joined up
  const KEEP = CFG.keep; let acc = 0; const SEG = KEEP.map(([a, b]) => {{ const s0 = {{ a, b, o: acc }}; acc += b - a; return s0; }});
  const srcT = t => {{ for (const s0 of SEG) if (t < s0.o + (s0.b - s0.a) || s0 === SEG[SEG.length - 1]) return s0.a + Math.max(0, t - s0.o); return t; }};
  S.beats = st.beats.map(b => ({{ t0: b.start, t1: b.end, text: b.text, shot: b.shot }}));
  const fx = {{}}; st.beats.forEach((b, i) => fx[i] = b.effects || []);
  const cfg = {{ grade: st.grade, font: st.font, caption: st.caption, capOpts: st.capOpts || {{}}, hook: st.hook, fx, whole: new Set(st.whole || []) }};
  const video = document.getElementById('v'), ov = document.getElementById('ov'), root = document.getElementById('root');
  // The overlay is a pure function of time, so it is safe to seek.
  function draw(t) {{
    const f = compose(srcT(t), cfg, false);
    video.style.filter = f.filter; video.style.transform = 'scale(' + f.scale + ')';
    root.style.setProperty('--hf', f.font);
    if (ov.dataset.last !== f.html) {{ ov.innerHTML = f.html; ov.dataset.last = f.html; }}
  }}
  window.__timelines = window.__timelines || {{}};
  const proxy = {{ t: 0 }};
  const tl = gsap.timeline({{ paused: true }});
  tl.to(proxy, {{ t: {out_dur}, duration: {out_dur}, ease: 'none', modifiers: {{ t: v => {{ draw(v); return v; }} }} }}, 0);
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
    arg = sys.argv[1]
    src = Path(arg) if arg.endswith(".json") else ROOT / "styles" / f"{arg}.json"
    style = json.loads(src.read_text())
    name = re.sub(r"[^a-z0-9-]+", "-", str(style.get("name") or Path(style["clip"]).stem).lower()).strip("-") or "render"
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
    # two passes: measure, then apply a linear gain. One pass undershoots or overshoots on short clips.
    LN = "loudnorm=I=-14:TP=-1.5:LRA=11"
    probe = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(raw), "-af", LN + ":print_format=json", "-vn", "-f", "null", "-"], capture_output=True, text=True).stderr
    try:
        m = json.loads(probe[probe.rindex("{"):probe.rindex("}") + 1])
        af = (f"{LN}:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:"
              f"measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
    except (ValueError, KeyError):
        af = LN
    run("ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-c:v", "copy", "-af", af, "-c:a", "aac", "-b:a", "192k", "-ar", "48000", out)
    raw.unlink()
    print("Saved", out)


if __name__ == "__main__":
    main()
