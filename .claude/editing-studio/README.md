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
