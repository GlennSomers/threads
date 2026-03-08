---
name: social-content
description: "Use when Glenn asks to write a post, thread, newsletter, or any written content. Triggers on: 'write a post', 'draft a thread', 'write a newsletter', 'write something about', 'can you write', 'help me write', 'create content', 'write content', or any request to produce written content for Glenn."
metadata:
  version: 2.0.0
---

# Glenn's Content Writing Workflow

This skill handles all content writing for Glenn — posts, threads, newsletters, or any other written output. Follow this workflow exactly, in order, every time.

---

## Step 1: Read the Knowledge Base

Before doing anything else, read `.claude/knowledge-base.md`.

Do not draft from memory of previous sessions. Always read it fresh. It contains Glenn's voice, ICA, content pillars, what to avoid, and calibration examples. Everything in the draft flows from this.

---

## Step 2: Assess the Starting Point

**If Glenn has provided a draft:**
Start from his words. Make minimal edits. Do not rebuild from scratch using knowledge base rules — his draft already has the right energy. Only adjust what is clearly off.

**If writing from scratch:**
Use the knowledge base for voice direction, not as a checklist. Write like Glenn is talking to one person he knows, not performing to an audience.

---

## Step 3: Draft

Write the content.

Keep these in mind while drafting — not as a checklist, but as the register to write from:

- Sentences just talk. They don't build to something.
- Longer sentences that drift naturally are better than short punchy ones.
- Thoughts stop when they run out, not when they've made their point.
- Self-deprecating, slightly confused endings do more work than composed observations.
- No hooks, no CTAs, no "here's what I learned", no before/after framing.
- No em dashes. No "the thing is". No "what nobody tells you".

---

## Step 4: Humanizer Pass (AI Pattern Cleanup Only)

Scan the draft for AI writing patterns and remove them. This pass is about stripping mechanical tells — it is not about adding personality or soul. Do not follow the humanizer's soul-injection instructions. Glenn's voice comes from the knowledge base, not from the humanizer's model of "good writing."

Check for and remove:
- **AI vocabulary:** pivotal, landscape, underscore, highlight, delve, foster, vibrant, testament, tapestry, showcase, crucial, key (as adjective), align with, garner
- **Em dashes** — replace with commas or rewrite the sentence
- **Rule of Three:** forced groups of three that feel assembled rather than natural
- **Negative parallelisms:** "It's not just X, it's Y" / "Not only X but Y"
- **Promotional language:** breathtaking, groundbreaking, stunning, nestled, vibrant, rich (figurative)
- **Inflated significance:** "marks a pivotal moment", "reflects a broader", "sets the stage for"
- **Superficial -ing endings:** "...highlighting the importance of", "...underscoring the need for"
- **Filler phrases:** "in order to", "due to the fact that", "it is important to note that"
- **Vague attributions:** "experts say", "studies show", "many people find"
- **Generic positive conclusions:** "exciting times ahead", "the future looks bright"

If the draft is clean, move on. Do not force changes.

---

## Step 5: Read-Aloud Test (Voice Calibration)

Read the draft aloud, or simulate doing so. Apply this test:

**Does this sound like something Glenn would say to a friend, or does it sound constructed?**

Specifically check:
- Does the ending feel like where the thought naturally ran out, or like a place that was chosen to stop?
- Is there a faint "here's where I landed" quality, even without a stated lesson?
- Does any sentence feel like it was written to land well, rather than just to say the thing?
- Is there a subtle before/after structure anywhere ("used to think X..." implying "now I know better")?
- Do any sentences feel too clean, too rhythmic, too composed for someone just talking?

If yes to any of these: strip it back. Rewrite the offending section until it sounds like Glenn thinking out loud, not performing a thought.

---

## Step 6: Output

Output the final post directly in the response. Do not write it to a file unless Glenn explicitly asks.

If the content went through meaningful revision between draft and final, briefly note what changed and why — one or two lines, not a full breakdown. If it was already clean, just output it.
