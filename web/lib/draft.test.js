import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseDraft,
  serializeDraft,
  slugify,
  newSlug,
  isValidSlug,
  titleFromIdea,
  wordCount,
} from "./draft.js";

const sample = `---
title: "Example: culling, fast"
status: idea
created: 2026-10-31T15:30:00Z
updated: 2026-10-31T15:30:00Z
---

## Idea

Line one: with a colon.
Line two.

## Direction

30 seconds.

## Script



## On-screen text



## Caption



## Claude's notes


`;

test("parse reads frontmatter and sections", () => {
  const d = parseDraft(sample);
  assert.equal(d.meta.title, "Example: culling, fast");
  assert.equal(d.meta.status, "idea");
  assert.equal(d.sections.Idea, "Line one: with a colon.\nLine two.");
  assert.equal(d.sections.Direction, "30 seconds.");
  assert.equal(d.sections.Script, "");
});

test("round trip is stable", () => {
  const once = serializeDraft(parseDraft(sample));
  const twice = serializeDraft(parseDraft(once));
  assert.equal(once, twice);
  assert.deepEqual(parseDraft(once), parseDraft(sample));
});

test("title with quotes survives", () => {
  const d = parseDraft(sample);
  d.meta.title = 'He said "go" — then stopped';
  const back = parseDraft(serializeDraft(d));
  assert.equal(back.meta.title, 'He said "go" — then stopped');
});

test("script with brackets and blank lines survives", () => {
  const d = parseDraft(sample);
  d.sections.Script = "Line one.\n\n[B-roll: grid]\nLine two.";
  const back = parseDraft(serializeDraft(d));
  assert.equal(back.sections.Script, d.sections.Script);
});

test("slugs", () => {
  assert.equal(slugify("Fáilte! Culling 1,800 photos"), "failte-culling-1-800-photos");
  const s = newSlug("My idea", new Date("2026-10-31T12:00:00Z"));
  assert.match(s, /^2026-10-31-my-idea-[a-z0-9]{4}$/);
  assert.ok(isValidSlug(s));
  assert.ok(!isValidSlug("../secrets"));
  assert.ok(isValidSlug(newSlug("!!!")));
});

test("title and word count helpers", () => {
  assert.equal(titleFromIdea("\n  First line \nsecond"), "First line");
  assert.equal(wordCount("One two three.\n[B-roll: ignore me]\nfour"), 4);
});
