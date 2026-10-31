---
name: reel-script-refine
description: Refine one reel draft file in .claude/drafts/ into a shoot-ready script, on-screen text and caption, written back into that same file. Used by the Reel Drafts web app's Refine button (via the refine-draft GitHub workflow) and when Glenn says "refine this draft" or "refine .claude/drafts/<file>".
---

# Refine a reel draft

The Reel Drafts app saves Glenn's ideas as markdown files in `.claude/drafts/`. This skill turns one
of them into a reel he can shoot, using the skills and knowledge base already in this repo, and
writes the result back into the same file. Writing to the draft file is the explicit request here,
so the "output posts in the response" rule in CLAUDE.md does not apply to this skill.

## 1. Read

1. The draft file you were given.
2. `.claude/knowledge-base.md`. Every fact about Glenn comes from here or from his own words in
   the draft. Never invent details about him, his audience or his results.
3. `.claude/instagram/voice.md` and `.claude/instagram/swipe.md`, if they exist.
4. The skills you'll follow below: `ig-reel`, `brain-dump`, `ig-caption`, `ig-human`,
   `structural-humanizer`, and `glenn-skill` (for its voice rules and read-aloud test).

## 2. The draft's sections

| Section | Written by | Rule |
|---|---|---|
| `## Idea` | Glenn | His words. Never edit. |
| `## Direction` | Glenn | Instructions for this refine (length, angle, series part). Follow them over defaults. Never edit. |
| `## Script` | You | The spoken script. |
| `## On-screen text` | You | Text cards with timings. |
| `## Caption` | You | The Instagram caption. |
| `## Claude's notes` | You | A short note to Glenn. |

## 3. Pick the starting point

- **Script already has content:** that's the latest version, and Glenn may have edited it by hand.
  Make minimal edits to it, keeping his words (CLAUDE.md: start from his words). Only rebuild if
  Direction asks for a rewrite.
- **Idea reads like dictation or rambling:** follow `brain-dump`. Edit his spoken words, don't
  rewrite them. Keep at least 80% of the words he said and check with
  `python3 .claude/skills/brain-dump/scripts/word_share.py <idea-file> <script-file>`.
- **Idea is short notes:** write from scratch, using the knowledge base for voice direction.

## 4. Write the reel

Follow `ig-reel` for the shape and the tools, in Glenn's voice:

- Write three hook options from `ig-reel/hooks.json` and score them with
  `python3 .claude/skills/ig-reel/hookscore.py <file>`. Use the winner.
- Write the script on the winning hook. Default length 30 seconds unless Direction says otherwise.
- Time it with `python3 .claude/skills/ig-reel/beats.py <file> --target <seconds>` and fix the flags.
- Reels need a hook and one ask, but the knowledge base voice still rules: no hype, no guru tone,
  no tidy "here's what I learned" endings, no em dashes.
- If a number or fact is needed and isn't in the Idea or knowledge base, leave `{{your number}}`
  and mention it in Claude's notes.

**Script format:** one spoken line per line, exactly as Glenn would say it. Shot or b-roll cues go
on their own line in square brackets, e.g. `[B-roll: scrolling the culling grid]`.

**On-screen text:** follow the on-screen rules in `ig-reel`. One card per line, starting with a
rough timestamp, e.g. `0:00 — CULLED IN ONE EVENING`.

**Caption:** follow `ig-caption` (a reel caption is usually its Job A). Check it with
`python3 .claude/skills/ig-caption/caption.py <file>`.

## 5. Run the passes

Before writing anything back, run the three passes from CLAUDE.md on the script and the caption:

1. Word pass: `ig-human` (`humanize.py`, then `detect.py`) and the humanizer checks in `glenn-skill`.
2. Structural pass: `structural-humanizer`. Fix only what it flags.
3. Read-aloud test from `glenn-skill`. A script gets said out loud, so this one matters most.

Use a scratch folder outside the repo (e.g. `$RUNNER_TEMP` or `/tmp/reel-refine/`) for the files
these tools need. Don't save them in the repo.

## 6. Claude's notes

Two to five short lines:
- What changed and why, in a sentence or two.
- The hook scores, the timed length, and the brain-dump word share if you used it.
- One or two alternative hooks, each starting `Alt hook:`.
- Any question that would make the next version better.

## 7. Write the file back

Edit only the draft file you were given.

- Keep the frontmatter at the top between `---` lines, with every key. Set `status: refined` and
  set `updated:` to the current UTC time, e.g. `2026-10-31T16:05:00Z`. Don't change `title` or
  `created` unless Glenn asked.
- Keep all six sections, in order, each as a `## ` heading: Idea, Direction, Script,
  On-screen text, Caption, Claude's notes.
- Never put `#` or `##` headings inside a section. The app splits sections on them.
- Leave Idea and Direction exactly as they were.
- Don't create, rename or delete other files, don't append to `.claude/instagram/log.md`, and
  don't commit or push. When this runs from the web app, the workflow commits the draft. When
  Glenn runs it in a normal Claude Code session, CLAUDE.md's commit-and-push rule applies as usual.
