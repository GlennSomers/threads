# Editing Studio: where things stand (2 Nov 2026)

Read this first in a new session, then `README.md` in this folder for how each feature works.

## Live on main (hosted app on Vercel, project `glennstudio`, root `studio-app/`)
- Layout like Glenn's screenshot: icon rail, panel, takes, preview, Look A–F, right inspector + chat, timeline. Phone: preview, chat, tabs.
- **Effects:** 45 effects from `.claude/skills/effects` (Vibha's pack). Effects track (drag/resize), Check frames (`fxcheck` job), drawn by `fx.py` in the render after the grade.
- **Chat** ("say what to change"): no API key. Runs Claude Code in GitHub Actions with the repo secret `CLAUDE_CODE_OAUTH_TOKEN` (job `chat`), ~30–60 s an answer. An `ANTHROPIC_API_KEY` in Vercel would switch it to the direct API.
- **Animations:** Grab an animation from a reference reel (Ingest style → box + time range, `anim` job, `tools/grab_anim.py`, easing named by `.claude/skills/reanimate/scripts/easing.ts`). Animate panel applies presets to picked caption words or element entrances.
- **Elements:** upload images, place/drag, looks, motion, in/out animations.
- **Fonts:** 32 free Google fonts (one `GFONTS` list in `studio/engine.js`, also read by `tools/render.py`), font upload (Your fonts), custom pair (captions font + titles font, `--tf`).
- **Captions:** 8 creator styles from `reel-fonts-and-caption-animations.md` (Glenn's research brief), every option editable (position, width, spacing, shadow, outline colour, box, animation speed...), drag captions and the hook title on the preview, hook title editor.
- **Reel motion library:** 66 animations, 17 transitions/overlays, 16 premium caption styles from Glenn's `motion-library/` JSON, via `tools/import_motion_library.py` → `studio/motion.js`. See README.
- **Safe zones:** guides + Keep everything inside. Normal-post figures from vidova.ai (All socials 180/380/60/150 px on 1080×1920); "Ads (Meta Reels)" is the larger ad zone.

## Not tested on GitHub yet (Glenn's first real use is the first run)
Render with effects (installs mediapipe, opencv, libegl1), Check frames, Grab an animation (installs Bun), chat job.

## Ideas not built yet
SRT export, the 14 library entries in `motion-library/IMPORTED.md` marked not added, safe zone for scenes and full-frame effects.

## Working notes
- Test locally: `cd studio-app && npm run sync && STORAGE=fs PORT=8766 node dev-server.js`, then drive it with Playwright. Jobs run as local child processes. Effects need `bash .claude/skills/effects/scripts/setup.sh` and `apt-get install libegl1 libgles2`.
- GitHub only runs workflow changes from `main`, so new job types only work after merge.
