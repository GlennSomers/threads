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

The `straight-talk` skill (from chen.media) is for general writing: emails, docs, replies, captions. Glenn's own posts, threads and newsletters follow the knowledge base and the three passes above instead, and his voice wins where the two disagree (for example, his longer drifting sentences over Straight Talk's 10-word average).
