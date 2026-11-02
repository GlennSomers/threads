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

## Effects (from the effects skill)
The 45 effects from `.claude/skills/effects` (Vibha Ramprakash's pack, MIT) are in the Studio's **Effects** library.
- Tap one to add it at the playhead (3 s, or 6 s for over-the-shoulder-zoom). It lands on the **Effects** track: drag it to move it, drag its edges to change the length, click it to edit its options in the right panel.
- The browser can't draw them (they track your face and cut you out of the room), so the preview shows a red frame and the effect's name while one is active. **Check frames** in the right panel draws three real frames (35%, 60% and 90% in) in the background (about a minute).
- The render runs `fx.py` on the footage after the grade and LUT, before captions and titles go on top. Effect times follow your cuts.
- Effects you add are kept per clip in the browser, and saved with a style.
- Hosted: the Actions job installs the skill's packages (mediapipe, opencv) for renders and checks. Locally: run `bash .claude/skills/effects/scripts/setup.sh` once (mediapipe also needs `libegl1` on Linux).

## Edit by saying it
The box under the right panel takes plain requests ("add a backdrop word CLAUDE when I say Claude", "make the captions bigger", "cut the first two seconds", "warmer look"). The mic button dictates (Safari and Chrome). Claude (claude-opus-5-5) gets the current edit, the transcript with word times and the list of options, and sends back edits that the app applies as if you'd clicked them. With no API key, each message runs Claude Code in GitHub Actions logged in with your Claude account (the same `CLAUDE_CODE_OAUTH_TOKEN` repo secret the Refine button uses), so it uses your Claude plan instead of API credits. An answer takes about 30 to 60 seconds that way, mostly GitHub starting the job. If `ANTHROPIC_API_KEY` is ever set in Vercel, the chat calls the API directly instead (a few seconds). Hosted app only; the Python `studio/server.py` doesn't have the chat.

## Animations (grabbed from references) and elements
- **Grab an animation** (Ingest style, on a reference): play to the move, set start and end around it, drag a box around the thing that moves, name it. A job (`tools/grab_anim.py`) tracks it frame by frame against the empty background: position, size and opacity on each frame, saved as an animation preset (`animations/<id>.json` in storage, with a filmstrip in `shots/anim-<id>.jpg`). The reanimate skill's `easing.ts` names the curve (for example "easeOutCubic over ~400 ms"). An exit is saved reversed, as an entrance. It reads one thing moving over a still background; rotation and blur are not measured.
- **Animate** (rail): tap the first and last caption word, then an animation; those words come in with it as they are spoken (any caption style, cinematic included). With an element selected, tapping one sets how it comes in. Built-in: Pop, Slide up, Drop and bounce, Fade, Zoom punch, Swing in, Slide from right, Stamp.
- **Elements** (rail): upload images (stored as `shots/el-*`), tap one to put it on the video at the playhead, drag it on the preview to place it. Per element: start/end, size, rotation, look (plain, rounded, shadow, white card, glass frame, sticker outline, circle), motion (float, pulse, wobble, slow spin), and an in and out animation from the same library. They sit above the effects and under the captions.
- Presets saved as JSON in `.claude/editing-studio/animations/` ship with the app. For complex moves (several parts, a website) use `/reanimate` in a Claude session; keep its runs in `.claude/reanimate/<name>/`.
- The chat can do all of this too ("make 'hours' drop and bounce", "put the smiley top right from 2 to 5 seconds with a sticker outline").

## Your fonts
On the Fonts step, **Upload fonts** takes .ttf, .otf, .woff and .woff2 files (only upload fonts you have the rights to use). Each is checked in the browser first, stored in `fonts/` (Blob, or the local data folder), and named from its file (`MyBrand-Bold.otf` becomes "My Brand Bold").
- It shows under **Your fonts** (tap Use to make it the font pair), at the end of the font pair cards, and in the caption editor's Font menu, so captions can use it on their own.
- One face covers every weight, so bold captions use the real font instead of a faked bold. Upload the weight you want to see.
- The render copies the files of the uploaded fonts in use and loads them in the HyperFrames page, so the video matches the preview. Saved styles remember them.
- × removes a font from the list (the file stays in storage).

## Fonts and creator caption styles (from `reel-fonts-and-caption-animations.md`)
The brief Glenn's research agent wrote is saved next to this README.
- **Fonts:** the 32 free (OFL / Apache) families from its list load from Google Fonts. There's one list, `GFONTS` in `studio/engine.js`, used by both the Studio and `render.py`, so the preview and the render can't drift. On the Fonts step they're under **All fonts**, grouped (bold caption, clean sans, display, handwritten, serif, mono); tap one to use it alone. They're also all in the caption editor's Font menu. The paid ones (The Bold Font, Proxima Nova, Impact, Komika Axis) are not bundled: upload them under **Your fonts** if you hold a licence, or use the free stand-ins the brief names (Anton, Montserrat, Bangers).
- **Caption styles** (Captions step), built from the brief's presets: Photography educator (Montserrat, gold key word, bounce), Hormozi (Anton, uppercase, 2 words, each word pops in, orange key word), MrBeast (Bangers, thick outline, flash scale-up, yellow key word), Karaoke gold (Montserrat 800, gold current word, 32% black plate), Ali Abdaal (Inter, dim to bright, no outline), Iman Gadzhi (Montserrat lowercase, light to bold on the spoken word), Minimal cinematic (DM Sans, fade), Podcast clip (Inter, green box on the current word, plate). Every value can still be changed in the caption editor.
- **New caption options:** highlight modes Key word (colour), Box on current word, Dim to bright, Light to bold; animations Word pop (each word), Bounce, Flash scale-up; box opacity; weights 300 to 900.
- **New Animate presets** (for picked words and elements): Bounce in (CapCut keyframes), Word pop (Hormozi), Shake.
- Not done from the brief: emoji pops, lower thirds, arrow/circle callouts, SRT export, and changing the caption position limits to its cross-post safe zone (captions still allow 12% to 76% from the top; the brief keeps essential text out of the bottom 35%).

## Your own font pair, full text control, safe zones
- **Make your own pair** (Fonts step): pick a captions font and a titles font from every font (the 32 free ones and your uploads). Captions use the first; hook titles and effect text use the second (`--tf`). Picking any font or pair on the Fonts step also overrides the font a caption style brings with it ("Font from the Fonts step" in the caption editor); picking a caption style again brings its own font back.
- **Caption styles are starting points.** Every value in the caption editor can be changed on top of the style: font, weight, size, height, left/right, text width, alignment, words at a time, highlight, animation, animation speed, timing, hold, outline width and colour, shadow (soft, hard drop, glow, none), letter spacing, line height, case, colours, box, box colour, opacity and corners. **Save current as preset** keeps your version.
- **Drag to place:** on the Captions step, drag on the video to move the captions; on the hook beat (Beats step), drag to move the hook title. Elements drag as before.
- **Hook title editing** (Beats step, hook beat): size, left/right, up/down, colour and font on top of the title style.
- **Safe zones** (under the video), for normal posts on 1080×1920 (from vidova.ai's 2026 guide; the apps don't publish exact figures, so check a real post on your phone): All socials 180 px top, 380 bottom, 60 left, 150 right (870 × 1360 clear, the same as YouTube Shorts, which covers the most); Instagram Reels 108/320/60/120; TikTok 130/320/44/140; YouTube Shorts 180/380/60/150. **Ads (Meta Reels)** is the much larger ad zone (269 top, 672 bottom, 65 each side). **Guides** shades what the apps cover. **Keep everything inside** fits captions, the hook title and elements into the zone, in the preview and the render: their positions become places inside the zone and they can't cross its edge. Turning it on or off converts positions so nothing jumps. Scenes and full-frame effects are not moved.
- The chat knows these too: "use Bebas for titles and Inter for captions", "make the hook title bigger and gold", "keep everything inside the TikTok safe zone".

## Reel motion library (`motion-library/`)
Glenn's motion library (Reel motion library, Premium upgrade): `animation-registry.json` (112 animations, layered keyframes) and `presets.json` (24 caption presets).
`python3 tools/import_motion_library.py` turns them into `studio/motion.js`, which the Studio and the render both load after `engine.js`. Run it again whenever the JSON changes.
`motion-library/IMPORTED.md` lists where each entry ended up:
- **66 animations** for caption words and elements (Animate panel, grouped Caption / Title / Element / Glow and shadow / Layout, ★ = premium). The engine plays the layered keyframes (opacity, scale, squash, x/y, blur, glow, 3D flip, wipe and circle masks, draw-on, colour split, tracking, drop shadow, ghost trails), each step eased as in CSS (cubic-bezier or spring). Per-letter ones stagger letters. Typewriter, scramble, glitch, number roll, marker, underline, shake and glint are drawn by code (caption words only). Exits are stored as entrances and play forwards as an element's "Goes out".
- **Every caption word**: caption editor → Animation → any library caption or title animation (`lib:<id>`).
- **Highlight modes**: glow karaoke, colour-wipe karaoke, dim chorus + lift; the rest already matched existing modes.
- **Element motion**: Ken Burns, Breathe, Glow breathe.
- **17 transitions and overlays** on the whole frame (Animate panel, Transitions track on the timeline): flash frames, light leaks, glitch, whip blur, iris, paper tear, camera shake, film grain + vignette, camera HUD, progress bar with chapter ticks. "Every cut" places a transition at each cut and beat.
- **16 premium presets** are caption styles (Cinematic photographer, Documentary, Luxury editorial, Gear review, BTS, Tech minimal, Street film, Wedding, Travel, Education glow, Hook slam, Podcast pill, Before/after, Agency kinetic, FCP cinematic, Glenn Pro). Cormorant Garamond was added to the fonts; SF Pro Display falls back to Inter.
- **Not added (14)**: things that need a cut-out of the subject, a second clip or word, motion tracking or a speed change. Reasons are in `IMPORTED.md`.
