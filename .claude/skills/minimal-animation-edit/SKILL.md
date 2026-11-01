---
name: minimal-animation-edit
description: Plan and edit a talking-head clip in the clean premium minimal animation style (cinematic two-font text, paper textures, blue accent line and graph animations, painting / B-roll / illustration cut-aways, quote scenes). Use when the user wants a minimal or "Arthur Brooks style" edit, a planning document for a talking-head edit, or to train Claude on an editing style from reference videos. Built from Joseph | Video Editing, "How to Edit VIRAL Talking Head Videos Using ONLY Claude! (New Minimal Style)".
---

# Minimal animation edit

Source: https://youtu.be/g9xoKm5DEeU (breakdown, transcript and frames in `.claude/reel-to-skill-runs/g9xoKm5DEeU/`). Follow the source; do not restyle it.

## The style: 10 principles
1. **Cinematic captions.** Sans (Inter) for most words, script or serif (Playfair Italic) for special words. For each line of 5 words or fewer, pick the most important word(s), make them bold (bold sans or bold serif) and centre them big; put the other words in the gaps above or below, smaller. Some serif words in the accent blue.
2. **B-roll + text.** B-roll that shows what is said; light paper texture; darkened edges; blurred edges; cinematic text on top describing the scene.
3. **Painting + text.** A painting that shows the point; paint and rough paper texture; cinematic text around the main subject; quick camera slide-in reveal.
4. **Line + text.** Black or white paper-textured background; an accent-blue line draws, is interrupted by cinematic text, and continues into related text; the camera tracks the line.
5. **Line + illustrations.** Same line leading into illustrations: horizontal with a white dot marking an object, text and an illustration; zig-zag with the camera panning to reveal objects on both sides (progression through phases); or straight up to the subject.
6. **Text-centric.** White or blue background, very rough paper texture, two quotation marks around the centre, cinematic text in the middle.
7. **Centre illustration.** The main idea as an illustration in a rough, painted, noisy blue texture on white paper, filling the lower half and bleeding into the upper middle with abstract edges; text around it. Variants: top-down brain, circle of thin lines, side profile with rough cloth texture.
8. **Side illustration + text.** Character or half-circle on one side, cinematic text on the other (or rotating around it). For showing two elements at once.
9. **Object + text.** One element with text around it, paper background, rough reveal.
10. **Graphs.** Flat dark textured background, grid of thin glowing white lines, a blue ball drawing the line with the camera following it.

## Training Claude on a style (any style)
1. Collect about 20 of the creator's best videos in that style.
2. Watch them as an editor; for every good scene ask why this design, colours, effects, animation.
3. Screenshot the scenes you like (about 130) onto one board; group them into the style's principles and break each group down (fonts, colours, sizes, patterns).
4. Prompt: "I want to teach you a new editing style. Analyze this [style] using the 20 reference videos. Start by creating a word-by-word transcript and a frame-by-frame breakdown of every single video to study three main things: where the animations are placed in correlation with the script; how the design is composed and what elements make it up; and the animation logic, how long the animations are and what they feel like so you can recreate them. Then use the board as a reference that breaks down the elements of the style and master the style using both so that I could prompt you to recreate it."
5. Save the result as a skill with the measurements plus a reference folder of every extracted animation (design + keyframe sheet).

## Editing a clip
1. **Transcribe and cut.** Word-by-word transcript at millisecond level; cut all silences leaving **30 ms** of padding.
2. **Planning document (do not skip; AI planning alone is not creative enough).** Script and clip on the right; one card per beat on the left with: time range, a free-text plan box, and **three recommended designs (A, B, C)**, each with a preview, title, which principle it belongs to, a one-line description and a reference id. The user picks or writes their own; "Copy plan" exports it.
3. **Planning rules.**
   - Open on A-roll with cinematic captions so the viewer connects with the speaker.
   - When the speaker **announces** a new idea, stay on their face. When they **describe** it, show it.
   - Numbers, growth or progression: a graph (a line that climbs one step each time "up" is said; a long flat line for "slow and steady").
   - A person being described: character callout. A story: painting. A feeling or action: B-roll + text.
   - A personal story with photos: object callout with images.
   - The big point: line + text running through the key words.
   - End on a text-centric scene with quotation marks.
   - Keep the scenes balanced so it flows.
4. **Build.** From the plan: find the chosen references, make an asset list, fetch assets (public-domain paintings and photos from Wikipedia/Wikimedia, stock footage), download the fonts, caption the A-roll with the cinematic text, build each scene, render a first draft.
5. **Revise.** Expect 60–70% on the first draft. Watch it and give specific notes (a scene's text design, rough cuts between animations, textures too heavy or not moving with the animation, a bad cut at a timestamp, a scene that needs to stay longer, missing quotation marks). Re-render.
6. **Sound design last.** Cinematic music bed; **clicks for text, highlighter sounds for graphs, whooshes for transitions**; place each from how the reference videos use them.

## In this repo
The Editing Studio (`.claude/editing-studio/`, hosted as `studio-app/`) implements this: the "Cinematic" caption style, minimal scenes per beat (A-roll, quote, line + text, graph, B-roll/painting/centre/side image scenes with paper texture), three recommended scenes per beat, a plan box and "Copy plan", 30 ms cut padding, and click / highlighter / whoosh sound placement.
