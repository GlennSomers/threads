---
name: outlier-format
description: Structure and speed up content creation with AI, following Nick Tarmossin's method - get ideas from long-form content, pick a high-performing daily format, find outlier videos (3-5x views vs followers), break down why they worked, templatize them, save the format, script your idea in it, then repurpose into carousels and X/LinkedIn posts. Use whenever the user shares a post, reel, or creator that did unusually well and asks why, says "break this down", "why did this work", "templatize this", "steal this format", "use this format", "outlier", wants to pick a content format, or wants to repurpose a video into a carousel or written posts.
---

# Outlier Format

Use AI to speed up content creation without replacing the creativity: borrow proven formats from outlier videos, then fill them with your own ideas.

Source: Nick Tarmossin (@nicktarmo), https://www.instagram.com/reel/Db6NPsWxzOZ/. The reel runs these steps in a paid tool called Stanley; here Claude does them directly. The reel's own prompts were gated behind a comment and aren't included.

## Workflow

The user may start at any step. If they share an outlier, start at step 4. If they name a saved format and an idea, jump to step 8. Ask only for what's missing.

### 1. Get the idea from long-form content

Ideas come from long-form content (podcasts, YouTube videos, newsletters, books), not short-form. If the user has no idea yet, ask what long-form content they've been consuming or making and pull a few candidate ideas from it.

### 2. Pick a high-performing format you can make every day

The format is the repeatable shape of the content (for example: a step-by-step walkthrough, a myth-bust, a side-by-side comparison, a talking-head story). It has to be one the user can produce daily.

### 3. Find a creator who does that format very well

Ask the user who they have in mind, or help them think of creators known for that format in their niche.

### 4. Find outlier videos

Scroll the creator's page for videos with **3 to 5 times more views than their follower count**. Ask the user for the view count and the follower count. If a video isn't an outlier by that measure, say so; it's weaker evidence the format works.

To get the content:

- **Instagram reel or YouTube video:** use the fetch and transcribe steps from the `reel-to-skill` skill to get the caption and transcript. Skip its skill-creator hand-off.
- **Anything else:** ask the user to paste the text or transcript.

### 5. Transcribe and break down why it did well

Cover:

- **Hook:** what the first line and first seconds do.
- **Structure:** the beats in order, with rough timings.
- **Length and pacing.**
- **Payoff:** what the viewer gets and where.
- **Format:** which repeatable shape it uses.
- **Why it fit that audience.**

### 6. Templatize it

Turn the breakdown into a reusable template: the beats in order, each with a slot for the user's content (`[hook: surprising claim about topic]`, `[step 1]`, ...), plus timing guidance for video.

### 7. Save the format to memory

Add it to `.claude/content-formats.md` (create it if needed) so it can be reused later. Read this file at the start of every run and reuse a matching format instead of duplicating it.

```markdown
## <Format name>
- **Source:** <creator, link, views, followers>
- **Medium:** short-form video | carousel | written post
- **Why it works:** <one or two lines>
- **Beats:**
  1) <beat>
  2) <beat>
- **Used for:** <ideas scripted with it, added over time>
```

### 8. Write a rough script, then a final script

Combine the user's idea, the format, and the breakdown into a rough script, ideally starting from the user's own notes. Then, in the same conversation (so the analysis and template are still in context), refine it into a final script built to perform. Add the idea to the format's "Used for" line.

### 9. Make the video

That part is the user's. Offer shot notes or on-screen text if they want them.

### 10. Repurpose into a carousel

Split the script into carousel slides: one idea per slide, short enough to read in a glance, with a hook on slide 1. Give slide text; the user does the design.

### 11. For founders and entrepreneurs with a mature audience: repurpose into written content

Turn relevant video scripts into platform-appropriate written posts for X and LinkedIn. Ask first whether this applies to the user.

## Notes

- Copy the format, never the original creator's words or story.
- An outlier shows a format can work. It doesn't guarantee the next video will.
