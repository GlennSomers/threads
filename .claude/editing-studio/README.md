# editing-studio

Local AI video editing workspace, from Artem Novitckii's guide (novitckii.com/resources/editing-studio/).
Lives in the repo so it survives cloud sessions.

| Folder | What it holds |
|---|---|
| `clips/` | Raw videos. Not committed (too large). |
| `references/` | Reels from creators to learn from, plus a notes.txt each. Videos not committed. |
| `styles/` | Saved editing styles (JSON from the Studio). |
| `projects/` | One folder per video. Renders not committed. |
| `tools/` | Scripts. `transcribe.py` gives every word a start and end time. |

## Transcription
Add this line to `.claude/editing-studio/.env` yourself (never paste the key in chat):

    GROQ_API_KEY=your_key

Then: `python3 tools/transcribe.py clips/<file>.mp4` saves `<file>.words.json`.
Without a key it falls back to local Whisper (`pip install faster-whisper`), which is slower.

## Needs
ffmpeg, Python 3, Node.js (all present in the cloud container).

## Studio
`python3 studio/server.py` then open http://localhost:8765. With no clip it shows an upload screen:
drop a video (saved to `clips/`, small preview and transcript made automatically) or paste a Google Drive
share link ("anyone with the link"). Picks save to `styles/<name>.json`.
Press **D** for the hands-free demo (a fake cursor clicks through the flow), **R** to reset.
On a beat with "Web page slides in", paste the page address and hit Capture. That saves a real screenshot to `shots/`
(needs Playwright: `npm i -g playwright && npx playwright install chromium`). Without one the card shows a stand-in page.

## Ingest a style from a video
In the Studio, press **Ingest style** and add a reference reel (upload, or a Drive link). Or run `python3 tools/ingest.py <video> [name]`.
It writes `references/<name>/` with `report.md`, `measurements.json`, `caption.json` and contact sheets (`sheet-N.jpg`, `first3s.jpg`).
- **Measured automatically:** cuts and shot lengths, cuts in the first 3 seconds, speech pace and pauses (needs the Groq key), loudness, silences, colour grade (closest Studio grade), and the caption's position, size, colour, highlight colour and words per caption.
- **Needs eyes:** layouts, font family, upper or lower case, caption animation, motion graphics, zooms, transitions, sound design. Ask Claude to read the contact sheets and finish `report.md`.
- The caption guess is **not saved as a preset** unless you press Save. "Use this caption look" applies it to your session only. Caption detection needs `pip install pillow numpy`; it only finds white or yellow burned-in text, so treat it as a starting point.
- Reference videos are not committed (only the report, measurements and sheets).

## Editing captions
On the Captions step, pick a style, then edit it live: font, weight, size, position (kept inside the safe area), alignment, words at a time,
highlight mode, animation, timing shift, hold time, outline, case, colours and background box.
Presets are saved to `styles/captions/` only when you press "Save current as preset". Your edits are saved with the style and used by the render.

## Transcript and timeline
- **Transcript** (top of the Captions step): click a word to hear it, type to fix it, set its start and end, delete it, or find and replace (for names and products). Captions update live. "Save transcript" writes `clips/<clip>.words.json`, which the render uses.
- **Timeline** (under the Studio): one track per kind of edit: titles and effects, whole-clip effects, captions (grouped as they show), video split at the beats with the grade and LUT, the voice waveform, sound effects and music. Click or drag to scrub, click a block to jump to it, zoom with the slider. It shows edits; dragging blocks to change them is not built yet.

## Minimal style (from "How to Edit VIRAL Talking Head Videos Using ONLY Claude!")
Breakdown, transcript and frames: `.claude/reel-to-skill-runs/g9xoKm5DEeU/`. Skill: `.claude/skills/minimal-animation-edit/`.
- **Cinematic captions** (Captions step, first card): each line of 5 words or fewer, the key word big in the middle (bold Inter or Playfair Italic, alternating, serif in the accent blue), the other words small above and below as they are spoken.
- **Scenes per beat** (Beats step, "Scene for this beat"): Stay on A-roll, Quote scene (white or blue rough paper, quotation marks), Line + text (blue line drawing with the camera following), Graph (dark grid, glowing line, blue ball; steps / flat / rise / decline, picked from the words), B-roll / photo + text and Painting + text (paper texture, dark and blurred edges, slide-in for paintings), Centre and Side illustration (image turned into a rough blue texture on white paper). Scenes replace the captions during their beat with their own cinematic text.
- **Three recommendations per beat (A, B, C)** from the source's planning rules (open on the speaker; announcing = stay on the face; numbers = graph; a person = character; a story = painting; a feeling = B-roll; the big point = line; end on a quote), a **plan box** per beat and **Copy plan** to paste into Claude.
- Images for scenes: upload, or search Wikimedia Commons from the browser (old paintings are usually public domain; check each image's licence). Stored with the screenshots in `shots/`.
- **Sound**: whoosh into scenes, a click for each text line in a scene, a highlighter sound on graphs (pick Whoosh, Click and Highlighter on the Sound step; picking a scene turns them on if no sounds are picked yet).
- **Cut padding** defaults to 30 ms (adjustable) as in the source workflow.

## Cutting
The timeline sits under the video; every option is on the right.
- **Find dead air and retakes**: suggests cuts for gaps between words longer than the slider (default 0.4 s, keeping 0.08 s of air either side; the waveform has to be quiet there too) and for repeated lines (the same three words said again, keeping the later take). **Nothing is cut until you pick it**: click a dashed suggestion to cut it, or "Cut all suggestions".
- **Range tool**: drag across the timeline, then "Cut selection". **Cut word from video** in the transcript cuts one word.
- Click a solid cut to restore it. Cuts are saved per clip (`clips/<clip>.cuts.json`), the preview skips them (switch to Raw to hear everything), struck-out words drop out of the captions, and the render joins the kept parts with 10 ms audio fades and moves captions, effects and sounds to match.

## Voice processing
On the Sound step: **Off, Light, Clean, Podcast**, an **Amount** slider and a **Noise reduction** slider.
The chain is rumble cut (high-pass), noise reduction, warmth (Podcast), presence lift at 3.5 kHz, de-esser and compression. The numbers live in `voiceParams()` (`studio/engine.js`) and `voice_filter()` (`tools/render.py`) and match.
- The preview plays everything except noise reduction live (Web Audio on the video; turn sound on and flip Raw/Edited to compare). Noise reduction (ffmpeg `afftdn`) is only heard in the render.
- The render processes the voice on the clip before sound effects and music are mixed in, then masters to -14 LUFS.
- On a test iPhone clip, Clean raised the gap between speech and background noise from 18 dB to 29 dB (25 dB at 60%).

## LUTs (Rec.709 .cube)
On the Colours step, "Add a LUT (.cube)" takes a 3D `.cube` file. It is checked (size, row count, input range) and previewed on your clip first.
It is **only saved as a preset when you press Save**, into `luts/`. Pick a saved LUT from the grid to use it.
- The LUT grades the **footage only**. Captions, titles and effects are drawn on top and are never graded. Preview: a WebGL shader on the video layer. Render: ffmpeg `lut3d` (tetrahedral) bakes it into the clip before HyperFrames adds the overlay.
- It is meant for Rec.709 to Rec.709 looks. A name containing log, S-Log, V-Log, C-Log, ARRI, ACES, HLG, PQ or Rec.2020 gets a warning, since those expect different footage.
- 1D LUTs are not supported. The preview thumbnails use 8-bit precision, so the render is a touch more exact than the preview.
- **LUT amount** slider (0 to 100%, double-click to reset) mixes the graded footage with the original, like Premiere's Lumetri "Intensity". Saved with the style and used in the render.
- `luts/` is git-ignored: LUTs are often paid products and this repo may be public. They persist in the hosted app's Blob store, or keep your own copies.
- Big LUTs work: a 65-point `.cube` (7 MB) parses in under a second. If a GPU's texture limit is too small for the preview, the preview shrinks it to 33 points; the render always uses the full LUT.
- It stacks with the built-in grades if you pick both. Leave the grade on Raw to use the LUT alone.

## Render (HyperFrames)
After saving a style in the Studio: `python3 tools/render.py <style-name>`
It builds a HyperFrames project in `projects/<style-name>/hf/` (regenerated each time, not committed), renders it with
`npx hyperframes render`, then masters the audio to -14 LUFS. Output: `projects/<style-name>/renders/<style-name>-vN.mp4`
(1080x1920, 30 fps, never overwrites an older version). Needs Node 22+ and ffmpeg; HyperFrames is fetched by npx on first use.
The overlay uses the same drawing code as the Studio preview (`studio/engine.js`), driven by a seekable GSAP timeline, so what you pick is what you get.
Sound effects sit on the moves they belong to. Captions and cards stay out of Instagram's top 220 px and bottom 420 px.
Faces are not detected: check stills for overlaps.
