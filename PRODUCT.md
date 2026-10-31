# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

One user: Glenn Somers (@glennsomers.jpg), a photographer in Cork who makes Instagram Reels. He uses Reel Drafts on his iPhone and his Mac about equally: ideas get captured on the phone, often dictated, and edited at either. When he films, he reads the finished script straight off the app, on the phone or Mac beside the camera.

## Product Purpose

Reel Drafts replaces "write it in Notes, then paste it into Claude". It holds every reel idea in one place, sends a draft to Claude for refining, and keeps the finished script ready to read while filming. Success: an idea goes from a rough thought to a script Glenn can say out loud without leaving the app.

## Positioning

The refine step runs Claude Code against Glenn's own GitHub repo, so it uses his knowledge base, his skills (ig-reel, brain-dump, ig-caption, the humanizer passes) and his Claude Pro plan. The output is built from his words and his rules, not a generic script generator.

## Operating Context

- Drafts are markdown files in `.claude/drafts/` of the `GlennSomers/threads` repo. The app reads and writes them through the GitHub API.
- A refine runs as a GitHub Actions workflow and takes about one to two minutes. The draft shows a refining state, then updates by itself.
- Each draft has six sections: Idea and Direction (Glenn's), Script, On-screen text, Caption and Claude's notes (Claude's, editable by Glenn).
- Draft states: idea, refining, refined, error, archived.
- Scripts include bracketed b-roll cues on their own lines. The app estimates spoken length from word count.
- Single user behind one password. Hosted on Vercel, opened from the iPhone home screen and a Mac browser.

## Capabilities and Constraints

- Stack: Next.js (App Router) in `web/`, plain CSS, no UI library. Vercel builds only when `web/` changes.
- The draft file format is shared with the refine skill and workflow. Section names and frontmatter keys must not change without updating both.
- No offline mode, no multi-user features, no publishing to Instagram.

## Brand Commitments

- Glenn's stated mission, from his knowledge base: "We keep it simple here."
- Voice: plain, direct, no hype or guru tone, no em dashes. Interface copy follows the same rules.
- Look (chosen by Glenn, 31 Oct 2026): a native Apple app feel (Notes, Reminders) mixed with Irish road signs. Native structure and controls; the road-sign world supplies colour, weight and the Read mode.

## Evidence on Hand

- `.claude/knowledge-base.md`: Glenn's voice, values and biography.
- `.claude/drafts/2026-10-31-example-culling-wedding-photos-demo.md`: the one example draft.
- No logo, app icon, photography or brand palette exists yet. Do not invent any.

## Product Principles

1. Capture beats everything. Getting an idea down must be as fast as opening Notes.
2. The script is the product. It has to read cleanly at arm's length while he's filming.
3. Glenn's words stay his. The interface makes clear which text is his and which is Claude's.
4. A quiet tool, not a content machine. No streaks, scores or growth language.

## Accessibility & Inclusion

The script view must stay readable at a distance and respect larger text settings. Both light and dark appearance are used, depending on where he's filming.
