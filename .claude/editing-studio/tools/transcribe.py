#!/usr/bin/env python3
"""Transcribe a video with a start and end time for every word.

Usage: python3 transcribe.py path/to/video.mp4
Saves <video>.words.json next to the video.
Uses Groq's whisper-large-v3 if GROQ_API_KEY is set (in the environment or
editing-studio/.env). Otherwise falls back to a local Whisper model
(faster-whisper), which is slower.
"""
import json, os, subprocess, sys, tempfile, uuid
from pathlib import Path
from urllib import request

ROOT = Path(__file__).resolve().parent.parent


def load_env():
    env = ROOT / ".env"
    if env.exists():
        for line in env.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def extract_audio(video, out):
    subprocess.run(["ffmpeg", "-y", "-i", str(video), "-vn", "-ac", "1", "-ar", "16000",
                    "-c:a", "flac", str(out)], check=True,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def groq(audio, key):
    boundary = uuid.uuid4().hex
    fields = {"model": "whisper-large-v3", "response_format": "verbose_json",
              "timestamp_granularities[]": "word"}
    body = b""
    for k, v in fields.items():
        body += f'--{boundary}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode()
    body += (f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="a.flac"\r\n'
             "Content-Type: audio/flac\r\n\r\n").encode() + audio.read_bytes() + f"\r\n--{boundary}--\r\n".encode()
    req = request.Request("https://api.groq.com/openai/v1/audio/transcriptions", data=body, headers={
        "Authorization": f"Bearer {key}",
        "Content-Type": f"multipart/form-data; boundary={boundary}"})
    with request.urlopen(req) as r:
        data = json.load(r)
    return [{"word": w["word"].strip(), "start": w["start"], "end": w["end"]} for w in data.get("words", [])]


def local(audio):
    from faster_whisper import WhisperModel
    model = WhisperModel("small", compute_type="int8")
    segs, _ = model.transcribe(str(audio), word_timestamps=True)
    return [{"word": w.word.strip(), "start": w.start, "end": w.end} for s in segs for w in s.words]


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    video = Path(sys.argv[1]).resolve()
    load_env()
    with tempfile.TemporaryDirectory() as tmp:
        audio = Path(tmp) / "a.flac"
        extract_audio(video, audio)
        key = os.environ.get("GROQ_API_KEY")
        words = groq(audio, key) if key else local(audio)
    out = video.with_suffix(".words.json")
    out.write_text(json.dumps(words, indent=1))
    print(f"Saved {len(words)} words to {out}")
    for w in words[:10]:
        print(f'{w["start"]:7.2f} -> {w["end"]:7.2f}  {w["word"]}')


if __name__ == "__main__":
    main()
