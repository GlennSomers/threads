#!/usr/bin/env python3
"""Break down the editing of a reference video and guess its caption style.

Usage: python3 ingest.py <video> [name]
Writes references/<name>/ :
  measurements.json   cuts, shot lengths, pace, loudness, silences, grade stats, first 3 seconds
  caption.json        a caption preset guessed from the pixels (NOT saved as a preset until you choose to)
  report.md           the breakdown in plain words
  sheet-N.jpg         contact sheets, a frame every 0.5 s
  first3s.jpg         the first 3 seconds, a frame every 0.2 s
  words.json          word timings, if transcription was available

What it can measure on its own: cuts and shot lengths, speech pace, loudness, silence, colour grade, caption
position, size, colour, highlight colour, words per caption and timing. What needs eyes (layouts, font family,
motion graphics, transitions, sound design): look at the contact sheets, or ask Claude to read them.
Optional: pip install pillow numpy (caption detection is skipped without them).
"""
import json, os, re, shutil, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TOOLS = Path(__file__).resolve().parent


def sh(*a, check=True):
    return subprocess.run([str(x) for x in a], capture_output=True, text=True, check=check)


def probe(v):
    j = json.loads(sh("ffprobe", "-v", "error", "-show_entries", "stream=width,height,r_frame_rate,codec_type:format=duration",
                      "-of", "json", v).stdout)
    s = next(x for x in j["streams"] if x.get("codec_type") == "video")
    n, d = s["r_frame_rate"].split("/")
    return {"width": s["width"], "height": s["height"], "fps": round(int(n) / max(1, int(d)), 2),
            "duration": round(float(j["format"]["duration"]), 2),
            "has_audio": any(x.get("codec_type") == "audio" for x in j["streams"])}


def cuts(v):
    r = sh("ffmpeg", "-i", v, "-vf", "select='gt(scene,0.25)',showinfo", "-an", "-f", "null", "-", check=False)
    return [round(float(x), 2) for x in re.findall(r"pts_time:([\d.]+)", r.stderr)]


def loudness(v):
    r = sh("ffmpeg", "-i", v, "-af", "ebur128=peak=true,silencedetect=n=-35dB:d=0.35", "-vn", "-f", "null", "-", check=False).stderr
    i = re.findall(r"I:\s+(-?[\d.]+) LUFS", r)
    sil = [(float(a), float(b)) for a, b in zip(re.findall(r"silence_start: ([\d.]+)", r), re.findall(r"silence_end: ([\d.]+)", r))]
    return (float(i[-1]) if i else None), sil


def grade_stats(v, dur):
    r = sh("ffmpeg", "-i", v, "-vf", f"fps=2,scale=180:-2,signalstats,metadata=print:file=-", "-an", "-f", "null", "-", check=False).stdout
    def avg(key):
        xs = [float(x) for x in re.findall(rf"lavfi\.signalstats\.{key}=([\d.]+)", r)]
        return round(sum(xs) / len(xs), 1) if xs else None
    y, sat, hue = avg("YAVG"), avg("SATAVG"), avg("HUEMED")
    hi, lo = avg("YHIGH"), avg("YLOW")
    contrast = round(hi - lo, 1) if hi is not None and lo is not None else None
    guess = "raw"
    if sat is not None:
        if sat < 10: guess = "bw"
        elif sat > 60 and contrast and contrast > 150: guess = "punchy"
        elif hue is not None and 10 < hue < 60 and sat > 35: guess = "warm"
        elif hue is not None and 140 < hue < 200 and y and y < 110: guess = "teal"
        elif y and y > 135: guess = "bright"
        elif contrast and contrast < 110: guess = "matte"
    return {"brightness": y, "saturation": sat, "hue_median": hue, "contrast": contrast, "grade_guess": guess}


def sheets(v, out, dur):
    for f in out.glob("sheet-*.jpg"): f.unlink()
    n = min(3, max(1, int(dur // 24) + 1))
    for k in range(n):
        sh("ffmpeg", "-y", "-loglevel", "error", "-ss", k * 24, "-t", 24, "-i", v, "-vf",
           "fps=2,scale=150:-2,tile=8x6", "-frames:v", 1, "-q:v", 4, out / f"sheet-{k + 1}.jpg", check=False)
    sh("ffmpeg", "-y", "-loglevel", "error", "-t", 3, "-i", v, "-vf", "fps=5,scale=150:-2,tile=8x2", "-frames:v", 1, "-q:v", 4,
       out / "first3s.jpg", check=False)
    return sorted(p.name for p in out.glob("sheet-*.jpg")) + (["first3s.jpg"] if (out / "first3s.jpg").exists() else [])


def words_for(v, out):
    w = out / "words.json"
    if not w.exists():
        env = ROOT / ".env"
        if not os.environ.get("GROQ_API_KEY") and not env.exists():
            return []
        r = subprocess.run([sys.executable, str(TOOLS / "transcribe.py"), str(v)], capture_output=True, text=True)
        src = Path(v).with_suffix(".words.json")
        if r.returncode or not src.exists():
            return []
        shutil.move(str(src), w)
    return json.loads(w.read_text())


def caption_guess(v, wps):
    """Find the caption band from where the white/bright text pixels keep changing."""
    try:
        import numpy as np
    except ImportError:
        return None, "Install numpy and pillow to detect the caption style: pip install pillow numpy"
    W, H, FPS = 144, 256, 8
    raw = subprocess.run(["ffmpeg", "-v", "error", "-t", "90", "-i", str(v), "-vf", f"fps={FPS},scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H}",
                          "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
    n = len(raw) // (W * H * 3)
    if n < 20: return None, "Video too short to detect captions."
    fr = np.frombuffer(raw[: n * W * H * 3], np.uint8).reshape(n, H, W, 3).astype(int)
    white = (fr.min(axis=3) > 215)
    yellow = (fr[..., 0] > 215) & (fr[..., 1] > 170) & (fr[..., 2] < 110)
    best = None
    for name, m in (("white", white), ("yellow", yellow)):
        ch = np.abs(np.diff(m.astype(np.int8), axis=0)).mean(axis=(0, 2))       # change rate per row
        pres = m.mean(axis=(0, 2))                                                # how often text-coloured
        score = ch * (pres > 0.003)
        if score.max() > 0 and (best is None or score.max() > best[1].max()): best = (name, score, m)
    if best is None or best[1].max() < 0.004:
        return None, "No caption-like text found (no burned-in captions, or text isn't white/yellow). Check the contact sheet."
    name, score, m = best
    rows = np.where(score > score.max() * 0.35)[0]
    # keep the largest contiguous run
    runs, start = [], rows[0]
    for a, b in zip(rows, rows[1:]):
        if b - a > 3: runs.append((start, a)); start = b
    runs.append((start, rows[-1]))
    r0, r1 = max(runs, key=lambda r: score[r[0]:r[1] + 1].sum())
    y_center = round((r0 + r1) / 2 / H * 100, 1)
    band_h = (r1 - r0 + 1) / H
    cols = np.where(m[:, r0:r1 + 1].mean(axis=(0, 1)) > 0.002)[0]
    # colours inside the band
    band = fr[:, r0:r1 + 1].reshape(-1, 3)
    mx, mn = band.max(axis=1), band.min(axis=1)
    sat = (mx - mn) / np.maximum(mx, 1)
    vivid = band[(sat > 0.6) & (mx > 200)]
    text_px = int(m[:, r0:r1 + 1].sum())
    accent = None
    if len(vivid) > max(30, 0.05 * text_px):
        q = (vivid // 32) * 32 + 16
        vals, cnt = np.unique(q, axis=0, return_counts=True)
        a = vals[cnt.argmax()]; accent = "#%02x%02x%02x" % tuple(int(x) for x in a)
    color = "#ffffff" if name == "white" else "#ffd400"
    # words per caption: how often the band changes vs how fast words are spoken
    bm = m[:, r0:r1 + 1].mean(axis=(2)).mean(axis=1)
    chg = np.abs(np.diff(m[:, r0:r1 + 1].mean(axis=(1, 2))))
    cps = float((chg > max(chg.max() * 0.25, 0.002)).sum()) / (n / FPS)
    group = int(max(1, min(6, round(wps / cps)))) if cps > 0.2 and wps else None
    size_cqw = round((r1 - r0 + 1) / 0.5 / W * 100, 1)   # band is about the x-height, roughly half the font size
    opts = {"y": y_center, "size": min(18, max(3, size_cqw)), "color": color, "accent": accent, "group": group}
    return {"opts": {k: v for k, v in opts.items() if v is not None},
            "measured": {"band_rows_percent": [round(r0 / H * 100, 1), round(r1 / H * 100, 1)], "text_color_detected": name,
                         "caption_changes_per_second": round(cps, 2), "words_per_second": round(wps, 2) if wps else None}}, None


def main():
    if len(sys.argv) < 2: sys.exit(__doc__)
    src = Path(sys.argv[1]).resolve()
    name = re.sub(r"[^a-z0-9-]+", "-", (sys.argv[2] if len(sys.argv) > 2 else src.stem).lower()).strip("-") or "reference"
    out = ROOT / "references" / name; out.mkdir(parents=True, exist_ok=True)
    v = src
    meta = probe(v)
    cs = cuts(v)
    edges = [0] + cs + [meta["duration"]]
    shots = [round(b - a, 2) for a, b in zip(edges, edges[1:]) if b - a > 0.05]
    lufs, sil = loudness(v) if meta["has_audio"] else (None, [])
    words = words_for(v, out) if meta["has_audio"] else []
    wps = len(words) / max(1, words[-1]["end"] - words[0]["start"]) if len(words) > 5 else None
    pauses = [round(b["start"] - a["end"], 2) for a, b in zip(words, words[1:]) if b["start"] - a["end"] > 0.25]
    sheet_files = sheets(v, out, meta["duration"])
    grade = grade_stats(v, meta["duration"])
    cap, cap_note = caption_guess(v, wps)
    first3 = [c for c in cs if c <= 3]
    m = {"source": src.name, **meta, "cuts": cs, "shots": {"count": len(shots), "average_s": round(sum(shots) / len(shots), 2) if shots else None,
         "shortest_s": min(shots) if shots else None, "longest_s": max(shots) if shots else None, "cuts_per_10s": round(len(cs) / meta["duration"] * 10, 1)},
         "first_3_seconds": {"cuts": first3, "first_cut_at_s": cs[0] if cs else None},
         "speech": {"words": len(words), "words_per_minute": round(wps * 60) if wps else None, "pauses_over_0.25s": len(pauses),
                    "longest_pause_s": max(pauses) if pauses else None, "transcribed": bool(words)},
         "audio": {"loudness_lufs": lufs, "silences_over_0.35s": len(sil)}, "grade": grade, "sheets": sheet_files,
         "caption_note": cap_note}
    (out / "measurements.json").write_text(json.dumps(m, indent=1))
    if cap:
        cap = {"name": f"{name}-captions", "base": "groups", "source": src.name, **cap}
        (out / "caption.json").write_text(json.dumps(cap, indent=1))
    elif (out / "caption.json").exists():
        (out / "caption.json").unlink()
    L = [f"# Breakdown: {src.name}", "",
         f"{meta['width']}x{meta['height']}, {meta['fps']} fps, {meta['duration']} s.", "", "## Cuts and pace",
         f"- {len(cs)} hard cuts, {m['shots']['cuts_per_10s']} per 10 s. Average shot {m['shots']['average_s']} s (shortest {m['shots']['shortest_s']}, longest {m['shots']['longest_s']}).",
         f"- First 3 seconds: " + (f"{len(first3)} cut(s) at {', '.join(map(str, first3))} s." if first3 else "no cut. It holds one shot."), "",
         "## Speech", (f"- {m['speech']['words_per_minute']} words per minute, {len(pauses)} pauses over 0.25 s (longest {m['speech']['longest_pause_s']} s)." if wps else "- Not transcribed (no Groq key or no speech)."), "",
         "## Audio", f"- Loudness {lufs} LUFS, {len(sil)} silences over 0.35 s." if lufs is not None else "- No audio.", "",
         "## Colour grade (measured)", f"- Brightness {grade['brightness']}, saturation {grade['saturation']}, contrast {grade['contrast']}, median hue {grade['hue_median']}. Closest Studio grade: **{grade['grade_guess']}**.", "",
         "## Captions (estimated from pixels)"]
    if cap:
        o = cap["opts"]
        L += [f"- Vertical position about {o['y']}% from the top, text size about {o['size']} (cqw), colour {o['color']}" + (f", highlight colour {o['accent']}" if o.get("accent") else "") + ".",
              f"- Caption changes {cap['measured']['caption_changes_per_second']} times a second" + (f", so about {o['group']} word(s) per caption." if o.get("group") else ".")]
    else:
        L += [f"- {cap_note}"]
    L += ["", "## Needs eyes (not measurable here)", "Layouts, font family, upper or lower case, caption animation, motion graphics, zooms, transitions, sound design.",
          "Look at the contact sheets, or ask Claude to read them and finish this report.", "", "## Contact sheets"] + [f"- {s}" for s in sheet_files]
    (out / "report.md").write_text("\n".join(L) + "\n")
    print(f"Saved {out}")


if __name__ == "__main__":
    main()
