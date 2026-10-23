#!/usr/bin/env python3
"""word_share.py - how much of a draft is the speaker's own words.

Counts each word in the draft that also appears in the brain dump (each
dump word can be used as many times as it was said). Prints the share of
draft words that came from the dump, plus the words that didn't.

Rough measure: it checks words, not phrases, so a reworded sentence built
from the same vocabulary still scores high. Use it as a floor check, then
read the draft.

Usage:
  python3 word_share.py DUMP_FILE DRAFT_FILE
"""
import re
import sys
from collections import Counter


def words(text):
    # Keep contractions together ("didn't"), normalise curly apostrophes.
    text = text.replace("’", "'").lower()
    return re.findall(r"[a-z0-9]+(?:'[a-z]+)?", text)


def main():
    if len(sys.argv) != 3:
        print(__doc__.strip())
        sys.exit(2)
    with open(sys.argv[1], encoding="utf-8") as f:
        dump = Counter(words(f.read()))
    with open(sys.argv[2], encoding="utf-8") as f:
        draft = words(f.read())
    if not draft:
        print("draft is empty")
        sys.exit(1)

    pool = dump.copy()
    kept, added = 0, []
    for w in draft:
        if pool[w] > 0:
            pool[w] -= 1
            kept += 1
        else:
            added.append(w)

    share = 100 * kept / len(draft)
    print(f"{share:.0f}% of draft words came from the brain dump ({kept}/{len(draft)})")
    print("PASS (80% or more)" if share >= 80 else "BELOW 80% - too much rewriting")
    if added:
        print("words not in the dump: " + ", ".join(sorted(set(added))))


if __name__ == "__main__":
    main()
