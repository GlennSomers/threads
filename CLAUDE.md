# Project Instructions

## Knowledge Base

Always read `.claude/knowledge-base.md` at the start of every session and before writing any content. It contains Glenn's brand voice, content pillars, ICA, writing style, and biographical context. All content must be grounded in this reference — never invent details about Glenn, his audience, or his niche.

## Post Output

When asked to write or generate posts, output them directly in the response. Never write posts to a markdown file unless explicitly asked to save them.

## Post Drafting Approach

When Glenn provides a draft, start from his words and make minimal edits. Do not rebuild from scratch using the knowledge base rules — his draft already has the right energy.

When writing from scratch, use the knowledge base for voice direction, not as a checklist to run against every sentence.

Before outputting any post, run three passes:

1. **Humanizer pass** — scan for AI writing patterns (em dashes, AI vocabulary, Rule of Three, promotional language, inflated significance, etc.) and remove them. This is pattern cleanup only — do not use this pass to inject personality or soul. Glenn's voice comes from the knowledge base.

2. **Structural pass** — use the `structural-humanizer` skill to catch shape-level tells the word pass misses: stated lessons, tidy single-track arcs, embodied emotion ("my chest tightened"), vague allusions instead of named specifics. Fix only what it flags. Do not invent details about Glenn to add specificity; use only what's in the knowledge base or his draft.

3. **Read-aloud test** — does this sound like something Glenn would say to a friend, or does it sound constructed? Specifically: does the ending feel like where the thought ran out, or like a place that was chosen to stop? Is there a faint "here's where I landed" quality even without a stated lesson? If anything feels composed rather than just said, strip it back.

The `.claude/skills/glenn-skill/SKILL.md` file contains the full step-by-step workflow for content writing tasks.

## Skills Built From Reels and Videos

Skills made from a reel or video (with `reel-to-skill` or otherwise) follow the source faithfully. Do not tailor them to Glenn's voice, the knowledge base, or the three-pass workflow, and don't drop the source's tactics because they clash with his style. Their outputs are generic; Glenn tailors them to his voice later in a separate skill. The voice rules above still apply when writing Glenn's own posts.

## Straight Talk Skill

The `straight-talk` skill (from chen.media) runs only when Glenn types `/straight-talk`. When he does, its rules apply to all the writing in that request, including his posts, threads and newsletters, and they override the knowledge base's style rules and the three passes for that request. Facts about Glenn still come only from the knowledge base or his draft. Without the command, his normal voice rules apply.

## Save Everything to GitHub

This runs in cloud sessions that wipe everything outside the repo when they end. So anything worth keeping lives in the repo and gets pushed:

- Every skill, agent, setting, note, transcript, data file or saved output goes inside the repo (under `.claude/` unless a section below says otherwise). Never save lasting files to `~/`, `~/.claude/` or `/tmp/`.
- When a new skill or skill pack names a save folder outside the repo, point it at a matching folder under `.claude/` and add that folder to this file.
- Commit and push every change to the current branch in the same turn it happens. Don't leave anything uncommitted at the end of a turn.
- Never commit secrets: API keys, tokens, passwords, cookies or login files. Those stay out of the repo (for example `~/.agent-reach/`), and Glenn sets them up again when needed.
- Don't commit large media (videos, audio). Keep transcripts and notes instead.
- `reel-to-skill` runs live in `.claude/reel-to-skill-runs/`, and the skills it builds go in `.claude/skills/`.

## Instagram Skill Data

The ig-* skills save their files (voice.md, log.md, swipe.md, plan.md) in `.claude/instagram/`, relative to the repo root. Whenever one of them creates or changes a file there, commit it and push to the current branch in the same turn, so nothing is lost when a cloud session ends. Use absolute paths (`$(git rev-parse --show-toplevel)/.claude/instagram/...`) when running a script from inside a skill folder.

## Content Skills Data (Ootto pack)

These skills save inside the repo, relative to the repo root:

- `ai-brain` and every skill that mentions "your Obsidian vault": the vault is `.claude/vault/`, with notes in `.claude/vault/AI Brain/` and the index at `.claude/vault/AI Brain/MOC.md`. Read and write the files directly.
- `hook-mining`: CSVs and their `.mined.json` output go in `.claude/hook-mining/`.
- `comment-responder`: rules in `.claude/comment-responder/auto_responses.json`, lead log in `.claude/comment-responder/leads.md`.

Whenever one of these skills creates or changes a file there, commit it and push to the current branch in the same turn.

Exception: `agent-reach` keeps its settings, cookies and API keys in `~/.agent-reach/`. Never copy that folder into the repo or commit any of its contents. Its temporary output stays in `/tmp/`.

## Spoken Scripts and the Voice Blueprint

When Glenn gives a brain dump for a video script, follow the workflow in `.claude/voice-blueprint/README.md`. Keep his words using the brain-dump skill rules, use all the script, hook and ig skills for structure, and give line-by-line variations for him to approve. Log every decision and its reason in `.claude/voice-blueprint/decisions.md`, add voice patterns to `.claude/voice-blueprint/voice-observations.md`, save the raw dump in `.claude/voice-blueprint/brain-dumps/`, then commit and push in the same turn. Straight-talk does not apply to spoken scripts unless he types `/straight-talk`.

## Replies to Glenn

Write every chat reply to Glenn using the rules in `.claude/skills/straight-talk/SKILL.md`, whether or not he typed the command. This covers Claude's own messages: updates, answers, summaries and questions. It does not change how his posts are written, which still follow the sections above.
