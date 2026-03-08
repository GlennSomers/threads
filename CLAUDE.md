# Project Instructions

## Knowledge Base

Always read `.claude/knowledge-base.md` at the start of every session and before writing any content. It contains Glenn's brand voice, content pillars, ICA, writing style, and biographical context. All content must be grounded in this reference — never invent details about Glenn, his audience, or his niche.

## Post Output

When asked to write or generate posts, output them directly in the response. Never write posts to a markdown file unless explicitly asked to save them.

## Humanizer Default

Always invoke the `humanizer` skill on any prose text before outputting it to the user. This applies to all written content — post drafts, rewrites, knowledge base entries, and any other text output. Code, file paths, git commands, and tool calls are exempt.

## Auto-Skill Detection

At the start of processing any request, review the available skills listed in the active system context. Identify which skills — or which sections of a skill — are relevant to the current task. Apply them automatically without waiting to be prompted. If only part of a skill is relevant, apply that section only. Do not apply skills that have no bearing on the request.

## Pre-Output Verification

Before outputting any final response that includes prose, run a verification pass in this order:
1. Run every item in the Pre-Output Voice Checklist from the knowledge base against the draft
2. Check whether any available skill not yet applied could improve the output — if yes, apply it
3. Confirm the `humanizer` skill has been invoked on all prose in the response
4. Only output after all three checks are complete and passing
