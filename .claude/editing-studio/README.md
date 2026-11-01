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

## Render
After saving a style in the Studio: `python3 tools/render.py <style-name>`
Makes `projects/<style-name>/renders/<style-name>-vN.mp4` (1080x1920, 30 fps, audio mastered to -14 LUFS, sound effects on the
moves they belong to). Never overwrites an older version. Roughly 5 seconds of render time per second of video.
It uses the same drawing code as the Studio preview (`studio/engine.js`), so what you pick is what you get.
Captions and cards stay out of Instagram's top 220 px and bottom 420 px. Faces are not detected: check stills for overlaps.
