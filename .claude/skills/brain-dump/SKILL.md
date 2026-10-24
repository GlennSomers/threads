---
name: brain-dump
description: Turn a dictated brain dump into a script or post that sounds like the speaker, following Ryan Sterling's method - edit the spoken words, don't rewrite them, keeping at least 80% of the words they actually said. Use whenever the user pastes rambling, dictated, or voice-note text, shares a voice memo or audio file, or says "brain dump", "voice note", "here's me talking it through", "I just rambled about this", or wants AI writing that actually sounds like them.
---

# Brain Dump

The one method Ryan Sterling found that gets AI to write in your voice instead of producing slop: talk the idea through, then have AI edit your spoken words rather than write its own.

Source: Ryan Sterling (@ryansterling), https://www.instagram.com/reel/Dd7GxeJSWKW/. The rules below follow the reel. His exact prompt was gated behind a comment and isn't included.

## Step 1: Brain dump with voice dictation

Use a voice dictation tool (such as Wispr Flow) and talk about the idea for at least a couple of minutes, hitting every point you want to make. Dictation is non-negotiable: the output is only in your spoken voice if the input is.

Ways in:

- **Pasted dictation:** use as is.
- **Audio file or voice memo:** transcribe it locally with the Whisper command from step 3 of the `reel-to-skill` skill, pointed at the audio file.

If the text reads like typed notes, point out that the method depends on dictation.

Save the raw dump to a scratch file for the check in step 3. Ask what the output is for (script, post, or something else) if the user hasn't said.

## Step 2: Edit, don't rewrite

Treat the brain dump as the user's spoken voice, captured with dictation. The job is an edit, not a rewrite.

- Keep their exact phrases and words wherever possible.
- **At least 80% of the result must be words they actually said.**

Allowed:

- Cut repeated points, tangents, and rambling.
- Reorder sections so the stronger ideas come earlier.
- Join fragments so a sentence makes sense out loud.

Not allowed:

- Adding facts, stories, examples, or quotes they didn't say.
- Swapping their casual words for "better" ones.
- Cleaning up their grammar.
- **Short, punchy sentences.** This is the rule the reel stresses most.

## Step 3: Check the 80%

Save the draft to a scratch file and run:

```bash
python3 .claude/skills/brain-dump/scripts/word_share.py <dump-file> <draft-file>
```

If it's below 80%, too much was rewritten: put their words back using the list of added words it prints, then rerun. It checks words, not phrases, so also reread for rephrased sentences.

## Step 4: Output as a first draft

Output the draft with the word-share score and a line on what was cut or moved. Even with all of this, the method gets about 70 to 80% of the way. The user still checks everything and makes their own edits, so present it as a first draft.
