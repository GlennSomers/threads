# Animation presets

JSON presets in this folder ship with the Studio (copied into the hosted app at build time, next to the built-in ones and those grabbed in the app).
Each file: `{ "id", "name", "dur" (seconds), "ease" (label), "keys": [[p, x%, y%, scale, opacity, rotate], ...] }`, p from 0 to 1, x and y in % of the thing's own size, written as an entrance (an exit plays it backwards).

Make one from a reference in a Claude session:
- `python3 .claude/editing-studio/tools/grab_anim.py <video> <start> <end> <x,y,w,h> .claude/editing-studio/animations/<name>.json --name "<Name>" --sheet <name>.jpg`, or
- `/reanimate` for anything more complex (several elements, a website): its spec rows (start, duration, from → to, easing) turn into keys. Its runs go in `.claude/reanimate/<name>/`.
