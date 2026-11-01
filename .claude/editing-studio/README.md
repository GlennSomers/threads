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

## LUTs (Rec.709 .cube)
On the Colours step, "Add a LUT (.cube)" takes a 3D `.cube` file. It is checked (size, row count, input range) and previewed on your clip first.
It is **only saved as a preset when you press Save**, into `luts/`. Pick a saved LUT from the grid to use it.
- The LUT grades the **footage only**. Captions, titles and effects are drawn on top and are never graded. Preview: a WebGL shader on the video layer. Render: ffmpeg `lut3d` (tetrahedral) bakes it into the clip before HyperFrames adds the overlay.
- It is meant for Rec.709 to Rec.709 looks. A name containing log, S-Log, V-Log, C-Log, ARRI, ACES, HLG, PQ or Rec.2020 gets a warning, since those expect different footage.
- 1D LUTs are not supported. The preview thumbnails use 8-bit precision, so the render is a touch more exact than the preview.
- It stacks with the built-in grades if you pick both. Leave the grade on Raw to use the LUT alone.

## Render (HyperFrames)
After saving a style in the Studio: `python3 tools/render.py <style-name>`
It builds a HyperFrames project in `projects/<style-name>/hf/` (regenerated each time, not committed), renders it with
`npx hyperframes render`, then masters the audio to -14 LUFS. Output: `projects/<style-name>/renders/<style-name>-vN.mp4`
(1080x1920, 30 fps, never overwrites an older version). Needs Node 22+ and ffmpeg; HyperFrames is fetched by npx on first use.
The overlay uses the same drawing code as the Studio preview (`studio/engine.js`), driven by a seekable GSAP timeline, so what you pick is what you get.
Sound effects sit on the moves they belong to. Captions and cards stay out of Instagram's top 220 px and bottom 420 px.
Faces are not detected: check stills for overlaps.
