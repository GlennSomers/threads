---
name: outlier-format
description: Break down a high-performing post or reel, turn its structure into a reusable format template, then draft Glenn's own idea in that format as a Threads post, a thread, or a reel script, with optional carousel repurposing. Use whenever Glenn shares a post, reel, or creator that did unusually well and wants to know why, says "break this down", "why did this work", "templatize this", "steal this format", "use this format", "outlier", or asks to write something "in the style of" a specific post or reel. Also use when he asks to pick a content format, save a format, or turn an existing post into a reel or carousel.
---

# Outlier Format

Find what made one piece of content outperform, keep the shape, throw away the words, and fill the shape with Glenn's own idea and voice.

Based on a reel by Nick Tarmossin (@nicktarmo, https://www.instagram.com/reel/Db6NPsWxzOZ/). The reel uses a paid tool for the AI steps; this skill does the same steps with Claude alone.

## Why it works this way

The format is borrowed. The substance never is. Glenn is a writer, not a volume creator, and he thinks AI can't have taste. So this skill does the analytical work (spotting outliers, naming the structure, keeping a format library) and the substance comes from his ideas, his experience, and his drafts. A template that produces a post any photography creator could have written has failed, even if the shape is right.

## Before anything

Read `.claude/knowledge-base.md`. Every draft follows it, and `CLAUDE.md`'s rule holds: if Glenn gives a rough draft, start from his words and make minimal edits.

Read `.claude/content-formats.md` if it exists. That's the saved format library. If the piece he shares matches a format already there, say so and reuse it instead of making a duplicate.

## Workflow

Glenn may enter at any step. If he shares an outlier, start at step 2. If he names a saved format and an idea, jump to step 5. Ask only for what's missing.

### 1. Idea

Ideas come from long-form content: his newsletter, a long thread, a podcast or video he watched, notes from a shoot. Short-form feeds give ideas that are already compressed and already everywhere.

If he has no idea yet, ask what long-form thing he's been reading, watching, or writing lately, and pull two or three candidate ideas from it that fit his content pillars. Let him pick. Don't invent an experience he hasn't had.

### 2. Confirm it's an outlier

An outlier gets 3 to 5 times more views (or likes and replies on Threads) than the creator's follower count would predict. Ask for the numbers if he hasn't given them: views or likes, and follower count. If it's a normal performer for that account, say so. It may still be worth studying, but it's weaker evidence that the format works.

Getting the content:

- **Threads or text post:** ask him to paste the text. Threads can't be fetched from here.
- **Instagram reel:** use the fetch and transcribe steps (steps 0 to 4) from the `reel-to-skill` skill to get the caption and transcript. Skip its skill-creator hand-off. If fetching is blocked, ask him to paste the caption and describe or transcribe the video.

### 3. Break it down

Explain why it did well, in plain language. Cover:

- **Hook:** what the first line or first two seconds do, and why someone stops.
- **Structure:** the beats in order (for a reel, roughly what happens each few seconds).
- **Length and pacing:** character count or runtime, how long each beat runs.
- **Payoff:** what the reader or viewer gets, and where it lands.
- **Format:** what kind of piece it is (list, story, debunk, tutorial, before/after, side-by-side).
- **Why it fit that creator's audience:** some of what worked is the format, some is just them.

Keep the breakdown short. Glenn doesn't need hand-holding.

### 4. Templatize and check it against his voice

Turn the structure into a template with slots, such as `[specific moment]`, `[the setting he changed]`, `[what happened]`. Write the template as beats, never as sentences to fill in. Sentence-level templates produce sentences that sound templated.

Then check each beat against the knowledge base and list what to keep and what to reject, the way the Dan Koe analysis in the knowledge base does. Common rejects for Glenn: thesis-first hooks, clean takeaway closers, engagement-bait CTAs, staccato pacing, before/after arcs. If a beat only works with a move he bans, adapt it or drop it and say why.

Show him the template and the keep/reject list. Then save it.

### 5. Save the format

Add the format to `.claude/content-formats.md`. Create the file if needed. This is the format library: Claude reads it every time this skill runs. Use this layout:

```markdown
## <Plain format name>
- **Source:** <creator, link, numbers (e.g. 2.1M views, 400k followers)>
- **Medium:** Threads post | thread | reel | carousel
- **Why it works:** <one or two lines>
- **Beats:**
  1) <beat>
  2) <beat>
- **Adapted for Glenn:** <what was kept, rejected, or changed, and why>
- **Used for:** <post ideas drafted with it, added over time>
```

The format library is not a post file. `CLAUDE.md`'s rule against saving posts to files still applies to the drafts themselves.

### 6. Rough draft

Combine idea, format, and breakdown into a rough draft in whichever medium he wants:

- **Threads post:** 250 to 450 characters, hard ceiling 500. No title, no hashtags.
- **Thread:** connected posts, each under 500 characters, with a linking sentence between them.
- **Reel script:** spoken lines written to be said out loud, with short on-screen text or shot notes in brackets where they help. Give a rough runtime. Spoken lines follow the same voice rules as his posts.

If Glenn writes the rough draft himself (better), edit his words lightly to fit the format. Don't rewrite them.

### 7. Final draft

Run the three passes from `CLAUDE.md` before output: humanizer, structural-humanizer, read-aloud test. A borrowed format is exactly where a post starts sounding constructed, so the read-aloud test matters most here. If the format is making the post sound like the original creator instead of Glenn, loosen the format.

Output the final draft directly in the response. Add one line naming the format used. Then, in the format library, add the idea to that format's "Used for" line.

### 8. Repurpose (on request)

Offer this, don't do it by default:

- **Carousel:** split the post or script into slides, one idea per slide, short enough to read in a glance. Slide 1 opens inside a specific moment like his posts do, not a title card. Give the slide text only; he does the design.
- **Post to reel script, or reel script to Threads post:** keep the idea and the beats, rewrite for the medium. A spoken line and a written sentence aren't the same length.

The original reel also suggests repurposing into X and LinkedIn posts for founders. That doesn't fit Glenn: Threads is his platform and he avoids the LinkedIn register. Skip it unless he asks.

## What not to do

- Don't copy the original's sentences, specific claims, or story. Only the structure carries over.
- Don't fill a slot with an experience Glenn hasn't described. Ask him, or leave the slot marked.
- Don't promise a format will perform. An outlier shows a format can work; it says nothing certain about the next post.
