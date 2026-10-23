---
name: brain-dump
description: Turn Glenn's dictated brain dump into a Threads post, thread, reel script, or newsletter draft by editing his spoken words, not rewriting them. At least 80% of the final draft must be words he actually said. Use whenever Glenn pastes rambling, dictated, or voice-note text, shares a voice memo or audio file, or says "brain dump", "here's me talking it through", "voice note", "I just rambled about this", "turn this into a post", or "clean this up" on spoken-style text. Prefer this over writing from scratch whenever he has talked an idea through first.
---

# Brain Dump

Glenn talks an idea through out loud, and Claude edits the transcript into a draft that still sounds like him because it mostly is him.

Based on a reel by Ryan Sterling (@ryansterling, https://www.instagram.com/reel/Dd7GxeJSWKW/). His point: every prompt and skill he tried still produced AI slop, and the only thing that worked was starting from his own spoken words and editing them.

## Why it works

Spoken words carry the voice. The way someone drifts, doubles back, and picks plain words when they talk is exactly what the knowledge base tries to describe, and it's the part AI can't fake. So the job here is subtraction and ordering. Anything Claude writes in its own words is a place the voice can leak out.

## Step 1: Get the brain dump

Glenn should talk for at least a couple of minutes and hit every point he wants to make. Typing doesn't work the same way: typed text is already written, so it loses the spoken voice this method depends on. If he pastes something that reads like typed notes, say so and suggest dictating it instead. Still work with it if he wants.

Ways in:

- **Pasted dictation** (Wispr Flow, phone dictation, or similar): use as is.
- **Audio file or voice memo:** transcribe it locally with the Whisper command in step 3 of the `reel-to-skill` skill. Point it at the audio file instead of `reel.mp4`, and add `--language en`.

Save the raw dump to a scratch file so step 4 can measure against it. Don't put it in the repo.

## Step 2: Ask what it's for

If he hasn't said, ask: Threads post, thread, reel script, or newsletter? Use the format rules in `.claude/knowledge-base.md` (posts 250 to 450 characters with a 500 ceiling, threads as connected posts under 500 each, newsletters 1500+ characters). A two-minute dump is usually 300+ words, so a single post means cutting hard. Say that if it applies, and offer a thread instead.

## Step 3: Edit, don't rewrite

Read `.claude/knowledge-base.md` first for context on his voice. But his spoken words win over the knowledge base's style notes, because they're the real thing those notes describe.

You may:

- **Cut** repeated points, tangents, and rambling.
- **Reorder** sections so the stronger ideas come earlier.
- **Join fragments** so a sentence makes sense when read or said out loud.
- **Add punctuation** and standard capitalisation, since dictation is often unpunctuated.

You may not:

- **Add** facts, stories, examples, or quotes he didn't say. If the draft needs one, ask him for it.
- **Swap** his casual words for "better" ones.
- **Clean up** his grammar. A sentence that's a bit loose but sounds said stays loose.
- **Break** his sentences into short, punchy ones. His longer, drifting sentences are the voice. This is the rule that matters most.

At least 80% of the draft has to be his words. Joining words (and, so, which) are fine to add where fragments need connecting.

## Step 4: Check the word share

Save the draft to a scratch file and run:

```bash
python3 .claude/skills/brain-dump/scripts/word_share.py <dump-file> <draft-file>
```

If it's below 80%, too much got rewritten. Look at the words it lists as not in the dump, put his words back, and run it again. The script checks words, not phrases, so a passing score doesn't prove the sentences are his. Reread for anything rephrased.

## Step 5: The three passes, lightly

Run the passes from `CLAUDE.md` (humanizer, structural-humanizer, read-aloud test), with one change: since the words are his, the passes flag rather than rewrite. Fix only these:

- em dashes (dictation tools sometimes insert them)
- anything on the knowledge base's banned word, phrase, and AI-tell lists
- a stated lesson or moral tacked onto the end, if the edit created one by reordering

Anything else a pass catches in his own phrasing, like a "not X but Y" he actually said, goes in the note to him as a suggestion. Leave it in the draft.

## Step 6: Output

Output the draft directly in the response, per `CLAUDE.md`. Under it, add a short note:

- the word share score
- what was cut or moved, in one or two lines
- any suggestions from step 5 he might want to change himself

This gets him a first draft, 70 to 80% of the way there. He still reads it through and makes his own edits. Don't present it as finished.
