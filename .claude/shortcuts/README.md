# iPhone shortcuts

## Download video.shortcut
Share a YouTube (or other) link to it, pick a quality, and a-Shell downloads it with yt-dlp into
Files → On My iPhone → a-Shell → Documents.

Menu: 480p, 720p, 1080p, Best (H.264 + m4a, joined into one MP4), Audio only (m4a).
Needs the a-Shell app with yt-dlp installed (`pip install yt-dlp` in a-Shell; update with `pip install -U yt-dlp`).

**This file is unsigned.** iPhones only import signed shortcuts. On a Mac signed into your Apple ID:
```
shortcuts sign --mode anyone --input "Download video.shortcut" --output "Download video (signed).shortcut"
```
Then AirDrop the signed file to the iPhone and open it.

Not tested on a phone. If the a-Shell step shows as an unknown action after importing, delete it and add
a-Shell's **Execute Command** by hand with:
```
cd ~/Documents && yt-dlp -f "[Menu Result]" --merge-output-format mp4 -o "%(title).60s.%(ext)s" "[Shortcut Input]"
```
(both bracketed parts are the blue variables).

## Videos too big to upload (over 30 MB)
In a-Shell, after downloading, split into ~5-minute parts without re-encoding (instant, no quality loss):
```
cd ~/Documents
ffmpeg -i "VIDEO.mp4" -c copy -map 0 -f segment -segment_time 300 -reset_timestamps 1 "part%02d.mp4"
```
At 480p each part is roughly 20 MB. If a part is still over 30 MB, use `-segment_time 180`.
