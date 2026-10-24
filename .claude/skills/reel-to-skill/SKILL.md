---
name: reel-to-skill
description: Turn an Instagram reel into a new Claude Code skill or agent. Use when the user pastes an instagram.com/reel/ or instagram.com/p/ link and asks to turn it into a skill, agent, or lesson. Also triggers on "reel this", "skill this reel", "learn this reel", or a bare reel link with no other request.
---

# Reel to Skill

Fetch a reel's caption and video, transcribe the audio locally, then hand everything to Anthropic's `skill-creator` skill to build a new skill or agent from what the reel teaches.

No login, no API keys, no paid tools. yt-dlp and Whisper run through `uvx`, which downloads and caches them on first use.

Based on "The Reel to Skill Engine" by Jens (Jens AI Community).

## Prerequisites

- `uv` / `uvx` on PATH (`uv --version`). If missing: `curl -LsSf https://astral.sh/uv/install.sh | sh`
- `ffmpeg` on PATH (Whisper needs it to read the video's audio)
- The `skill-creator` skill. If it isn't available, tell the user to run `/plugin marketplace add anthropics/skills` then `/plugin install example-skills@anthropic-agent-skills`, and stop.
- About 2 GB free disk for the Whisper model on first run

Check `uv` and `ffmpeg` before step 1. If either is missing, say which one and stop.

## YouTube and other sites

yt-dlp also handles YouTube links (and most other video sites), so the same workflow applies. Use the video ID as the working folder name. For long videos, skip the download and Whisper: YouTube usually has captions, which are much faster than transcribing on a machine without a GPU. Check `automatic_captions` or `subtitles` in the step 1 JSON, then:

```bash
uvx yt-dlp --skip-download --write-auto-subs --sub-langs en --sub-format vtt \
  -o "$WORKDIR/video.%(ext)s" "<URL>"
```

Strip the timestamps and the repeated rolling lines from the `.vtt` to get a plain `transcript.txt`, then carry on from step 4. Captions have no punctuation and some misheard words, so read them with that in mind. If there are no captions, fall back to downloading and running Whisper.

## Workflow

Run steps in order. If a step fails, report which step and why, then stop cleanly. Never leave the session in a broken state.

### 0. Parse the link

Extract the shortcode from the URL: the segment after `/reel/`, `/reels/`, or `/p/` (strip query strings like `?igsh=...`). Set the working folder:

```
WORKDIR=~/reel-to-skill-runs/<shortcode>
mkdir -p "$WORKDIR"
```

### 1. Fetch metadata (no download yet)

```bash
uvx yt-dlp --skip-download --dump-json "<REEL_URL>" > "$WORKDIR/raw.json"
```

From the JSON keep: `description` (the caption), `uploader`, `channel`, `like_count`, `comment_count`, `webpage_url`. Save them to `$WORKDIR/metadata.json` and delete `raw.json`.

If the JSON shows a photo post or carousel (no video formats, or `_type` is `playlist` with image entries), say it has no audio track and offer to build from the caption alone. If the user agrees, skip to step 5.

### 2. Download the video

```bash
uvx yt-dlp -f "best[ext=mp4]/best" -o "$WORKDIR/reel.%(ext)s" "<REEL_URL>"
```

### 3. Transcribe locally

Check the machine with `uname -sm`.

On Apple Silicon (`Darwin arm64`):

```bash
uvx --from mlx-whisper mlx_whisper "$WORKDIR/reel.mp4" \
  --model mlx-community/whisper-large-v3-turbo \
  --output-format txt --output-dir "$WORKDIR"
```

Everywhere else:

```bash
uvx --from openai-whisper whisper "$WORKDIR/reel.mp4" \
  --model turbo --output_format txt --output_dir "$WORKDIR"
```

The first run downloads the model and takes a minute or two. Tell the user that so they don't think it hung. If the transcript comes out in the wrong language, rerun with `--language en`.

### 4. Sanity-check the transcript

Read `$WORKDIR/reel.txt`. Treat the reel as music-only if:

- the file is empty or under about 15 words, or
- one short phrase repeats for most of the file (a common Whisper hallucination on music)

If music-only, say so plainly and continue with the caption text only. Don't fail.

Otherwise report the word count and move on.

### 5. Build the new skill

Ask the user one question first: **skill or agent?**

- A skill teaches Claude a method it applies inside a conversation.
- An agent is a worker Claude dispatches to go do the whole thing.
- When in doubt, recommend skill. It can be promoted to an agent later.

Then invoke the `skill-creator` skill. Give it:

- the transcript (or "music-only, caption only")
- the caption
- the author handle
- the reel link

Let skill-creator run its own process and questions. Ground the new skill in what the reel actually says. Don't pad it with steps the reel never mentioned.

Keep the skill faithful to the source. Don't tailor it to the user's voice, brand, or style guides (in Glenn's repo: not to the knowledge base or the three-pass workflow), and don't drop tactics because they clash with that style. Glenn tailors outputs to his voice later in a separate skill. Swapping a paid tool the reel promotes for plain Claude is fine.

Where to write the result:

- Default: `~/.claude/skills/<new-skill-name>/` (or `~/.claude/agents/<name>.md` for an agent)
- In a cloud or remote session, `~/.claude` is wiped when the session ends. Write to the current project's `.claude/skills/` (or `.claude/agents/`) instead so it can be committed, and tell the user.

### 6. Clean up

After transcription succeeds, delete `$WORKDIR/reel.mp4`. Keep `reel.txt` and `metadata.json` as the archive.

## Error handling

- **Login or rate-limit error from yt-dlp:** retry once with `--cookies-from-browser chrome` (reads the user's logged-in browser, read-only). This only works on the user's own machine. In a cloud session there's no browser, so tell the user to try later or run it locally.
- **Still blocked:** Instagram rate-limits bursts. Suggest waiting an hour. Process reels one at a time, never in batches.
- **Photo post or carousel:** no audio. Offer to build from the caption.
- **Nonsense transcript full of repeats:** music-only. Build from the caption.
- **Tools broken after a long gap:** rerun. `uvx` fetches current versions.

## Example run

```
Fetching metadata... caption + author saved
Downloading video... 4.2MB
Transcribing... done in 6s (312 words, English)
Transcript looks like real speech. Invoking skill-creator...
One question before I build: skill or agent?
```
