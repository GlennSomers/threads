#!/usr/bin/env python3
"""Turn the reel motion library (motion-library/animation-registry.json + presets.json) into studio/motion.js.

    python3 .claude/editing-studio/tools/import_motion_library.py

motion.js holds three lists the Studio and the render both load after engine.js:
  MOTION_LIB    animations for caption words and elements, as tracks the engine plays (see animState in engine.js)
  MOTION_FRAME  transitions and overlays that act on the whole frame (flash, leak, glitch, whip, iris, grain, HUD, progress bar)
  MOTION_CAPS   the presets, as caption styles
Units: registry x/y/blur/offset are px on a 1080-wide frame, stored here as cqw (px / 10.8). x/y given as
fractions (-1.5..1.5) are fractions of the thing's own size, stored as %. Run it again whenever the JSON changes.
"""
import json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REG = json.loads((ROOT / "motion-library" / "animation-registry.json").read_text())
PRE = json.loads((ROOT / "motion-library" / "presets.json").read_text())

# entries that drive the caption highlight instead of moving a word (they live in the Highlight list)
HL = {"karaoke_color": "spoken", "color_swap": "keycolor", "box_highlight": "boxactive", "weight_morph": "weight", "dim_to_bright": "dim",
      "prem_karaoke_glow_track": "glow", "prem_split_mask_dual": "wipe", "prem_weight_crossfade_premium": "weight",
      "prem_dim_chorus_active": "dimlift", "prem_box_slide_highlight": "boxactive"}
# entries drawn by code rather than keyframes (word animations)
PROC = {"typewriter": ("type", .035), "prem_typewriter_cursor_premium": ("type", .042), "scramble_decode": ("scramble", 1.2),
        "glitch_rgb_text": ("glitch", .2), "number_roll": ("count", .9), "prem_counter_spring_roll": ("count", 1.0),
        "highlighter": ("marker", .45), "underline_draw": ("underline", .4), "shake": ("shake", .16), "prem_specular_glint": ("glint", .65)}
# element motion that runs the whole time the element is on screen
LOOPS = {"ken_burns": "kenburns", "prem_ken_burns_ease": "kenburns", "prem_outer_glow_breathe": "glow", "prem_center_lockup_breathe": "breathe",
         "prem_audio_reactive_scale": "pulse"}
# whole-frame transitions and overlays: kind, seconds, extra
FRAME = {"flash_frame": ("flash", 2 / 30, {"color": "#ffffff", "o": .85}), "prem_flash_frame_grade": ("flash", 2 / 30, {"color": "#FFF5E6", "o": .85}),
         "light_leak": ("leak", .3, {}), "prem_light_leak_overlay": ("leak", .7, {"o": .55}),
         "glitch_transition": ("glitch", 8 / 30, {"i": .4}), "prem_glitch_graded": ("glitch", 8 / 30, {"i": .4}),
         "whip_pan": ("whip", .2, {"blur": 24}), "prem_whip_blur_matchcut": ("whip", .22, {"blur": 40}),
         "shape_reveal": ("iris", .4, {}), "prem_iris_optical": ("iris", .42, {}), "prem_paper_tear_wipe": ("tear", .5, {}),
         "camera_shake": ("shake", .18, {"amp": 10}), "prem_film_grain_texture": ("grain", 0, {"o": .18}),
         "camera_hud": ("hud", 0, {}), "prem_hud_camera_chrome": ("hud", 0, {"af": True}),
         "progress_bar": ("bar", 0, {}), "prem_progress_chapter": ("bar", 0, {"ticks": True})}
# not added, and why (listed in motion-library/README.md)
SKIP = {"text_behind_subject": "needs the subject cut out: use the Backdrop word effect", "prem_occlusion_text_behind": "needs the subject cut out: use the Backdrop word effect",
        "word_swap": "needs a second word to swap in", "prem_liquid_morph_word": "needs a second word to swap in",
        "speed_ramp": "changes the clip's speed, not an overlay", "prem_speed_ramp_optical": "changes the clip's speed, not an overlay",
        "split_screen": "needs two clips side by side", "prem_split_wipe_grade": "needs a before and an after clip",
        "prem_type_reflow_layout": "rearranges a whole layout, not one word", "prem_credit_roll_cinematic": "a credit crawl, not a reel caption",
        "prem_parallax_bg_drift": "needs a background texture behind the type", "prem_match_move_title": "needs motion tracking",
        "prem_reflection_floor": "a mirrored floor needs a second copy of the type; plays as Fade", "prem_dual_exposure_type": "needs blending into the footage",
        "handwriting": None, "prem_em_dash_split": None}
CATS = {"caption": "Caption", "kinetic_title": "Title", "element": "Element", "fx": "Glow and shadow", "layout": "Layout", "transition": "Transition", "overlay": "Overlay"}
SECOND = {"shadow", "echo1", "echo2", "r", "b", "glint", "radial", "glow", "reflect", "rest", "chorus", "base", "bg", "cutout", "tracker",
          "null_track", "rule", "dash", "right", "mask_fade", "vignette", "shake", "flash", "cursor_blink"}
DEF_DUR = {"caption": .4, "kinetic_title": .6, "element": .5, "fx": .6, "layout": .6, "transition": .4, "overlay": .8}


def ease_of(e):
    if isinstance(e, dict) and e.get("type") == "spring":
        return f"spring({e.get('stiffness', 280)},{e.get('damping', 22)},{e.get('mass', 1)})"
    e = str(e or "ease-out").replace(" ", "")
    return "linear" if e in ("none", "steps") else e


def r3(v):
    return round(float(v), 3)


def tracks_of(a, dur):
    """All layers merged into one set of prop tracks: {prop: [[t, v], ...]}."""
    T, layers = {}, a.get("layers") or [{"keyframes": a.get("keyframes") or [], "id": "main"}]
    prim = next((L for L in layers if L.get("id") not in SECOND and L.get("keyframes")), None)

    def put(name, t, v):
        T.setdefault(name, [])
        if not any(abs(k[0] - t) < 1e-6 for k in T[name]):
            T[name].append([r3(t), r3(v)])

    def frac(L, key):
        vals = [k["props"][key] for k in L.get("keyframes", []) if key in k.get("props", {})]
        return vals and all(abs(v) <= 1.5 for v in vals)

    for L in ([prim] if prim else []) + [L for L in layers if L is not prim]:
        lid, kfs = L.get("id"), L.get("keyframes") or []
        ld = ((L.get("params") or {}).get("durationMs") or dur * 1000) / 1000
        delay = (L.get("delayMs") or 0) / 1000
        tt = lambda t: (t * ld + delay) / dur
        if lid in ("rest", "chorus", "base", "bg", "rule", "dash", "right", "reflect", "cutout", "tracker", "null_track", "mask_fade", "vignette", "glint", "cursor"):
            continue
        for k in kfs:
            t, P = tt(k.get("t", 0)), k.get("props", {})
            for key, v in P.items():
                if lid == "shadow":
                    m = {"opacity": "sho", "y": "shy", "blur": "shb"}
                    if key in m: put(m[key], t, v / 10.8 if key != "opacity" else v)
                    continue
                if lid in ("echo1", "echo2"):
                    g = "g1" if lid == "echo1" else "g2"
                    if key == "x": put(g + "x", t, v / 10.8)
                    if key == "opacity": put(g + "o", t, v)
                    continue
                if lid in ("r", "b"):
                    if key == "x": put("rgb", t, abs(v) / 10.8)
                    continue
                if lid == "radial" and key == "blur": put("blur", t, v / 10.8); continue
                if key == "opacity": put("o", t, v)
                elif key == "scale": put("s", t, v)
                elif key == "scaleX": put("sx", t, v)
                elif key == "scaleY" and v > 0: put("sy", t, v)
                elif key in ("rotate",): put("r", t, v)
                elif key in ("rotateY", "orbitY"): put("ry", t, v)
                elif key in ("x", "y"):
                    if frac(L, key): put(key, t, v * 100)
                    else: put(key.upper(), t, v / 10.8)
                elif key == "blur": put("blur", t, v / 10.8)
                elif key == "blurX": put("blur", t, v / 10.8)
                elif key == "glow": put("glow", t, v)
                elif key == "clipRight": put("clip", t, v)
                elif key in ("maskX", "wipe", "reveal"): put("clip", t, 1 - v)
                elif key in ("radius", "iris"): put("circ", t, v)
                elif key == "path": put("sweep", t, v)
                elif key == "offset": put("rgb", t, v / 10.8)
                elif key == "tracking": put("ls", t, v / 1000)
    IDV = {"o": 1, "s": 1, "sx": 1, "sy": 1}
    for k in T:
        T[k].sort(key=lambda x: x[0])
        # as in CSS, a prop the last keyframes leave out goes back to its normal value by the end
        if T[k][-1][0] < 1 and not k.startswith(("g1", "g2", "sh")):
            T[k].append([1, IDV.get(k, 0 if k not in ("circ", "sweep") else 1)])
    return T


def anim(a):
    i, cat = a["id"], a["category"]
    lay0 = next((L for L in a.get("layers", []) if L.get("id") not in SECOND and L.get("keyframes")), (a.get("layers") or [{}])[0])
    p = {**(a.get("params") or {}), **(lay0.get("params") or {})}
    dur = (p.get("durationMs") or p.get("drawMs") or p.get("inMs") or DEF_DUR[cat] * 1000) / 1000
    o = {"id": i, "name": a["name"], "cat": CATS[cat], "tier": a.get("tier", "foundations"), "look": a.get("look", a["name"]), "dur": r3(dur),
         "ease": ease_of(lay0.get("easing") or a.get("easing"))}
    st = a.get("stagger") or {}
    if st.get("unit") == "letter" or (i == "prem_outline_offset_echo"):
        o["stagger"] = {"unit": "letter", "ms": st.get("ms") or st.get("offsetMs") or 40}
    if i in PROC:
        kind, d = PROC[i]
        o["proc"] = kind
        if kind == "type": o["cps"] = r3(d); o["dur"] = .6
        else: o["dur"] = d
        if kind == "shake": o["amp"] = r3((p.get("amplitudePx") or 6) / 10.8)
        return o
    if i in ("handwriting", "prem_ink_brush_write"):   # write-on: a left-to-right reveal
        o["T"] = {"clip": [[0, 1], [1, 0]], "o": [[0, .6], [.15, 1], [1, 1]]}; o["ease"] = "linear"; o["dur"] = r3(dur if i != "handwriting" else 1.4)
        return o
    if i == "prem_hand_ui_cursor":   # glides in to its spot, then taps
        o["T"] = {"x": [[0, -90], [.7, 0]], "y": [[0, -45], [.7, 0]], "s": [[0, 1], [.7, 1], [.85, .9], [1, 1]], "o": [[0, 0], [.2, 1], [1, 1]]}; o["dur"] = .9
        return o
    if i == "callout_arrow":
        o["T"] = {"X": [[0, -4], [1, 0]], "s": [[0, .6], [.7, 1.1], [1, 1]], "o": [[0, 0], [.3, 1], [1, 1]]}
        return o
    T = tracks_of(a, dur)
    for g in ("g1", "g2"):   # ghosts are drawn relative to the main copy
        if g + "x" in T and "X" not in T: T["X"] = [[0, 0], [1, 0]]
    S2 = next((L.get("params") or {} for L in a.get("layers", []) if L.get("id") == "shake"), None)
    if S2 is not None:   # a brief shake after the hit
        o["shake"] = {"ms": S2.get("durationMs", 140), "amp": r3(S2.get("amp", 5) / 10.8)}
    if not T:
        return None
    # written as entrances: one that ends hidden from a visible start (an exit) is flipped, and plays forwards when used as an exit
    O, Sc = T.get("o"), T.get("s")
    if O and O[0][1] > .5 and O[-1][1] < .1 and not (Sc and Sc[0][1] < .3):
        T = {k: sorted([[r3(1 - t), v] for t, v in K], key=lambda x: x[0]) for k, K in T.items()}
        o["name"] += " (exit)"; o["exit"] = True
    if i == "prem_shape_burst": o["name"] += " (plays once)"
    o["T"] = T
    return o


def caption_style(p):
    f = p.get("font") or {}
    fam = f.get("family", "Inter")
    if fam == "SF Pro Display": fam = "Inter"   # not free; the brief's own fallback
    an = (p.get("animation") or {}).get("type", "")
    c = {"font": fam, "weight": f.get("weight") or f.get("restWeight") or 700, "size": r3(p.get("fontSizePx", 120) / 10.8), "color": p.get("color", "#ffffff"),
         "group": p.get("wordsPerPage") or 4, "y": round(((p.get("placement") or {}).get("y", .62)) * 100, 1)}
    if p.get("case") == "upper": c["upper"] = True
    if p.get("case") == "lower": c["lower"] = True
    if p.get("accentColor"): c["accent"] = p["accentColor"]
    s = p.get("stroke")
    if s: c["stroke"] = r3(s["width"] / 10.8); c["strokeColor"] = s.get("color", "#000000")
    sh = p.get("shadow")
    if sh and not s: c["shadow"] = "soft"
    bg = p.get("background")
    if bg: c.update(box=True, boxColor=bg["color"], boxAlpha=bg["opacity"], radius=r3(bg.get("radius", 16) / 10.8))
    if an in HL: c["hl"] = HL[an]
    elif an: c["anim"] = "lib:" + {"prem_split_wipe_grade": "mask_wipe"}.get(an, an)
    if p.get("keywordMode") in ("color", "multicolor") and "hl" not in c: c["hl"] = "keycolor"
    if p.get("keywordMode") == "prem_karaoke_glow_track": c["hl"] = "glow"
    if f.get("activeWeight") and c.get("hl") == "weight": c["weight"] = f.get("weight", 500)
    if an == "prem_subtitle_safe_fade": c["size"] = 64 / 10.8
    return c


def main():
    lib, frame, notes = [], [], []
    for a in REG["animations"]:
        i = a["id"]
        if i in HL:
            notes.append((i, a["name"], f"caption highlight: {HL[i]}")); continue
        if i in LOOPS:
            notes.append((i, a["name"], f"element motion: {LOOPS[i]}")); continue
        if i in FRAME:
            kind, d, ex = FRAME[i]
            frame.append({"id": i, "name": a["name"], "tier": a.get("tier"), "look": a.get("look", a["name"]), "kind": kind, "dur": r3(d), "span": d == 0, **ex})
            notes.append((i, a["name"], "transition or overlay")); continue
        if SKIP.get(i):
            notes.append((i, a["name"], "not added: " + SKIP[i])); continue
        o = anim(a)
        if o:
            lib.append(o); notes.append((i, a["name"], "animation"))
        else:
            notes.append((i, a["name"], "not added: no motion in the spec"))
    caps = []
    for p in PRE["presets"]:
        if p.get("tier") != "premium": continue   # the 8 foundations presets are already caption styles in engine.js
        caps.append({"id": p["id"], "name": p["label"], "opts": caption_style(p)})
    js = ("// Made by tools/import_motion_library.py from motion-library/*.json. Don't edit by hand: change the JSON and run it again.\n"
          f"const MOTION_LIB = {json.dumps(lib, separators=(',', ':'))};\n"
          f"const MOTION_FRAME = {json.dumps(frame, separators=(',', ':'))};\n"
          f"const MOTION_CAPS = {json.dumps(caps, separators=(',', ':'))};\n"
          "if (typeof CAPS !== 'undefined') MOTION_CAPS.forEach(c => { if (!CAP_DEF[c.id]) { CAP_DEF[c.id] = c.opts; CAPS.push([c.id, c.name]); } });\n")
    (ROOT / "studio" / "motion.js").write_text(js)
    rows = "\n".join(f"| `{i}` | {n} | {w} |" for i, n, w in notes)
    (ROOT / "motion-library" / "IMPORTED.md").write_text(
        "# What the Studio did with each entry\n\nMade by `tools/import_motion_library.py`. **animation**: in the Animations panel for caption words and elements. "
        "**caption highlight**: in the caption editor's Highlight list. **element motion**: in an element's Motion list. "
        "**transition or overlay**: in the Animations panel under Transitions and overlays, placed on the timeline.\n\n"
        f"| id | name | in the Studio |\n|---|---|---|\n{rows}\n\nPresets: the 16 premium ones are caption styles; the 8 foundations ones were already there.\n")
    print(f"{len(lib)} animations, {len(frame)} transitions/overlays, {len(caps)} caption styles -> studio/motion.js ({len(js) // 1024} KB)")


if __name__ == "__main__":
    main()
