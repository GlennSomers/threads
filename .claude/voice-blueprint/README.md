# Spoken Script Workflow and Voice Blueprint

This is the process for turning Glenn's brain dumps into video scripts. Follow it every time until there is enough data in `decisions.md` and `voice-observations.md` to write a proper voice blueprint (`blueprint.md`, not written yet).

## The workflow

1. **Save the raw brain dump** word for word in `brain-dumps/YYYY-MM-DD-<slug>.md`. Never edit it.
2. **Keep Glenn's voice (brain-dump skill rules).** Keep his exact phrases, his sentence length, his tense and his swearing. At least 80% of the script must be words he said. No short, punchy fragments. Don't turn his run-on spoken sentences into written ones.
3. **Structure with the script, hook and ig skills.** Use hook-writer (context lean, interjection, snapback), viral-hook-writer, ab-hook-tester, ig-reel (hook formulas, `hookscore.py`, `beats.py`, the hook/stake/body/payoff/loop shape), going-viral (rehooks at the dips, promise then withhold), reel-scripter and series-planner. These decide **order and where the rehooks sit**. They don't decide the wording.
4. **Show the script beat by beat.** For each beat, give option A (his words, as close to verbatim as possible) and one or two variations (B, C) that reorder or lightly join his words. Label each beat with its job (hook, stake, rehook, body, payoff, loop) and say briefly why it sits there.
5. **Glenn picks** (for example "1B 2A 3C"). He may rewrite a line himself.
6. **Log every decision** in `decisions.md`: what was offered, what he picked or rejected, his reason (his words if he gave one), and the inferred reason if he didn't, marked as inferred.
7. **Update `voice-observations.md`** with patterns from the brain dump itself (his natural phrasing) and from his choices.
8. **Commit and push** in the same turn.

## How to score a spoken script

Use only these:

1. **Brain-dump word check** (`.claude/skills/brain-dump/scripts/word_share.py`): how much of the script is Glenn's own words.
2. **ig-reel timing** (`.claude/skills/ig-reel/beats.py` and `hookscore.py`): length, hook speed, the loop.
3. **Rhythm and contractions check** (from the Nathan Perdriau reel, `.claude/reel-to-skill-runs/Dd53Kb_G-sN/notes.md`): flag any run of three long lines in a row with no short one, and any formal contraction ("cannot", "do not", "I am"). Flag only. Don't rewrite his lines for it; show him and let him decide.
4. **Glenn's read-aloud.** His call is final.

Don't use the ig-human score on spoken scripts. It checks written text (digits, capital letters, sentence length spread) and can't tell how a line sounds said out loud. Decided 2026-10-24.

## To do later

Build our own spoken-script check skill once there are more scripts and picks logged. Ideas so far: lines too long for one breath, phrases that trip you up, two lines in a row starting the same way, stock phrases, share of his own words. Base it on his real picks in `decisions.md`, not guesses.

## Don't

- Don't apply straight-talk to spoken scripts unless Glenn types `/straight-talk`. Rejected on 2026-10-24 as "robotic", "a doc instead of a spoken word script".
- Don't invent facts, failures or details he didn't say. Ask for them.
- Don't swap his words for "better" ones or clean up his grammar.
