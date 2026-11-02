# Reel / TikTok / Shorts Fonts & Caption Animations — Implementation Brief for Claude

**Audience:** Claude (LLM) building an AI video editor for Glenn Somers (photography/videography educator; edits in DaVinci Resolve + Adobe; posts TikTok `@glennsomers`, IG `@glennsomers.jpg`).
**Goal:** Implement a caption + on-screen-element system that matches what high-performing short-form creators and tools (CapCut, Submagic, Opus Clip, AutoCut, VideoCaptions.AI, etc.) actually ship.
**Frame target:** `1080×1920` (9:16), 30 fps assumed unless noted.
**Rule:** Prefer **free/OFL** fonts that can ship inside the product. Paid fonts are listed with free alternatives.

---

## 1. Executive findings (sourced)

1. **Montserrat dominates.** Submagic’s April 2025 analysis of ~2M videos found **Montserrat used on 61%** of captioned videos; Rubik ~7.9%, Fira Sans Condensed ~6.5%, Gabarito ~6.3%, Poppins ~5.1% ([Submagic](https://www.submagic.co/blog/best-font-for-subtitle)).
2. **Weight + contrast beat font fashion.** Semibold/Bold+, size ~**7–9% of frame height** (~130–170 px on 1080×1920), white fill + **2–4 px black stroke** (or soft shadow / pill) matter more than picking a rare typeface ([Sycamore](https://www.sycamore.to/blog/best-fonts-for-captions-on-shorts-reels-and-tiktok), [ReelWords](https://reelwords.ai/blog/best-fonts-for-captions)).
3. **Two structural caption families:**
   - **Word-pop / Hormozi:** 1–3 words on screen; heavy uppercase sans; keyword color; scale-in ([StoryCut](https://www.storycut.com/features/hormozi-captions)).
   - **Karaoke:** full line visible; active word color/wipe/scale ([AutoCaption](https://autocaption.app/caption-styles/karaoke-captions), [VideoCaptions.AI](https://www.videocaptions.ai/caption-styles)).
4. **Creator signatures (as matched by caption tools, not official brand guidelines):**
   - Hormozi → TheBoldFont / Anton / Montserrat Black + keyword highlight ([StoryCut](https://www.storycut.com/features/hormozi-captions)).
   - MrBeast-style → Bangers / Impact / Bebas / Oswald + thick stroke + spring scale-up, used selectively for emphasis ([VideoCaptions.AI](https://www.videocaptions.ai/caption-styles/mrbeast-style)).
   - Ali Abdaal-style → Inter Bold, no outline, dim→bright active word, ~4 words/line ([FilmScribe](https://filmscribe.ai/en/caption-styles/ali-abdaal)).
   - Iman Gadzhi-style → Montserrat Light→Bold on spoken word, lowercase, white, minimal ([Submagic](https://www.submagic.co/blog/how-to-make-captions-like-iman-gadzhi)).
5. **Safe zones (ads guidance; use for organic too — platforms publish ads specs only):** keep burned-in captions **above** the bottom UI band and clear of the right action rail ([Solid Labs 2026](https://www.solidlabs.com/social-safe-zones)).

---

## 2. Font library (implement these)

### 2.1 Bold caption / impact (hooks, 1–3 words)

| Name | Style notes | Where cited | Weights to ship | License | Link | Free alt if paid |
|------|-------------|-------------|-----------------|---------|------|------------------|
| **Montserrat** | Geometric workhorse; Submagic #1 at 61% | Submagic, ReelWords, Sycamore, StoryCut Hormozi V1 | 700, 800, 900 | OFL (Google Fonts) | https://fonts.google.com/specimen/Montserrat | — |
| **Anton** | Condensed heavy single style; newer Hormozi match | StoryCut, Sycamore, AutoShorts | Regular (single) | OFL | https://fonts.google.com/specimen/Anton | — |
| **Bebas Neue** | All-caps condensed display; hooks | Sycamore, VideoCaptions.AI (MrBeast alt) | Regular | OFL | https://fonts.google.com/specimen/Bebas+Neue | — |
| **Bangers** | Comic/impact display; closest public MrBeast match per VideoCaptions.AI | VideoCaptions.AI | Regular | OFL | https://fonts.google.com/specimen/Bangers | — |
| **Oswald** | Condensed grotesque; ExtraBold for punch | VideoCaptions.AI | 600–700 | OFL | https://fonts.google.com/specimen/Oswald | — |
| **League Spartan** | Thick, loud short hooks | ReelWords | 700 | OFL | https://fonts.google.com/specimen/League+Spartan | — |
| **Fira Sans Condensed** | Submagic #3 (~6.5%); fitness/business punch | Submagic | 700 | OFL | https://fonts.google.com/specimen/Fira+Sans+Condensed | — |
| **Gabarito** | Submagic #4 (~6.25%); motivational | Submagic | 700–900 | OFL | https://fonts.google.com/specimen/Gabarito | — |
| **Barlow Condensed** | Tight UI-friendly condensed | Common CapCut/Resolve packs | 700–800 | OFL | https://fonts.google.com/specimen/Barlow+Condensed | — |
| **The Bold Font** | Older Hormozi match (Submagic); impact display | StoryCut / Submagic guides | Regular | **Paid for commercial** (personal free via foundry/DaFont era; commercial license required — [the-bold-font.com](https://the-bold-font.com/the-bold-font/)) | https://the-bold-font.com/the-bold-font/ | **Anton** or **Montserrat Black** |
| **Impact** | Meme / retro punch; Windows classic | Submagic #13; VideoCaptions.AI MrBeast alt | Regular | **Not free to redistribute** (Microsoft core font; [MS typography](https://learn.microsoft.com/en-us/typography/font-list/impact)). Do **not** bundle. | https://learn.microsoft.com/en-us/typography/font-list/impact | **Anton**, **Bangers**, **Oswald ExtraBold** |
| **Proxima Nova** | Premium brand UI (not a typical burned caption default) | Industry brand stacks | 600–800 | **Paid** (Adobe Fonts / Mark Simonson) | https://fonts.adobe.com/fonts/proxima-nova | **Montserrat**, **Inter**, **DM Sans** |
| **Komika Axis** | Comic/meme display | Occasional CapCut meme packs | Regular | Check DaFont license (often non-commercial free) | https://www.dafont.com/komika-axis.font | **Bangers** |

### 2.2 Clean sans (education, talking-head body captions)

| Name | Style notes | Where cited | Weights | License | Link |
|------|-------------|-------------|---------|---------|------|
| **Poppins** | Soft geometric; Submagic #5 (~5%); lifestyle/education | Submagic, ReelWords, Sycamore | 600–700 | OFL | https://fonts.google.com/specimen/Poppins |
| **Inter** | Screen-native; Ali Abdaal-style base | FilmScribe, ReelWords, Sycamore | 600–700 | OFL | https://fonts.google.com/specimen/Inter |
| **Rubik** | Submagic #2 (~7.9%); playful punchy | Submagic, ReelWords | 700 | OFL | https://fonts.google.com/specimen/Rubik |
| **Outfit** | Modern polished talking-head | ReelWords | 700 | OFL | https://fonts.google.com/specimen/Outfit |
| **DM Sans** | Calm premium minimal | ReelWords | 500–700 | OFL | https://fonts.google.com/specimen/DM+Sans |
| **Manrope** | Elegant explainer | ReelWords | 600–700 | OFL | https://fonts.google.com/specimen/Manrope |
| **Nunito Sans** | Friendly education / lifestyle | ReelWords | 700 | OFL | https://fonts.google.com/specimen/Nunito+Sans |
| **Archivo** | Dense info / numbers | ReelWords | 700 | OFL | https://fonts.google.com/specimen/Archivo |
| **Roboto** | Ubiquitous practical | Submagic, ReelWords | 700 | Apache 2.0 | https://fonts.google.com/specimen/Roboto |
| **Open Sans** | Accessibility-first | Sycamore | 700 | OFL | https://fonts.google.com/specimen/Open+Sans |
| **TikTok Sans** | Native TikTok UI/text look; SIL OFL 1.1 | Sycamore / TikTok | Classic, Bold, Oblique | OFL | https://fonts.google.com/specimen/TikTok+Sans |

### 2.3 Display / title (hooks, lower-thirds titles — not dense body)

| Name | Notes | Weights | License | Link |
|------|-------|---------|---------|------|
| **Bebas Neue** | See impact | Regular | OFL | https://fonts.google.com/specimen/Bebas+Neue |
| **Oswald** | See impact | 600–700 | OFL | https://fonts.google.com/specimen/Oswald |
| **Shrikhand** | Y2K / fashion / vlog (Submagic #14) | Regular | OFL | https://fonts.google.com/specimen/Shrikhand |
| **Jomhuria** | Artistic / aesthetic niches (Submagic #12) | Regular | OFL | https://fonts.google.com/specimen/Jomhuria |

### 2.4 Handwritten / accent (sparingly — titles, signatures, not body)

| Name | Notes | Weights | License | Link |
|------|-------|---------|---------|------|
| **Caveat** | Soft handwritten notes / “written on screen” | 400–700 | OFL | https://fonts.google.com/specimen/Caveat |
| **Permanent Marker** | Marker accent / callouts | Regular | Apache 2.0 | https://fonts.google.com/specimen/Permanent+Marker |
| **Pacifico** | Script accent only (avoid for moving body captions — hard to read) | Regular | OFL | https://fonts.google.com/specimen/Pacifico |

### 2.5 Serif / editorial

| Name | Notes | Weights | License | Link |
|------|-------|---------|---------|------|
| **DM Serif Display** | Storytelling titles (Submagic #6 ~3%) | Regular + Italic | OFL | https://fonts.google.com/specimen/DM+Serif+Display |
| **Playfair Display** | Premium / cinematic title cards | 700 | OFL | https://fonts.google.com/specimen/Playfair+Display |
| **Lora** | Softer editorial body (rare for burned short-form; OK for podcast quote cards) | 600–700 | OFL | https://fonts.google.com/specimen/Lora |

### 2.6 Mono

| Name | Notes | Weights | License | Link |
|------|-------|---------|---------|------|
| **Space Mono** | Tech / code / “terminal” typewriter vibe | 400–700 | OFL | https://fonts.google.com/specimen/Space+Mono |
| **JetBrains Mono** | Modern code captions | 400–700 | OFL | https://fonts.google.com/specimen/JetBrains+Mono |
| **IBM Plex Mono** | Clean documentary/tech | 400–700 | OFL | https://fonts.google.com/specimen/IBM+Plex+Mono |

### 2.7 Machine-friendly font registry (JSON)

```json
{
  "fonts": [
    {"name":"Montserrat","category":"bold_caption","license":"OFL","paid":false,"download_url":"https://fonts.google.com/specimen/Montserrat","google_fonts_family":"Montserrat","recommended_weights":[700,800,900]},
    {"name":"Anton","category":"bold_caption","license":"OFL","paid":false,"download_url":"https://fonts.google.com/specimen/Anton","google_fonts_family":"Anton","recommended_weights":[400]},
    {"name":"Bebas Neue","category":"display_title","license":"OFL","paid":false,"download_url":"https://fonts.google.com/specimen/Bebas+Neue","google_fonts_family":"Bebas Neue","recommended_weights":[400]},
    {"name":"Bangers","category":"bold_caption","license":"OFL","paid":false,"download_url":"https://fonts.google.com/specimen/Bangers","google_fonts_family":"Bangers","recommended_weights":[400]},
    {"name":"Oswald","category":"bold_caption","license":"OFL","paid":false,"download_url":"https://fonts.google.com/specimen/Oswald","google_fonts_family":"Oswald","recommended_weights":[600,700]},
    {"name":"League Spartan","category":"bold_caption","license":"OFL","paid":false,"download_url":"https://fonts.google.com/specimen/League+Spartan","google_fonts_family":"League Spartan","recommended_weights":[700]},
    {"name":"Fira Sans Condensed","category":"bold_caption","license":"OFL","paid":false,"download_url":"https://fonts.google.com/specimen/Fira+Sans+Condensed","google_fonts_family":"Fira Sans Condensed","recommended_weights":[700]},
    {"name":"Gabarito","category":"bold_caption","license":"OFL","paid":false,"download_url":"https://fonts.google.com/specimen/Gabarito","google_fonts_family":"Gabarito","recommended_weights":[700,800,900]},
    {"name":"Barlow Condensed","category":"bold_caption","license":"OFL","paid":false,"download_url":"https://fonts.google.com/specimen/Barlow+Condensed","google_fonts_family":"Barlow Condensed","recommended_weights":[700,800]},
    {"name":"Poppins","category":"clean_sans","license":"OFL","paid":false,"download_url":"https://fonts.google.com/specimen/Poppins","google_fonts_family":"Poppins","recommended_weights":[600,700]},
    {"name":"Inter","category":"clean_sans","license":"OFL","paid":false,"download_url":"https://fonts.google.com/specimen/Inter","google_fonts_family":"Inter","recommended_weights":[600,700]},
    {"name":"Rubik","category":"clean_sans","license":"OFL","paid":false,"download_url":"https://fonts.google.com/specimen/Rubik","google_fonts_family":"Rubik","recommended_weights":[700]},
    {"name":"Outfit","category":"clean_sans","license":"OFL","paid":false,"download_url":"https://fonts.google.com/specimen/Outfit","google_fonts_family":"Outfit","recommended_weights":[700]},
    {"name":"DM Sans","category":"clean_sans","license":"OFL","paid":false,"download_url":"https://fonts.google.com/specimen/DM+Sans","google_fonts_family":"DM Sans","recommended_weights":[500,700]},
    {"name":"Manrope","category":"clean_sans","license":"OFL","paid":false,"download_url":"https://fonts.google.com/specimen/Manrope","google_fonts_family":"Manrope","recommended_weights":[600,700]},
    {"name":"Nunito Sans","category":"clean_sans","license":"OFL","paid":false,"download_url":"https://fonts.google.com/specimen/Nunito+Sans","google_fonts_family":"Nunito Sans","recommended_weights":[700]},
    {"name":"Archivo","category":"clean_sans","license":"OFL","paid":false,"download_url":"https://fonts.google.com/specimen/Archivo","google_fonts_family":"Archivo","recommended_weights":[700]},
    {"name":"Roboto","category":"clean_sans","license":"Apache-2.0","paid":false,"download_url":"https://fonts.google.com/specimen/Roboto","google_fonts_family":"Roboto","recommended_weights":[700]},
    {"name":"Open Sans","category":"clean_sans","license":"OFL","paid":false,"download_url":"https://fonts.google.com/specimen/Open+Sans","google_fonts_family":"Open Sans","recommended_weights":[700]},
    {"name":"TikTok Sans","category":"clean_sans","license":"OFL","paid":false,"download_url":"https://fonts.google.com/specimen/TikTok+Sans","google_fonts_family":"TikTok Sans","recommended_weights":[400,700]},
    {"name":"Shrikhand","category":"display_title","license":"OFL","paid":false,"download_url":"https://fonts.google.com/specimen/Shrikhand","google_fonts_family":"Shrikhand","recommended_weights":[400]},
    {"name":"Jomhuria","category":"display_title","license":"OFL","paid":false,"download_url":"https://fonts.google.com/specimen/Jomhuria","google_fonts_family":"Jomhuria","recommended_weights":[400]},
    {"name":"Caveat","category":"handwritten_accent","license":"OFL","paid":false,"download_url":"https://fonts.google.com/specimen/Caveat","google_fonts_family":"Caveat","recommended_weights":[400,700]},
    {"name":"Permanent Marker","category":"handwritten_accent","license":"Apache-2.0","paid":false,"download_url":"https://fonts.google.com/specimen/Permanent+Marker","google_fonts_family":"Permanent Marker","recommended_weights":[400]},
    {"name":"Pacifico","category":"handwritten_accent","license":"OFL","paid":false,"download_url":"https://fonts.google.com/specimen/Pacifico","google_fonts_family":"Pacifico","recommended_weights":[400]},
    {"name":"DM Serif Display","category":"serif_editorial","license":"OFL","paid":false,"download_url":"https://fonts.google.com/specimen/DM+Serif+Display","google_fonts_family":"DM Serif Display","recommended_weights":[400]},
    {"name":"Playfair Display","category":"serif_editorial","license":"OFL","paid":false,"download_url":"https://fonts.google.com/specimen/Playfair+Display","google_fonts_family":"Playfair Display","recommended_weights":[700]},
    {"name":"Lora","category":"serif_editorial","license":"OFL","paid":false,"download_url":"https://fonts.google.com/specimen/Lora","google_fonts_family":"Lora","recommended_weights":[600,700]},
    {"name":"Space Mono","category":"mono","license":"OFL","paid":false,"download_url":"https://fonts.google.com/specimen/Space+Mono","google_fonts_family":"Space Mono","recommended_weights":[400,700]},
    {"name":"JetBrains Mono","category":"mono","license":"OFL","paid":false,"download_url":"https://fonts.google.com/specimen/JetBrains+Mono","google_fonts_family":"JetBrains Mono","recommended_weights":[400,700]},
    {"name":"IBM Plex Mono","category":"mono","license":"OFL","paid":false,"download_url":"https://fonts.google.com/specimen/IBM+Plex+Mono","google_fonts_family":"IBM Plex Mono","recommended_weights":[400,700]},
    {"name":"The Bold Font","category":"bold_caption","license":"commercial","paid":true,"download_url":"https://the-bold-font.com/the-bold-font/","google_fonts_family":null,"recommended_weights":[400],"free_alternative":"Anton"},
    {"name":"Proxima Nova","category":"clean_sans","license":"commercial","paid":true,"download_url":"https://fonts.adobe.com/fonts/proxima-nova","google_fonts_family":null,"recommended_weights":[600,700,800],"free_alternative":"Montserrat"},
    {"name":"Impact","category":"bold_caption","license":"microsoft-core-do-not-bundle","paid":true,"download_url":"https://learn.microsoft.com/en-us/typography/font-list/impact","google_fonts_family":null,"recommended_weights":[400],"free_alternative":"Anton"},
    {"name":"Komika Axis","category":"display_title","license":"check-dafont","paid":true,"download_url":"https://www.dafont.com/komika-axis.font","google_fonts_family":null,"recommended_weights":[400],"free_alternative":"Bangers"}
  ],
  "link_check_note": "HTTP 200 verified 2026-11-02 for all Google Fonts specimen URLs listed; Impact has no Google Fonts page (404); The Bold Font / Adobe Proxima / DaFont Komika Axis returned 200."
}
```

**Download tip for Claude:** Google Fonts “Download family” ZIP on each specimen page, or CSS API:
`https://fonts.googleapis.com/css2?family=Montserrat:wght@700;800;900&display=swap`

---

## 3. Caption styling specs (1080×1920)

### 3.1 Size

| Role | % of frame height | px @ 1920h | Notes |
|------|-------------------|------------|-------|
| Body / karaoke line | 7–9% | **134–173** | Sycamore default band |
| Hormozi punch word | 9–12% | **173–230** | Fewer words → larger |
| MrBeast emphasis | fill ~70% width with 2–3 words | often **80–120** on 1080-wide canvas in tool docs; scale up for vertical | VideoCaptions.AI |
| Ali-style calm | ~4% | **78** | FilmScribe Ali preset |
| AutoShorts Anton example | — | **145** + 5px outline | AutoShorts |

**Implementation default:** `fontSizePx = round(frameHeight * 0.08)` → **154 px**, clamp 120–180 for body; hooks may go to `0.11`.

### 3.2 Safe zones (keep captions inside)

From Solid Labs (platform ads templates / Meta prose; checked 2026-08-07). Design organic against these — conservative and correct direction.

| Platform | Top | Bottom | Left | Right | Extra |
|----------|-----|--------|------|-------|-------|
| **IG / FB Reels & Stories** | 269 (14%) | 672 (35%) | 65 (6%) | 65 (6%) | L-shape action rail on right |
| **TikTok In-Feed** | 240 (12.5%) | 660 (34.4%) | 120 | 120 → **300** lower-right rail | |
| **YT Shorts-only** | 192 (10%) | 480 (25%) | 0 | 108 (10%) | |
| **Cross-post “all three”** | **288** | **672** | **120** | **192** (300 below mid on TikTok) | Use this as product default |

**Caption placement default for Glenn’s editor:**
- Horizontal: center, max width **80%** of safe width.
- Vertical anchor: **~55–65% from top** (i.e. mid-lower but **above** bottom UI). AutoCaption karaoke places near **80% of frame height** — that is often *into* the unsafe band; prefer **y ≈ 0.58–0.68 × height** for burned captions on Reels/TikTok.
- Never put essential text in bottom **35%** if shipping one master for IG+TikTok.

### 3.3 Stroke / outline / shadow / pill

| Treatment | When | Params |
|-----------|------|--------|
| **Stroke** | Default for busy B-roll | `strokeColor=#000000`, `strokeWidth=2–4` px @1080; Hormozi/MrBeast **4–6** |
| **Outer + inner outline** | CapCut/Resolve packs (GIRAFFRAME) | Outer darker wider, inner thinner |
| **Drop shadow** | Clean footage / premium | `offsetY=3–6`, `blur=4–10`, `opacity=0.35–0.55`, color black |
| **Background pill / plate** | Chaotic footage; karaoke lines | `fill=#000000`, `opacity=0.32–0.55`, `radius=12–24`, padding `12–20` px |
| **No stroke** | Ali / Iman minimal styles | Rely on contrast or dimming |

ReelWords guidance: outline for changing brightness; shadow for clean premium; pill when clarity > aesthetics.

### 3.4 Active-word / keyword highlight

| Mode | Rest color | Active | Typical accents |
|------|------------|--------|-----------------|
| Hormozi keyword | `#FFFFFF` | `#FF6B00` / `#FFD400` / brand | One keyword per phrase |
| Karaoke wipe | `#FFFFFF` | `#FFD400` gold | AutoCaption |
| Ali dim→bright | `#FFFFFF` @ ~40% opacity | `#FFFFFF` @ 100% | No outline |
| MrBeast multi-color | white base | yellow / red / green on numbers | Selective, not every word |

### 3.5 Words-per-line / words-per-caption

| Style | Words on screen | Lines |
|-------|-----------------|-------|
| Hormozi classic | **2–3** (option: **1**) | 1 |
| MrBeast emphasis | **2–4** (vertical: **1–2**) | 1 |
| Karaoke / podcast | **4–7** | 1–2 |
| Ali education | **4** / line, max **2** lines | ≤2 |
| General default | **3–5** | ≤2 |

Break on **meaning**, avoid orphan single words (ReelWords).

### 3.6 Case, emoji, placement

- **Uppercase:** Hormozi / MrBeast / high-energy hooks.
- **Sentence / lowercase:** Ali, Iman, education, photography educator premium look.
- **Emoji:** optional pop beside keyword (Hormozi V1 / CapCut AI captions). Sync to word start; scale 0→1.15→1 over ~180–250 ms. Cap at 1 emoji per phrase unless comedy.
- **Placement:** center-mid; avoid right rail; keep clear of face if talking-head (prefer below chin or mid chest band).

---

## 4. Caption animation styles (implement as presets)

Assume **30 fps** unless noted. Durations in **ms** and **frames**. Prefer spring/overshoot over linear.
Every style below includes: description, sourced examples, a photography-niche worked beat sheet, CSS + JSON keyframes, tool mapping, and a common-mistakes line.

### Shared data model

```ts
type Word = { text: string; startMs: number; endMs: number; isKeyword?: boolean };
type CaptionPage = { words: Word[]; startMs: number; endMs: number };
type Keyframe = { t: number; props: Record<string, number|string> };
```

Word timings must come from ASR word-level timestamps. If missing, fall back to even split — karaoke becomes approximate ([AutoCaption](https://autocaption.app/caption-styles/karaoke-captions)).

---

### 4.1 Word-by-word pop (Hormozi family)

**Looks like:** Only the current 1–3 words are on screen; each scales in as spoken with optional keyword color.
**When:** Hooks, sales, high-retention talking-head — not dense explainers.
**Examples (sourced):**
- StoryCut Hormozi-style anatomy: https://www.storycut.com/features/hormozi-captions
- Submagic subtitle-font / style context: https://www.submagic.co/blog/best-font-for-subtitle
**Params:** `wordsPerPage` 2 (1–3); `enterDurationMs` 120–180; `scaleFrom` 0.6–0.8 → overshoot 1.08 → 1.0; easing spring or `cubic-bezier(0.34,1.56,0.64,1)`; opacity 0→1 in first 60ms; optional tilt ±3–6°.
**Worked example (photography):** Hook line *"Stop shooting at noon"*
- `0ms` — `STOP` pops: scale 0.7→1.08→1.0 over 150ms, white, 5px stroke
- `280ms` — `SHOOTING` pops same curve
- `620ms` — `AT` pops
- `780ms` — `NOON` pops with accent `#FF6B00` + optional sun emoji scale 0→1.15→1 in 200ms
**CSS:**
```css
@keyframes word-pop {
  0%   { transform: scale(0.7); opacity: 0; }
  70%  { transform: scale(1.08); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
.word { animation: word-pop 150ms cubic-bezier(0.34,1.56,0.64,1) both; }
```
**JSON keyframes:** `[{"t":0,"props":{"scale":0.7,"opacity":0}},{"t":0.7,"props":{"scale":1.08,"opacity":1}},{"t":1,"props":{"scale":1,"opacity":1}}]`
**Tools:** CapCut In→Pop; Resolve Text+ Follower (Word) + OutBack ([cutsio](https://cutsio.com/blog/pop-up-text-tutorial-in-davinci-resolve-text-bounce-effect)); AE Text Animator Scale + Range Selector; Premiere MOGRT / AutoCut Elastic Punch.
**Don't:** Caption every soft filler word; keep 1–3 words/page.

---

### 4.2 Karaoke highlight (color / wipe / box / bounce)

**Looks like:** Full line stays; active word changes color, grows, or gets a box/wipe.
**When:** Education, podcast clips, lyrics, lists ([AutoCaption](https://autocaption.app/caption-styles/karaoke-captions), [VideoCaptions.AI](https://www.videocaptions.ai/caption-styles)).
**Examples:**
- https://autocaption.app/caption-styles/karaoke-captions
- https://www.videocaptions.ai/caption-styles
- CapCut split-mask colour highlight write-up: https://www.capcut.com/create/animated-text-maker
**Params:** rest `#FFF`, active `#FFD400`; plate opacity 0.32; outline 2px; activeScale 1→1.08; wipe uses per-word glyph progress.
**Worked example:** *"Soft light wraps the face"* — line always visible on 32% plate; each word gold while spoken; `face` also scales 1.08.
**CSS:**
```css
@keyframes karaoke-active {
  0% { color: #fff; transform: scale(1); }
  100% { color: #FFD400; transform: scale(1.08); }
}
```
**JSON:** `{"type":"karaoke_color","activeColor":"#FFD400","activeScale":1.08,"plateOpacity":0.32}`
**Tools:** CapCut auto captions + highlight / split-mask two-layer wipe; Resolve per-word color ([TypeFlare](https://tagger.mov/typeflare/guides/animated-captions)); AE fill animator.
**Don't:** Wipe evenly across the whole line — progress must be per-word bounds.

---

### 4.3 Bounce / scale-in (elastic)

**Looks like:** Enters from below, overshoots up, settles (CapCut Bounce; GIRAFFRAME Bounce).
**When:** Lifestyle, comedy, energetic educator beats.
**Examples:**
- https://cutsio.com/blog/pop-up-text-tutorial-in-davinci-resolve-text-bounce-effect
- https://www.capcut.com/create/animated-text-maker
**Params:** 0ms y+40/scale0.9 → 300ms y−12/scale1.05 → 500ms y+4/scale0.98 → 700ms settle.
**Worked example:** *"ISO is not exposure"* — phrase bounce-in on first word; `not` turns amber at ASR start.
**CSS:**
```css
@keyframes bounce-in {
  0%   { transform: translateY(40px) scale(0.9); opacity: 0; }
  43%  { transform: translateY(-12px) scale(1.05); opacity: 1; }
  71%  { transform: translateY(4px) scale(0.98); }
  100% { transform: translateY(0) scale(1); }
}
```
**Tools:** CapCut Bounce 400–600ms; Resolve Transform Size 0→1.2→1 + Spline OutBack; AE Graph Editor.
**Don't:** Loop breathing pulse on every line — ≤30% intensity only after land.

---

### 4.4 Slide up

**Looks like:** Translates from below without big overshoot.
**When:** Softer product / calm hooks / B-roll titles.
**Examples:** https://www.capcut.com/create/animated-text-maker
**Params:** fromY +40–60px; 250–350ms; `cubic-bezier(0.22,1,0.36,1)`.
**Worked example:** *"Shot wide. Cut tight."* slides up 300ms on wide establishing B-roll.
**CSS:** `@keyframes slide-up { from { transform: translateY(48px); opacity:0 } to { transform:none; opacity:1 } }`
**Don't:** Combine large slide + heavy bounce — pick one entrance family.

---

### 4.5 Typewriter (char or word)

**Looks like:** Glyphs reveal L→R; optional caret.
**When:** Story, tech, “note being written.”
**Examples:**
- https://www.youtube.com/watch?v=3TtgmGpnNKQ
- https://www.videocaptions.ai/caption-styles
**Params:** msPerChar 20–45; cursor blink 530ms; keep enter ≤~200ms vs speech.
**Worked example:** *"f/1.8 is a choice"* at 35ms/char + typewriter SFX trimmed to end.
**CSS:** use `steps()` width grow + blinking `border-right` caret (see CapCut typewriter tutorials).
**JSON:** `{"type":"typewriter","mode":"char","msPerChar":35,"cursor":true}`
**Tools:** CapCut Typewriter / Type One; Resolve Follower delay; AE typewriter presets.
**Don't:** Run slower than speech — captions lag VO.

---

### 4.6 Fade

**Looks like:** Opacity only.
**When:** Minimal cinematic / documentary / calm photography.
**Examples:** https://elements.envato.com/learn/motion-graphics-for-short-form-video
**Params:** 0→1 over 200–400ms ease-out.
**Worked example:** *"Golden hour lasts minutes"* fades 300ms over lens-flare B-roll.
**CSS:** `@keyframes fade-in { from{opacity:0} to{opacity:1} }`
**Don't:** Fade longer titles under 400ms on-screen — unfinished on mobile.

---

### 4.7 Shake / emphasis

**Looks like:** Horizontal jitter on impact word.
**When:** Surprise / WAIT — sparingly.
**Examples:** https://www.capcut.com/create/animated-text-maker · https://videowizardtools.com/capcut-transitions-for-reels-tiktok/
**Params:** ±4–8px, ~18–24Hz, 120–220ms decay.
**Worked example:** *"WAIT — blown highlights"* — WAIT shakes 160ms.
**CSS:**
```css
@keyframes shake {
  0%,100% { transform: translateX(0); }
  20% { transform: translateX(-6px); }
  40% { transform: translateX(6px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(3px); }
}
```
**Don't:** Shake every caption — looks spammy on Reels.

---

### 4.8 Stomp / flash scale-up (MrBeast-style)

**Looks like:** All words stamp together + spring scale.
**Examples:** https://www.videocaptions.ai/caption-styles/mrbeast-style
**Params:** scale 0.8→1.05→1.0 in 300–400ms; stroke 5–6px; use on ~20–30% of runtime only (tool guidance).
**Worked example:** *"$0 lighting upgrade"* flash-scales; `$0` yellow.
**Don't:** Caption an entire tutorial in stomp style.

---

### 4.9 Color swap on keyword

**Looks like:** Fill snaps/tweens to accent on keyword start.
**Examples:** https://www.storycut.com/features/hormozi-captions
**Params:** 80–120ms tween or hard cut; one accent.
**Worked example:** *"Expose for the highlights"* — highlights → `#FFC857` in 100ms.
**Don't:** Rainbow every noun.

---

### 4.10 Box / pill highlight

**Looks like:** Rounded rect behind active word/phrase.
**Examples:** https://www.videocaptions.ai/caption-styles · https://autocaption.app/caption-styles/karaoke-captions
**Params:** pad 10–16×6–10; radius 8–16.
**Worked example:** *"ND filter first"* with green pill `#7CFF6B`.
**Don't:** Oversized pills covering eyes — keep y≈0.58–0.68.

---

### 4.11 Weight morph (Iman-style)

**Looks like:** Light→Bold on spoken word; lowercase; no outline.
**Examples:** https://www.submagic.co/blog/how-to-make-captions-like-iman-gadzhi
**Params:** 300→700 weight; ~120ms; crossfade layers if needed.
**Worked example:** *"clarity over noise"* — each spoken word boldens then returns.
**Don't:** Add bounce/stroke.

---

### 4.12 Dim → bright (Ali-style)

**Looks like:** Line dim; active word full white; little motion.
**Examples:** https://filmscribe.ai/en/caption-styles/ali-abdaal
**Params:** rest opacity 0.35–0.45; active 1.0; Inter Bold ~78px; ~4 words/line.
**Worked example:** *"Here's the histogram trick"* — histogram goes full white while spoken.
**Don't:** Pair with heavy Pop/Bounce.

## 4B. Kinetic typography & advanced text motion

Beyond captions: title slams, reveals, and effects common in high-performing short-form. Prefer OFL fonts from §2.

### 4B.1 Per-letter stagger / cascade

**Looks like:** Each letter offsets in time (cascade in/up/rotate).
**Examples:**
- Adobe AE text animators: https://www.adobe.com/products/aftereffects/text-animation.html
- Adobe Help: https://helpx.adobe.com/after-effects/desktop/animating-text/text-animation/animating-text.html
- Mike Murphy AE text animators: https://mikemurphy.ai/tutorials/textanimators/
- CapCut staggered reveal write-up: https://www.capcut.com/create/animated-text-maker
**When:** Title cards, hook phrases, brand opens — not dense body captions.
**Params:** stagger 30–60ms/letter; duration 200–350ms; fromY +24–40 or scale 0→1; ease out-back.
**Worked example:** Title `"FRAME"` — F@0, R@45, A@90, M@135, E@180ms; each scale 0→1.06→1 over 280ms.
**CSS:**
```css
.letter { display:inline-block; animation: letter-in 280ms cubic-bezier(0.34,1.56,0.64,1) both; }
.letter:nth-child(n) { animation-delay: calc(var(--i) * 45ms); }
@keyframes letter-in {
  from { transform: translateY(28px) scale(0.6); opacity: 0; }
  to   { transform: none; opacity: 1; }
}
```
**JSON:** `{"id":"letter_stagger","staggerMs":45,"durationMs":280,"from":{"y":28,"scale":0.6,"opacity":0}}`
**Tools:** AE Range Selector; Resolve Text+ Follower Character; CapCut per-letter / combo; Premiere MOGRT.
**Don't:** Stagger body captions letter-by-letter against VO — desyncs speech.

---

### 4B.2 Mask / wipe reveal

**Looks like:** Split/stripe mask reveals text L→R or along a path.
**Examples:**
- CapCut PC mask text reveal: https://www.youtube.com/watch?v=jEI0iQj7Mzc
- CapCut split-mask: https://www.capcut.com/create/animated-text-maker
- AE mask paths: https://www.adobe.com/products/aftereffects/text-animation.html
**Params:** mask travel 400–900ms; feather 4–12px; ease in-out.
**Worked example:** `"EXPOSE TO THE RIGHT"` wiped L→R in 600ms over histogram B-roll.
**CSS:** `@keyframes wipe { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }`
**Tools:** CapCut Mask→Split; AE track matte; Resolve Fusion Polygon; Premiere track matte.
**Don't:** Feather >12px on punchy titles — edges mush.

---

### 4B.3 Text behind subject (segmentation depth)

**Looks like:** Subject cutout sits above text; text lives “in” the scene.
**Examples:**
- CapCut guide: https://www.capcut.com/resource/how-to-put-text-behind-a-person-in-capcut
- Walk-past / mask tutorial: https://www.youtube.com/watch?v=jEI0iQj7Mzc
- TikTok CapCut tutorial: https://www.tiktok.com/@jera.bean/video/7379043709146533166
**Params:** layers plate → text → cutout; Auto BG remove on overlay; optional walk-past keyframed mask.
**Worked example:** Creator walks left; `"f/2.8"` mid-ground; silhouette occludes letters.
**JSON:** `{"id":"text_behind_subject","requires":["segmentation_or_auto_bg_remove"],"layers":["plate","text","cutout"]}`
**Tools:** CapCut Duplicate→Overlay→Remove BG; Resolve Magic Mask; AE Roto Brush 3; Premiere + AE.
**Don't:** Busy BG without clean edges — matte fringing kills the illusion.

---

### 4B.4 3D rotate / flip-in / perspective

**Looks like:** Text takes a 3D angle or flips into place (CapCut Flip Six / AE 3D).
**Examples:**
- CapCut Flip Six / compound perspective: https://www.capcut.com/create/animated-text-maker
- AE 3D text: https://www.adobe.com/products/aftereffects/text-animation.html
**When:** Viral title moments; match text to a wall/slope.
**Params:** rotateX/Y −60→0° over 350–600ms; freeze final angle.
**Worked example:** `"DEPTH"` flips Y 90→0 in 420ms, freezes on architecture leading line.
**CSS:** `@keyframes flip-in { from { transform: perspective(600px) rotateY(75deg); opacity:0 } to { transform: perspective(600px) rotateY(0); opacity:1 } }`
**Tools:** CapCut Flip Six + freeze; AE 3D layer; Resolve Fusion Text3D; Premiere AE.
**Don't:** Continuous spinning during VO — freeze the readable angle.

---

### 4B.5 Glitch / RGB split (text)

**Looks like:** Channel offset + short jitter on glyphs.
**Examples:**
- CapCut effects/transitions roundup (intensity guidance): https://arwriterai.com/en/blog/best-capcut-effects-transitions-boost-views-2026/
- CapCut transitions: https://www.capcut.com/tools/free-video-transitions
**Params:** RGB ±4–12px for 4–8 frames @30; intensity ~40%; 1–2 repeats.
**Worked example:** 6-frame RGB split before `"ISO 6400"` lands clean.
**CSS:**
```css
@keyframes rgb-glitch {
  0%,100% { text-shadow: none; transform: none; }
  30% { text-shadow: -3px 0 #f0f, 3px 0 #0ff; transform: translateX(2px); }
  60% { text-shadow: 3px 0 #f0f, -3px 0 #0ff; transform: translateX(-2px); }
}
```
**Don't:** Full-intensity glitch >8 frames — unreadable ([~40% guidance](https://arwriterai.com/en/blog/best-capcut-effects-transitions-boost-views-2026/)).

---

### 4B.6 Blur-in

**Looks like:** High blur → sharp.
**Examples:** https://arwriterai.com/en/blog/best-capcut-effects-transitions-boost-views-2026/ · https://www.capcut.com/tools/free-video-transitions
**Params:** blur 12–20px → 0 over 250–400ms; opacity 0.2→1.
**Worked example:** *"That first roll of Portra"* blur-in 350ms.
**CSS:** `@keyframes blur-in { from { filter: blur(14px); opacity:0.2 } to { filter:blur(0); opacity:1 } }`
**Don't:** Use on small caption sizes — never resolves on phones.

---

### 4B.7 Stretch / squash

**Looks like:** Scale X/Y inverse (cartoon anticipation) then settle.
**Examples:** CapCut Stretch & Elastic: https://www.capcut.com/create/animated-text-maker
**Params:** squash scaleX 1.25 / scaleY 0.75 for 60–90ms → overshoot inverse → 1,1 in ~200ms.
**Worked example:** `"SNAP"` squashes on land with shutter-click SFX.
**CSS:**
```css
@keyframes squash {
  0% { transform: scale(0.2, 0.2); }
  40% { transform: scale(1.25, 0.75); }
  70% { transform: scale(0.92, 1.08); }
  100% { transform: scale(1, 1); }
}
```
**Don't:** Stretch readable body captions — 1-word stamps only.

---

### 4B.8 Scramble / decode

**Looks like:** Random glyphs resolve to final letters (AE Character Offset).
**Examples:**
- https://www.youtube.com/watch?v=sx9G0hjSmMY
- https://www.youtube.com/watch?v=YZH95fn2_6o
- https://www.adobe.com/products/aftereffects/text-animation.html
**Params:** offset 20–40; Range Start 0→100% over 800–2000ms; mono font helps.
**Worked example:** `"RAW → JPG"` decodes over 1.2s (Space Mono).
**JSON:** `{"id":"scramble_decode","durationMs":1200,"charset":"ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789","tickMs":32}`
**Tools:** AE Character Offset; CapCut rapid replacements; Resolve Fusion / pre-render AE.
**Don't:** Scramble >~2s on mobile.

---

### 4B.9 Highlighter / marker stroke

**Looks like:** Semi-transparent marker draws behind/over a phrase.
**Examples:** https://www.videocaptions.ai/caption-styles · CapCut glow/shine stripe: https://www.capcut.com/create/animated-text-maker
**Params:** stroke ~120% of x-height; 300–600ms; `#FFE600` @ 0.55 alpha.
**Worked example:** Under `"white balance"` marker draws in 450ms.
**CSS:** animate `background-size` 0→100% on a padding box.
**Don't:** Opaque highlighter — keep ≤0.6 alpha.

---

### 4B.10 Underline draw

**Looks like:** Path length 0→100% under a word.
**Examples:** AE stroke/reveal: https://www.adobe.com/products/aftereffects/text-animation.html · CapCut outline/brush: https://www.capcut.com/create/animated-text-maker
**Params:** 250–500ms; thickness 3–6px; accent; ease-out.
**Worked example:** `"manual focus"` underline completes as peaking flashes in VO.
**CSS:**
```css
@keyframes underline {
  from { background-size: 0% 3px; }
  to   { background-size: 100% 3px; }
}
.u {
  background-image: linear-gradient(#FFC857,#FFC857);
  background-position: 0 100%; background-repeat: no-repeat;
  animation: underline 400ms ease-out forwards;
}
```
**Don't:** Underline every line — one keyword max per page.

---

### 4B.11 Word swap / morph

**Looks like:** Word A exits as Word B enters in same slot.
**Examples:** CapCut kinetic templates: https://www.capcut.com/explore/template-kinetic-typography/7497635722376497168 · Envato: https://elements.envato.com/learn/motion-graphics-for-short-form-video
**Params:** fixed slot; A out 120–180ms; B in 150–220ms; optional mid blur 8px.
**Worked example:** Slot cycles `auto` → `aperture` → `shutter` → `ISO` (180ms swaps).
**JSON:** `{"id":"word_swap","slot":"center","outMs":150,"inMs":180,"words":["auto","aperture","shutter","ISO"]}`
**Don't:** Swap mid-phoneme — cut on word boundaries / beats.

---

### 4B.12 Scale-to-fill title slam

**Looks like:** Word scales from ~0.3 to filling safe width with impact.
**Examples:** https://www.videocaptions.ai/caption-styles/mrbeast-style · https://elements.envato.com/learn/motion-graphics-for-short-form-video
**Params:** 200–350ms; scale 0.3→1.05→1; whoosh −80ms + hit on land.
**Worked example:** `"SHARP"` slams to ~86% frame width at tip climax.
**Don't:** Fill past safe sides ([Solid Labs](https://www.solidlabs.com/social-safe-zones)).

---

### 4B.13 Counter / number roll

**Looks like:** Digits tick from 0 (or prior) to target.
**Examples:** Number emphasis in MrBeast-style tooling: https://www.videocaptions.ai/caption-styles/mrbeast-style
**Params:** 600–1200ms; ease-out expo; tabular figures; optional commas.
**Worked example:** `"ISO "` + roll `100 → 6400` in 900ms.
**JSON:** `{"id":"number_roll","from":100,"to":6400,"durationMs":900,"ease":"cubic-bezier(0.16,1,0.3,1)"}`
**Don't:** Finish the roll before the number is spoken.

---

### 4B.14 Tracking zoom / zoom-through text

**Looks like:** Dolly so viewer passes through a giant letterform.
**Examples:** https://arwriterai.com/en/blog/best-capcut-effects-transitions-boost-views-2026/ · https://elements.envato.com/learn/motion-graphics-for-short-form-video
**Params:** scale 1→8–12 over 500–900ms; opacity falloff after 60%; match-cut at peak.
**Worked example:** Giant `"GO"` — zoom through O into walking-to-location B-roll.
**Don't:** Zoom-through on small captions — needs display sizes.

---

### 4B.15 Handwriting write-on

**Looks like:** Script strokes appear as if handwritten.
**Examples:** CapCut handwriting / Spatter Stroke: https://www.capcut.com/resource/create-handwritten-animation
**Params:** Caveat (etc.); 1.0–2.5s; optional chalk SFX.
**Worked example:** Side note `"watch the edges"` writes on in 1.4s near a crop.
**Tools:** CapCut handwriting / Spatter Stroke; AE stroke on path; Resolve Fusion paint; Premiere AE.
**Don't:** Use for full VO captions — accent notes only (§2.4).

## 5. Element animations (non-caption)

### 5.1 Emoji / sticker pop
**Looks like:** Emoji scales in beside a keyword.
**Examples:** https://www.storycut.com/features/hormozi-captions · https://www.capcut.com/create/animated-text-maker
**Params:** scale 0→1.2→1 in 180–250ms; optional ±8°; SFX pop at peak.
**Worked example:** On `"noon"` → sun emoji pops 200ms after word start.
**CSS:** `@keyframes pop { 0%{transform:scale(0)} 70%{transform:scale(1.2)} 100%{transform:scale(1)} }`
**Don't:** Emoji spam every line — ≤1 per phrase for educator tone.

### 5.2 Zoom punch-in
**Looks like:** Footage scale 1.0→1.08–1.15 on emphasis.
**Examples:** Keyframed zoom guidance: https://arwriterai.com/en/blog/best-capcut-effects-transitions-boost-views-2026/
**Params:** 200–350ms ease-out; hold; optional return; center on face/subject.
**Worked example:** Punch to eyes when saying `"catchlight"`.
**Don't:** Drift into UI — keep subject clear of right rail.

### 5.3 Ken Burns (stills)
**Looks like:** Slow scale+pan on a photo.
**Examples:** CapCut Ken Burns workflow: https://github.com/renezander030/capcut-cli/blob/master/skills/capcut-edit/references/workflows.md · Zoom 100→115%: https://arwriterai.com/en/blog/best-capcut-effects-transitions-boost-views-2026/
**Params:** 1.0→1.15–1.2 over 2.5–4s; pan ±5–15%; ease in-out.
**Worked example:** Portfolio still zooms into subject's eye over 3s while VO explains focus.
**JSON:** `{"id":"ken_burns","scaleFrom":1.0,"scaleTo":1.18,"panX":[0,-0.08],"durationMs":3000}`
**Don't:** Fast Ken Burns on every still — keep ≤1 dominant move axis.

### 5.4 Speed ramps
**Looks like:** Clip speed 0.5×→2× around an action beat.
**Examples:** https://arwriterai.com/en/blog/best-capcut-effects-transitions-boost-views-2026/
**Params:** ramp window 8–20 frames; pair bass/snare; optical flow if available.
**Worked example:** Ramp into shutter press, freeze 2 frames on click, resume.
**Don't:** Ramp spoken talking-head — pitch artifacts; B-roll/action only.

### 5.5 Shape callouts (arrows / circles)
**Looks like:** Circle stroke draws around a detail; arrow slides to target.
**Examples:** Envato short-form MG: https://elements.envato.com/learn/motion-graphics-for-short-form-video
**Params:** circle path 400–600ms; pulse 1→1.05; arrow 250ms + bounce.
**Worked example:** Circle peaking zebra stripes on LCD when saying `"blinkies"`.
**CSS:** stroke-dashoffset 100%→0 over 500ms.
**Don't:** Callout + caption stacking in same band — offset vertically.

### 5.6 Progress bars
**Looks like:** Thin bar filling by elapsed/total.
**Params:** y≈0.52–0.55; height 6–10px; linear width.
**Worked example:** 15s tip timer under `"3 fixes for soft images"`.
**Don't:** Put bar in bottom 35% — Reels UI collision ([Solid Labs](https://www.solidlabs.com/social-safe-zones)).

### 5.7 Lower thirds
**Looks like:** Name/title plate slides from left.
**Examples:** Envato short-form: https://elements.envato.com/learn/motion-graphics-for-short-form-video
**Params:** x −40%→0 in 300ms; out 200ms; Bebas title + Inter name; accent bar 4–6px.
**Worked example:** `GLENN SOMERS` / `Photography educator` at tip start.
**Don't:** Lower-third in TikTok bottom caption band — raise to mid-lower.

### 5.8 B-roll / image cards
**Looks like:** Rounded card scales 0.92→1 + fade.
**Params:** 250ms in; shadow; radius 16–24; exit fade 150ms.
**Worked example:** Before/after exposure cards on `"fix the curve"`.
**Don't:** Full-bleed stills without Ken Burns — feel dead on mobile.

### 5.9 Split screens
**Looks like:** 50/50 or 30/70 comparison.
**Examples:** https://arwriterai.com/en/blog/best-capcut-effects-transitions-boost-views-2026/
**Params:** wipe divider 200–300ms; tiny Bebas labels.
**Worked example:** Left `SOOC` / right `Edited`.
**Don't:** Tiny text in each pane — 2–3 words max.

### 5.10 Screenshot / tweet / UI pop-ins
**Looks like:** Phone/UI card springs in from bottom or scale.
**Params:** y +80→0 / scale 0.85→1 over 320ms; soft shadow.
**Worked example:** IG insights screenshot pops while discussing saves.
**Don't:** Leave UI chrome covering captions — dim or crop chrome.

### 5.11 Map / route lines
**Looks like:** Stroke draws a path on a map still.
**Params:** path 0→100% over 800–1600ms; pulse dot at tip.
**Worked example:** Route studio→golden-hour overlook.
**Don't:** Tiny street labels — hide map UI; path + 1–2 pins only.

### 5.12 Light leaks / flash frames
**Looks like:** 1–2 frame white flash or warm leak at cut.
**Examples:** https://arwriterai.com/en/blog/best-capcut-effects-transitions-boost-views-2026/ · https://neuvo.co/viral-instagram-reel-transition-techniques/ · https://videowizardtools.com/capcut-transitions-for-reels-tiktok/
**Params:** flash 1–3 frames white @ 0.7–1.0; leak 200–400ms warm soft-light.
**Worked example:** 2-frame flash into first B-roll after hook.
**Don't:** Default 15-frame flash — shorten hard.

### 5.13 Glitch transitions
**Looks like:** RGB/distort between clips.
**Examples:** https://neuvo.co/viral-instagram-reel-transition-techniques/ · https://www.capcut.com/tools/free-video-transitions · https://arwriterai.com/en/blog/best-capcut-effects-transitions-boost-views-2026/
**Params:** 4–10 frames; intensity ~40%; electronic hit.
**Worked example:** Glitch into `"mirrorless vs DSLR"` title.
**Don't:** Stack glitch + shake + flash — pick one accent.

### 5.14 Whip / swipe transitions
**Looks like:** Directional motion blur hides the cut.
**Examples:** https://neuvo.co/viral-instagram-reel-transition-techniques/ · https://videowizardtools.com/capcut-transitions-for-reels-tiktok/
**Params:** match exit/enter pan direction; whoosh; CapCut Motion whip.
**Worked example:** Whip studio talk → on-location wide.
**Don't:** Whip without matching motion vectors.

### 5.15 Camera shake
**Looks like:** Position noise on impact.
**Examples:** https://videowizardtools.com/capcut-transitions-for-reels-tiktok/
**Params:** 120–250ms; amplitude 6–14px decaying.
**Worked example:** Shake when dropping a heavy light stand (comedy).
**Don't:** Continuous shake under speech.

### 5.16 Masks / shape reveals (footage)
**Looks like:** Circle/rect expands to reveal next clip.
**Examples:** https://www.capcut.com/tools/free-video-transitions · https://videowizardtools.com/capcut-transitions-for-reels-tiktok/
**Params:** 300–500ms; feather 0–8; center on subject.
**Worked example:** Aperture-iris circle wipe into lens close-up.
**Don't:** Slow 1s+ reveals on hooks — burns first-second retention.

### 5.17 Retro UI frames (REC / camera HUD) — photography niche
**Looks like:** Fake camcorder chrome: REC •, timecode, battery, focus box, exposure readout.
**Examples:** Build from shapes + mono text (Space Mono / JetBrains Mono §2.6). Motion principles: https://elements.envato.com/learn/motion-graphics-for-short-form-video
**Params:** corner brackets 2–3px; blinking REC 1s duty; timecode ticks; safe inset 48px; opacity 0.85.
**Worked example:** Overlay on `"what the camera sees"` — REC + `ISO6400 1/40 f/1.8` matching VO.
**JSON:** `{"id":"camera_hud","elements":["rec_blink","timecode","battery","af_box","exposure_readout"],"font":"Space Mono"}`
**Don't:** Cover subject face with AF box forever — 2–4s motif then clear for captions.

### 5.18 Sound-effect sync matrix
| Event | SFX | Offset | Context |
|-------|-----|--------|---------|
| Word pop / bounce land | pop / tick | 0–+40ms from peak | CapCut SFX; StoryCut-style |
| Stomp / title slam | whoosh + hit | whoosh −80ms, hit at land | Transition pairing |
| Zoom punch | short whoosh | zoom start | arwriterai CapCut guide |
| Whip | whoosh/riser | center of blur | Neuvo |
| Glitch | digital hit | first glitch frame | Neuvo / CapCut |
| Emoji | pop | emoji peak | caption tools |
| Typewriter | key clicks | per char / trim to end | YT CapCut typewriter |
Keep SFX −12 to −18 LUFS under VO; duck if needed.
**Don't:** Layer 3+ SFX on one beat.

### 5.19 Caption-page transitions
Hard cut on word boundary (Hormozi); crossfade 2–4 frames (Ali/Iman); avoid long dissolves on punch styles.

## 6. Motion principles (generalise these)

### 6.1 Easing vocabulary (CSS cubic-bezier)
| Name | cubic-bezier | Use |
|------|--------------|-----|
| Linear | `0,0,1,1` | Progress bars, clocks |
| Ease-out (smooth land) | `0.22,1,0.36,1` | Slides, most UI |
| Ease-in (accelerate away) | `0.55,0,1,0.45` | Exits |
| Ease-in-out | `0.45,0,0.55,1` | Ken Burns |
| Emphasized decelerate | `0.16,1,0.3,1` | Number rolls |
| Overshoot / back | `0.34,1.56,0.64,1` | Pops, stickers |
Spring alternative: stiffness 300–500, damping 16–22 (pop); lower stiffness for bigger mass.

### 6.2 Anticipation & overshoot
Anticipate: tiny move opposite (scale 0.96 or y+6) for 40–80ms, then main action. Overshoot 4–12% then settle. CapCut Elastic / AE Graph Editor / Resolve OutBack ([cutsio](https://cutsio.com/blog/pop-up-text-tutorial-in-davinci-resolve-text-bounce-effect)).

### 6.3 Stagger
Letters 30–60ms; words 50–120ms; list rows 80–150ms. Total cascade should finish before the next spoken idea.

### 6.4 Timing to beat / BPM
`beatMs = 60000 / BPM`. Snap emphasis (slam, flash, punch) to beat grid; captions still follow ASR first — beat-snap only when music-led. At 120 BPM, beat = 500ms; eighth = 250ms.

### 6.5 Frame-rate conversion
| fps | 100ms | 150ms | 300ms | 1s |
|-----|-------|-------|-------|----|
| 24 | 2.4f → 2–3 | 3.6 → 4 | 7.2 → 7 | 24 |
| 30 | 3 | 4.5 → 4–5 | 9 | 30 |
| 60 | 6 | 9 | 18 | 60 |
Author in ms; round to frames at export. Flash frames: **2 frames @30 ≈ 67ms**; at 60 use 3–4 frames for similar feel.

### 6.6 Motion density limits
Envato short-form: animation should pull attention then get out of the way; no rapid flicker that turns words into texture ([Envato](https://elements.envato.com/learn/motion-graphics-for-short-form-video)). Practical caps:
- ≤1 entrance family per caption page
- ≤1 element accent (emoji **or** callout **or** punch) per beat
- Glitch/flash/shake: ≤1 per 3–5s
- Keep captions readable twice on-screen ([Envato](https://elements.envato.com/learn/motion-graphics-for-short-form-video))

## 7. Style presets (JSON specs)

```json
{
  "presets": [
    {
      "id": "hormozi",
      "label": "Hormozi-style",
      "font": {
        "family": "Anton",
        "weight": 400,
        "fallback": "Montserrat",
        "fallbackWeight": 900
      },
      "case": "upper",
      "fontSizePx": 170,
      "color": "#FFFFFF",
      "accentColor": "#FF6B00",
      "stroke": {
        "color": "#000000",
        "width": 5
      },
      "shadow": {
        "x": 0,
        "y": 4,
        "blur": 0,
        "opacity": 0.45
      },
      "background": null,
      "wordsPerPage": 2,
      "maxLines": 1,
      "animation": {
        "type": "word_pop",
        "durationMs": 150,
        "scaleFrom": 0.7,
        "overshoot": 1.08
      },
      "elementHooks": [
        "emoji_pop"
      ],
      "exampleLine": "Stop shooting at noon",
      "exampleBeat": "STOP@0 pop \u2192 SHOOTING@280 \u2192 AT@620 \u2192 NOON@780 accent+sun emoji",
      "exampleLinks": [
        "https://www.storycut.com/features/hormozi-captions"
      ],
      "keywordMode": "color",
      "emoji": true,
      "placement": {
        "x": 0.5,
        "y": 0.62,
        "anchor": "center"
      }
    },
    {
      "id": "mrbeast",
      "label": "MrBeast-style",
      "font": {
        "family": "Bangers",
        "weight": 400,
        "alts": [
          "Bebas Neue",
          "Oswald"
        ]
      },
      "case": "upper",
      "fontSizePx": 160,
      "color": "#FFFFFF",
      "accentColor": "#FFE600",
      "stroke": {
        "color": "#000000",
        "width": 6
      },
      "wordsPerPage": 3,
      "maxLines": 1,
      "animation": {
        "type": "flash_scale",
        "durationMs": 350,
        "scaleFrom": 0.8,
        "overshoot": 1.05
      },
      "elementHooks": [
        "title_slam",
        "number_roll",
        "flash_frame"
      ],
      "exampleLine": "$0 lighting upgrade",
      "exampleBeat": "Whole phrase flash-scale 350ms; $0 yellow; optional number_roll on 0",
      "exampleLinks": [
        "https://www.videocaptions.ai/caption-styles/mrbeast-style"
      ],
      "keywordMode": "multicolor",
      "usageHint": "emphasis_only_20_to_30_percent",
      "placement": {
        "x": 0.5,
        "y": 0.5,
        "anchor": "center"
      }
    },
    {
      "id": "karaoke_gold",
      "label": "Karaoke gold",
      "font": {
        "family": "Montserrat",
        "weight": 800
      },
      "case": "sentence",
      "fontSizePx": 140,
      "color": "#FFFFFF",
      "accentColor": "#FFD400",
      "stroke": {
        "color": "#000000",
        "width": 2
      },
      "background": {
        "color": "#000000",
        "opacity": 0.32,
        "radius": 16,
        "padding": 14
      },
      "wordsPerPage": 6,
      "maxLines": 2,
      "animation": {
        "type": "karaoke_color",
        "submode": "wipe_or_color"
      },
      "elementHooks": [
        "progress_bar"
      ],
      "exampleLine": "Soft light wraps the face",
      "exampleBeat": "Full line plate; each word gold while spoken; face scales 1.08",
      "exampleLinks": [
        "https://autocaption.app/caption-styles/karaoke-captions",
        "https://www.videocaptions.ai/caption-styles"
      ],
      "placement": {
        "x": 0.5,
        "y": 0.64,
        "anchor": "center"
      }
    },
    {
      "id": "ali_abdaal",
      "label": "Ali Abdaal-style (education)",
      "font": {
        "family": "Inter",
        "weight": 700
      },
      "case": "sentence",
      "fontSizePx": 78,
      "color": "#FFFFFF",
      "restOpacity": 0.4,
      "activeOpacity": 1.0,
      "stroke": null,
      "wordsPerPage": 8,
      "wordsPerLine": 4,
      "maxLines": 2,
      "animation": {
        "type": "dim_to_bright"
      },
      "elementHooks": [
        "underline_draw"
      ],
      "exampleLine": "Here's the histogram trick",
      "exampleBeat": "Line dim 0.4; histogram \u2192 opacity 1.0 while spoken; optional underline 400ms",
      "exampleLinks": [
        "https://filmscribe.ai/en/caption-styles/ali-abdaal"
      ],
      "placement": {
        "x": 0.5,
        "y": 0.7,
        "anchor": "center"
      }
    },
    {
      "id": "iman_gadzhi",
      "label": "Iman Gadzhi-style (premium minimal)",
      "font": {
        "family": "Montserrat",
        "restWeight": 300,
        "activeWeight": 700
      },
      "case": "lower",
      "fontSizePx": 120,
      "color": "#FFFFFF",
      "stroke": null,
      "wordsPerPage": 5,
      "maxLines": 2,
      "animation": {
        "type": "weight_morph",
        "durationMs": 120
      },
      "elementHooks": [
        "fade"
      ],
      "exampleLine": "clarity over noise",
      "exampleBeat": "Each spoken word 300\u2192700 weight in 120ms; no outline",
      "exampleLinks": [
        "https://www.submagic.co/blog/how-to-make-captions-like-iman-gadzhi"
      ],
      "placement": {
        "x": 0.5,
        "y": 0.66,
        "anchor": "center"
      }
    },
    {
      "id": "minimal_cinematic",
      "label": "Minimal cinematic",
      "font": {
        "family": "DM Sans",
        "weight": 600
      },
      "case": "sentence",
      "fontSizePx": 110,
      "color": "#F5F5F5",
      "stroke": null,
      "shadow": {
        "x": 0,
        "y": 2,
        "blur": 8,
        "opacity": 0.5
      },
      "wordsPerPage": 5,
      "maxLines": 2,
      "animation": {
        "type": "fade",
        "durationMs": 300
      },
      "elementHooks": [
        "ken_burns",
        "light_leak"
      ],
      "exampleLine": "Golden hour lasts minutes",
      "exampleBeat": "Fade 300ms over slow Ken Burns still; optional warm leak on cut",
      "exampleLinks": [
        "https://elements.envato.com/learn/motion-graphics-for-short-form-video"
      ],
      "placement": {
        "x": 0.5,
        "y": 0.72,
        "anchor": "center"
      }
    },
    {
      "id": "podcast_clip",
      "label": "Podcast clip",
      "font": {
        "family": "Inter",
        "weight": 700
      },
      "case": "sentence",
      "fontSizePx": 130,
      "color": "#FFFFFF",
      "accentColor": "#7CFF6B",
      "stroke": {
        "color": "#000000",
        "width": 3
      },
      "background": {
        "color": "#000000",
        "opacity": 0.4,
        "radius": 20,
        "padding": 16
      },
      "wordsPerPage": 7,
      "maxLines": 2,
      "animation": {
        "type": "karaoke_color",
        "submode": "background_box"
      },
      "elementHooks": [
        "lower_third",
        "screenshot_pop"
      ],
      "exampleLine": "ND filter first",
      "exampleBeat": "Karaoke box highlight; lower third nameplate at open",
      "exampleLinks": [
        "https://autocaption.app/caption-styles/karaoke-captions"
      ],
      "speakerColors": true,
      "placement": {
        "x": 0.5,
        "y": 0.6,
        "anchor": "center"
      }
    },
    {
      "id": "photography_educator",
      "label": "Photography educator (Glenn default candidate)",
      "font": {
        "family": "Montserrat",
        "weight": 700,
        "titleFamily": "Bebas Neue"
      },
      "case": "sentence",
      "fontSizePx": 135,
      "color": "#FFFFFF",
      "accentColor": "#FFC857",
      "stroke": {
        "color": "#000000",
        "width": 3
      },
      "shadow": {
        "x": 0,
        "y": 3,
        "blur": 6,
        "opacity": 0.4
      },
      "wordsPerPage": 4,
      "maxLines": 2,
      "animation": {
        "type": "bounce",
        "durationMs": 450,
        "overshootYpx": 12,
        "scalePeak": 1.05
      },
      "keywordMode": "color",
      "emoji": false,
      "elements": {
        "zoomPunchOnKeyword": {
          "scale": 1.1,
          "durationMs": 280
        },
        "calloutCircle": true,
        "cameraHudOptional": true
      },
      "elementHooks": [
        "zoom_punch",
        "callout_circle",
        "camera_hud",
        "ken_burns"
      ],
      "exampleLine": "Expose for the highlights",
      "exampleBeat": "Bounce-in 450ms; highlights\u2192amber; zoom punch 1.1\u00d7; optional circle on zebra",
      "exampleLinks": [
        "https://www.capcut.com/resource/how-to-put-text-behind-a-person-in-capcut",
        "https://cutsio.com/blog/pop-up-text-tutorial-in-davinci-resolve-text-bounce-effect",
        "https://elements.envato.com/learn/motion-graphics-for-short-form-video"
      ],
      "placement": {
        "x": 0.5,
        "y": 0.63,
        "anchor": "center"
      },
      "safeZonePreset": "cross_post_all_three"
    }
  ]
}
```

## 8. Machine-readable animation registry

```json
{
  "version": 2,
  "frameDefaultFps": 30,
  "animations": [
    {
      "id": "word_pop",
      "name": "Word-by-word pop",
      "category": "text",
      "easing": "cubic-bezier(0.34,1.56,0.64,1)",
      "params": {
        "durationMs": 150,
        "scaleFrom": 0.7,
        "overshoot": 1.08
      },
      "keyframes": [
        {
          "t": 0,
          "props": {
            "scale": 0.7,
            "opacity": 0
          }
        },
        {
          "t": 0.7,
          "props": {
            "scale": 1.08,
            "opacity": 1
          }
        },
        {
          "t": 1,
          "props": {
            "scale": 1,
            "opacity": 1
          }
        }
      ],
      "sfx": [
        "pop"
      ],
      "exampleLine": "Stop shooting at noon",
      "exampleLinks": [
        "https://www.storycut.com/features/hormozi-captions"
      ]
    },
    {
      "id": "karaoke_color",
      "name": "Karaoke highlight",
      "category": "text",
      "easing": "linear",
      "params": {
        "activeColor": "#FFD400",
        "activeScale": 1.08,
        "plateOpacity": 0.32
      },
      "keyframes": [],
      "sfx": [],
      "exampleLine": "Soft light wraps the face",
      "exampleLinks": [
        "https://autocaption.app/caption-styles/karaoke-captions"
      ]
    },
    {
      "id": "bounce",
      "name": "Bounce elastic",
      "category": "text",
      "easing": "cubic-bezier(0.34,1.56,0.64,1)",
      "params": {
        "durationMs": 700
      },
      "keyframes": [
        {
          "t": 0,
          "props": {
            "y": 40,
            "scale": 0.9,
            "opacity": 0
          }
        },
        {
          "t": 0.43,
          "props": {
            "y": -12,
            "scale": 1.05,
            "opacity": 1
          }
        },
        {
          "t": 0.71,
          "props": {
            "y": 4,
            "scale": 0.98
          }
        },
        {
          "t": 1,
          "props": {
            "y": 0,
            "scale": 1
          }
        }
      ],
      "sfx": [
        "pop"
      ],
      "exampleLine": "ISO is not exposure",
      "exampleLinks": [
        "https://cutsio.com/blog/pop-up-text-tutorial-in-davinci-resolve-text-bounce-effect"
      ]
    },
    {
      "id": "slide_up",
      "name": "Slide up",
      "category": "text",
      "easing": "cubic-bezier(0.22,1,0.36,1)",
      "params": {
        "durationMs": 300,
        "fromY": 48
      },
      "keyframes": [
        {
          "t": 0,
          "props": {
            "y": 48,
            "opacity": 0
          }
        },
        {
          "t": 1,
          "props": {
            "y": 0,
            "opacity": 1
          }
        }
      ],
      "sfx": [],
      "exampleLine": "Shot wide. Cut tight.",
      "exampleLinks": [
        "https://www.capcut.com/create/animated-text-maker"
      ]
    },
    {
      "id": "typewriter",
      "name": "Typewriter",
      "category": "text",
      "easing": "steps",
      "params": {
        "msPerChar": 35,
        "cursor": true
      },
      "keyframes": [],
      "sfx": [
        "typewriter"
      ],
      "exampleLine": "f/1.8 is a choice",
      "exampleLinks": [
        "https://www.youtube.com/watch?v=3TtgmGpnNKQ"
      ]
    },
    {
      "id": "fade",
      "name": "Fade",
      "category": "text",
      "easing": "ease-out",
      "params": {
        "durationMs": 300
      },
      "keyframes": [
        {
          "t": 0,
          "props": {
            "opacity": 0
          }
        },
        {
          "t": 1,
          "props": {
            "opacity": 1
          }
        }
      ],
      "sfx": [],
      "exampleLine": "Golden hour lasts minutes",
      "exampleLinks": [
        "https://elements.envato.com/learn/motion-graphics-for-short-form-video"
      ]
    },
    {
      "id": "shake",
      "name": "Shake",
      "category": "text",
      "easing": "linear",
      "params": {
        "durationMs": 160,
        "amplitudePx": 6
      },
      "keyframes": [],
      "sfx": [
        "impact"
      ],
      "exampleLine": "WAIT \u2014 blown highlights",
      "exampleLinks": [
        "https://www.capcut.com/create/animated-text-maker"
      ]
    },
    {
      "id": "flash_scale",
      "name": "Stomp / flash scale",
      "category": "text",
      "easing": "cubic-bezier(0.34,1.56,0.64,1)",
      "params": {
        "durationMs": 350,
        "scaleFrom": 0.8,
        "overshoot": 1.05
      },
      "keyframes": [
        {
          "t": 0,
          "props": {
            "scale": 0.8,
            "opacity": 0
          }
        },
        {
          "t": 0.65,
          "props": {
            "scale": 1.05,
            "opacity": 1
          }
        },
        {
          "t": 1,
          "props": {
            "scale": 1
          }
        }
      ],
      "sfx": [
        "whoosh",
        "hit"
      ],
      "exampleLine": "$0 lighting upgrade",
      "exampleLinks": [
        "https://www.videocaptions.ai/caption-styles/mrbeast-style"
      ]
    },
    {
      "id": "color_swap",
      "name": "Keyword color swap",
      "category": "text",
      "easing": "ease-out",
      "params": {
        "durationMs": 100
      },
      "keyframes": [],
      "sfx": [],
      "exampleLine": "Expose for the highlights",
      "exampleLinks": [
        "https://www.storycut.com/features/hormozi-captions"
      ]
    },
    {
      "id": "box_highlight",
      "name": "Box / pill highlight",
      "category": "text",
      "easing": "ease-out",
      "params": {
        "padX": 12,
        "padY": 8,
        "radius": 12
      },
      "keyframes": [],
      "sfx": [],
      "exampleLine": "ND filter first",
      "exampleLinks": [
        "https://www.videocaptions.ai/caption-styles"
      ]
    },
    {
      "id": "weight_morph",
      "name": "Weight morph",
      "category": "text",
      "easing": "ease-out",
      "params": {
        "durationMs": 120,
        "restWeight": 300,
        "activeWeight": 700
      },
      "keyframes": [],
      "sfx": [],
      "exampleLine": "clarity over noise",
      "exampleLinks": [
        "https://www.submagic.co/blog/how-to-make-captions-like-iman-gadzhi"
      ]
    },
    {
      "id": "dim_to_bright",
      "name": "Dim to bright",
      "category": "text",
      "easing": "linear",
      "params": {
        "restOpacity": 0.4,
        "activeOpacity": 1.0
      },
      "keyframes": [],
      "sfx": [],
      "exampleLine": "Here's the histogram trick",
      "exampleLinks": [
        "https://filmscribe.ai/en/caption-styles/ali-abdaal"
      ]
    },
    {
      "id": "letter_stagger",
      "name": "Per-letter stagger",
      "category": "text",
      "easing": "cubic-bezier(0.34,1.56,0.64,1)",
      "params": {
        "staggerMs": 45,
        "durationMs": 280
      },
      "keyframes": [
        {
          "t": 0,
          "props": {
            "y": 28,
            "scale": 0.6,
            "opacity": 0
          }
        },
        {
          "t": 1,
          "props": {
            "y": 0,
            "scale": 1,
            "opacity": 1
          }
        }
      ],
      "sfx": [],
      "exampleLine": "FRAME",
      "exampleLinks": [
        "https://www.adobe.com/products/aftereffects/text-animation.html",
        "https://mikemurphy.ai/tutorials/textanimators/"
      ]
    },
    {
      "id": "mask_wipe",
      "name": "Mask / wipe reveal",
      "category": "text",
      "easing": "ease-in-out",
      "params": {
        "durationMs": 600,
        "featherPx": 8
      },
      "keyframes": [
        {
          "t": 0,
          "props": {
            "clipRight": 1
          }
        },
        {
          "t": 1,
          "props": {
            "clipRight": 0
          }
        }
      ],
      "sfx": [
        "whoosh"
      ],
      "exampleLine": "EXPOSE TO THE RIGHT",
      "exampleLinks": [
        "https://www.youtube.com/watch?v=jEI0iQj7Mzc"
      ]
    },
    {
      "id": "text_behind_subject",
      "name": "Text behind subject",
      "category": "text",
      "easing": "none",
      "params": {
        "requiresSegmentation": true
      },
      "keyframes": [],
      "sfx": [],
      "exampleLine": "f/2.8",
      "exampleLinks": [
        "https://www.capcut.com/resource/how-to-put-text-behind-a-person-in-capcut",
        "https://www.tiktok.com/@jera.bean/video/7379043709146533166"
      ]
    },
    {
      "id": "flip_3d",
      "name": "3D flip / perspective",
      "category": "text",
      "easing": "cubic-bezier(0.22,1,0.36,1)",
      "params": {
        "durationMs": 420,
        "rotateYfrom": 75
      },
      "keyframes": [
        {
          "t": 0,
          "props": {
            "rotateY": 75,
            "opacity": 0
          }
        },
        {
          "t": 1,
          "props": {
            "rotateY": 0,
            "opacity": 1
          }
        }
      ],
      "sfx": [
        "whoosh"
      ],
      "exampleLine": "DEPTH",
      "exampleLinks": [
        "https://www.capcut.com/create/animated-text-maker",
        "https://www.adobe.com/products/aftereffects/text-animation.html"
      ]
    },
    {
      "id": "glitch_rgb_text",
      "name": "Glitch RGB text",
      "category": "text",
      "easing": "linear",
      "params": {
        "frames": 6,
        "offsetPx": 6,
        "intensity": 0.4
      },
      "keyframes": [],
      "sfx": [
        "glitch"
      ],
      "exampleLine": "ISO 6400",
      "exampleLinks": [
        "https://arwriterai.com/en/blog/best-capcut-effects-transitions-boost-views-2026/"
      ]
    },
    {
      "id": "blur_in",
      "name": "Blur-in",
      "category": "text",
      "easing": "ease-out",
      "params": {
        "durationMs": 350,
        "blurFromPx": 14
      },
      "keyframes": [
        {
          "t": 0,
          "props": {
            "blur": 14,
            "opacity": 0.2
          }
        },
        {
          "t": 1,
          "props": {
            "blur": 0,
            "opacity": 1
          }
        }
      ],
      "sfx": [],
      "exampleLine": "That first roll of Portra",
      "exampleLinks": [
        "https://arwriterai.com/en/blog/best-capcut-effects-transitions-boost-views-2026/"
      ]
    },
    {
      "id": "squash_stretch",
      "name": "Squash / stretch",
      "category": "text",
      "easing": "cubic-bezier(0.34,1.56,0.64,1)",
      "params": {
        "durationMs": 280
      },
      "keyframes": [
        {
          "t": 0,
          "props": {
            "scaleX": 0.2,
            "scaleY": 0.2
          }
        },
        {
          "t": 0.4,
          "props": {
            "scaleX": 1.25,
            "scaleY": 0.75
          }
        },
        {
          "t": 0.7,
          "props": {
            "scaleX": 0.92,
            "scaleY": 1.08
          }
        },
        {
          "t": 1,
          "props": {
            "scaleX": 1,
            "scaleY": 1
          }
        }
      ],
      "sfx": [
        "pop"
      ],
      "exampleLine": "SNAP",
      "exampleLinks": [
        "https://www.capcut.com/create/animated-text-maker"
      ]
    },
    {
      "id": "scramble_decode",
      "name": "Scramble / decode",
      "category": "text",
      "easing": "ease-out",
      "params": {
        "durationMs": 1200,
        "tickMs": 32
      },
      "keyframes": [],
      "sfx": [
        "digital"
      ],
      "exampleLine": "RAW \u2192 JPG",
      "exampleLinks": [
        "https://www.youtube.com/watch?v=sx9G0hjSmMY",
        "https://www.youtube.com/watch?v=YZH95fn2_6o"
      ]
    },
    {
      "id": "highlighter",
      "name": "Highlighter marker",
      "category": "text",
      "easing": "ease-out",
      "params": {
        "durationMs": 450,
        "alpha": 0.55
      },
      "keyframes": [
        {
          "t": 0,
          "props": {
            "bgSize": 0
          }
        },
        {
          "t": 1,
          "props": {
            "bgSize": 1
          }
        }
      ],
      "sfx": [
        "marker"
      ],
      "exampleLine": "white balance",
      "exampleLinks": [
        "https://www.videocaptions.ai/caption-styles"
      ]
    },
    {
      "id": "underline_draw",
      "name": "Underline draw",
      "category": "text",
      "easing": "ease-out",
      "params": {
        "durationMs": 400
      },
      "keyframes": [
        {
          "t": 0,
          "props": {
            "bgSize": 0
          }
        },
        {
          "t": 1,
          "props": {
            "bgSize": 1
          }
        }
      ],
      "sfx": [],
      "exampleLine": "manual focus",
      "exampleLinks": [
        "https://www.adobe.com/products/aftereffects/text-animation.html"
      ]
    },
    {
      "id": "word_swap",
      "name": "Word swap / morph",
      "category": "text",
      "easing": "ease-in-out",
      "params": {
        "outMs": 150,
        "inMs": 180
      },
      "keyframes": [],
      "sfx": [
        "whoosh"
      ],
      "exampleLine": "auto \u2192 aperture \u2192 shutter \u2192 ISO",
      "exampleLinks": [
        "https://www.capcut.com/explore/template-kinetic-typography/7497635722376497168"
      ]
    },
    {
      "id": "title_slam",
      "name": "Scale-to-fill title slam",
      "category": "text",
      "easing": "cubic-bezier(0.34,1.56,0.64,1)",
      "params": {
        "durationMs": 280,
        "scaleFrom": 0.3
      },
      "keyframes": [
        {
          "t": 0,
          "props": {
            "scale": 0.3
          }
        },
        {
          "t": 0.7,
          "props": {
            "scale": 1.05
          }
        },
        {
          "t": 1,
          "props": {
            "scale": 1
          }
        }
      ],
      "sfx": [
        "whoosh",
        "hit"
      ],
      "exampleLine": "SHARP",
      "exampleLinks": [
        "https://www.videocaptions.ai/caption-styles/mrbeast-style"
      ]
    },
    {
      "id": "number_roll",
      "name": "Counter / number roll",
      "category": "text",
      "easing": "cubic-bezier(0.16,1,0.3,1)",
      "params": {
        "durationMs": 900
      },
      "keyframes": [],
      "sfx": [
        "tick"
      ],
      "exampleLine": "ISO 100 \u2192 6400",
      "exampleLinks": [
        "https://www.videocaptions.ai/caption-styles/mrbeast-style"
      ]
    },
    {
      "id": "zoom_through",
      "name": "Tracking zoom through text",
      "category": "text",
      "easing": "ease-in",
      "params": {
        "durationMs": 700,
        "scaleTo": 10
      },
      "keyframes": [
        {
          "t": 0,
          "props": {
            "scale": 1,
            "opacity": 1
          }
        },
        {
          "t": 0.6,
          "props": {
            "scale": 6,
            "opacity": 0.7
          }
        },
        {
          "t": 1,
          "props": {
            "scale": 10,
            "opacity": 0
          }
        }
      ],
      "sfx": [
        "whoosh"
      ],
      "exampleLine": "GO",
      "exampleLinks": [
        "https://elements.envato.com/learn/motion-graphics-for-short-form-video"
      ]
    },
    {
      "id": "handwriting",
      "name": "Handwriting write-on",
      "category": "text",
      "easing": "linear",
      "params": {
        "durationMs": 1400
      },
      "keyframes": [],
      "sfx": [
        "chalk"
      ],
      "exampleLine": "watch the edges",
      "exampleLinks": [
        "https://www.capcut.com/resource/create-handwritten-animation"
      ]
    },
    {
      "id": "emoji_pop",
      "name": "Emoji / sticker pop",
      "category": "element",
      "easing": "cubic-bezier(0.34,1.56,0.64,1)",
      "params": {
        "durationMs": 200
      },
      "keyframes": [
        {
          "t": 0,
          "props": {
            "scale": 0
          }
        },
        {
          "t": 0.7,
          "props": {
            "scale": 1.2
          }
        },
        {
          "t": 1,
          "props": {
            "scale": 1
          }
        }
      ],
      "sfx": [
        "pop"
      ],
      "exampleLine": "noon + sun emoji",
      "exampleLinks": [
        "https://www.storycut.com/features/hormozi-captions"
      ]
    },
    {
      "id": "zoom_punch",
      "name": "Zoom punch-in",
      "category": "element",
      "easing": "ease-out",
      "params": {
        "durationMs": 280,
        "scaleTo": 1.1
      },
      "keyframes": [
        {
          "t": 0,
          "props": {
            "scale": 1
          }
        },
        {
          "t": 1,
          "props": {
            "scale": 1.1
          }
        }
      ],
      "sfx": [
        "whoosh"
      ],
      "exampleLine": "punch to catchlight",
      "exampleLinks": [
        "https://arwriterai.com/en/blog/best-capcut-effects-transitions-boost-views-2026/"
      ]
    },
    {
      "id": "ken_burns",
      "name": "Ken Burns",
      "category": "element",
      "easing": "ease-in-out",
      "params": {
        "durationMs": 3000,
        "scaleFrom": 1.0,
        "scaleTo": 1.18
      },
      "keyframes": [],
      "sfx": [],
      "exampleLine": "portfolio still into eye",
      "exampleLinks": [
        "https://github.com/renezander030/capcut-cli/blob/master/skills/capcut-edit/references/workflows.md"
      ]
    },
    {
      "id": "speed_ramp",
      "name": "Speed ramp",
      "category": "element",
      "easing": "ease-in-out",
      "params": {
        "fromRate": 0.5,
        "toRate": 2.0,
        "windowFrames": 12
      },
      "keyframes": [],
      "sfx": [
        "bass"
      ],
      "exampleLine": "ramp into shutter press",
      "exampleLinks": [
        "https://arwriterai.com/en/blog/best-capcut-effects-transitions-boost-views-2026/"
      ]
    },
    {
      "id": "callout_circle",
      "name": "Circle callout",
      "category": "element",
      "easing": "ease-out",
      "params": {
        "drawMs": 500
      },
      "keyframes": [
        {
          "t": 0,
          "props": {
            "path": 0
          }
        },
        {
          "t": 1,
          "props": {
            "path": 1
          }
        }
      ],
      "sfx": [
        "tick"
      ],
      "exampleLine": "circle zebra blinkies",
      "exampleLinks": [
        "https://elements.envato.com/learn/motion-graphics-for-short-form-video"
      ]
    },
    {
      "id": "callout_arrow",
      "name": "Arrow callout",
      "category": "element",
      "easing": "cubic-bezier(0.34,1.56,0.64,1)",
      "params": {
        "durationMs": 250
      },
      "keyframes": [],
      "sfx": [],
      "exampleLine": "arrow to hotshoe",
      "exampleLinks": [
        "https://elements.envato.com/learn/motion-graphics-for-short-form-video"
      ]
    },
    {
      "id": "progress_bar",
      "name": "Progress bar",
      "category": "element",
      "easing": "linear",
      "params": {
        "heightPx": 8
      },
      "keyframes": [],
      "sfx": [],
      "exampleLine": "15s tip timer",
      "exampleLinks": [
        "https://www.solidlabs.com/social-safe-zones"
      ]
    },
    {
      "id": "lower_third",
      "name": "Lower third",
      "category": "element",
      "easing": "cubic-bezier(0.22,1,0.36,1)",
      "params": {
        "inMs": 300,
        "outMs": 200
      },
      "keyframes": [
        {
          "t": 0,
          "props": {
            "x": -0.4
          }
        },
        {
          "t": 1,
          "props": {
            "x": 0
          }
        }
      ],
      "sfx": [
        "whoosh"
      ],
      "exampleLine": "GLENN SOMERS / Photography educator",
      "exampleLinks": [
        "https://elements.envato.com/learn/motion-graphics-for-short-form-video"
      ]
    },
    {
      "id": "image_card",
      "name": "B-roll image card",
      "category": "element",
      "easing": "ease-out",
      "params": {
        "durationMs": 250
      },
      "keyframes": [
        {
          "t": 0,
          "props": {
            "scale": 0.92,
            "opacity": 0
          }
        },
        {
          "t": 1,
          "props": {
            "scale": 1,
            "opacity": 1
          }
        }
      ],
      "sfx": [],
      "exampleLine": "before/after exposure cards",
      "exampleLinks": [
        "https://elements.envato.com/learn/motion-graphics-for-short-form-video"
      ]
    },
    {
      "id": "split_screen",
      "name": "Split screen",
      "category": "element",
      "easing": "ease-out",
      "params": {
        "dividerMs": 250
      },
      "keyframes": [],
      "sfx": [],
      "exampleLine": "SOOC | Edited",
      "exampleLinks": [
        "https://arwriterai.com/en/blog/best-capcut-effects-transitions-boost-views-2026/"
      ]
    },
    {
      "id": "screenshot_pop",
      "name": "Screenshot / tweet pop-in",
      "category": "element",
      "easing": "cubic-bezier(0.34,1.56,0.64,1)",
      "params": {
        "durationMs": 320
      },
      "keyframes": [
        {
          "t": 0,
          "props": {
            "y": 80,
            "scale": 0.85
          }
        },
        {
          "t": 1,
          "props": {
            "y": 0,
            "scale": 1
          }
        }
      ],
      "sfx": [
        "pop"
      ],
      "exampleLine": "IG insights screenshot",
      "exampleLinks": [
        "https://www.capcut.com/create/animated-text-maker"
      ]
    },
    {
      "id": "map_route",
      "name": "Map route line",
      "category": "element",
      "easing": "ease-in-out",
      "params": {
        "durationMs": 1200
      },
      "keyframes": [
        {
          "t": 0,
          "props": {
            "path": 0
          }
        },
        {
          "t": 1,
          "props": {
            "path": 1
          }
        }
      ],
      "sfx": [],
      "exampleLine": "studio \u2192 golden-hour overlook",
      "exampleLinks": [
        "https://elements.envato.com/learn/motion-graphics-for-short-form-video"
      ]
    },
    {
      "id": "flash_frame",
      "name": "Flash frame",
      "category": "transition",
      "easing": "linear",
      "params": {
        "frames": 2,
        "opacity": 0.85
      },
      "keyframes": [],
      "sfx": [
        "hit"
      ],
      "exampleLine": "2-frame flash into B-roll",
      "exampleLinks": [
        "https://arwriterai.com/en/blog/best-capcut-effects-transitions-boost-views-2026/"
      ]
    },
    {
      "id": "light_leak",
      "name": "Light leak",
      "category": "transition",
      "easing": "ease-out",
      "params": {
        "durationMs": 300
      },
      "keyframes": [],
      "sfx": [],
      "exampleLine": "warm leak on cut",
      "exampleLinks": [
        "https://neuvo.co/viral-instagram-reel-transition-techniques/"
      ]
    },
    {
      "id": "glitch_transition",
      "name": "Glitch transition",
      "category": "transition",
      "easing": "linear",
      "params": {
        "frames": 8,
        "intensity": 0.4
      },
      "keyframes": [],
      "sfx": [
        "glitch"
      ],
      "exampleLine": "glitch into title",
      "exampleLinks": [
        "https://neuvo.co/viral-instagram-reel-transition-techniques/",
        "https://www.capcut.com/tools/free-video-transitions"
      ]
    },
    {
      "id": "whip_pan",
      "name": "Whip / swipe",
      "category": "transition",
      "easing": "ease-in",
      "params": {
        "durationMs": 200
      },
      "keyframes": [],
      "sfx": [
        "whoosh"
      ],
      "exampleLine": "studio \u2192 location whip",
      "exampleLinks": [
        "https://neuvo.co/viral-instagram-reel-transition-techniques/",
        "https://videowizardtools.com/capcut-transitions-for-reels-tiktok/"
      ]
    },
    {
      "id": "camera_shake",
      "name": "Camera shake",
      "category": "element",
      "easing": "linear",
      "params": {
        "durationMs": 180,
        "amplitudePx": 10
      },
      "keyframes": [],
      "sfx": [
        "impact"
      ],
      "exampleLine": "shake on stand drop",
      "exampleLinks": [
        "https://videowizardtools.com/capcut-transitions-for-reels-tiktok/"
      ]
    },
    {
      "id": "shape_reveal",
      "name": "Shape mask reveal",
      "category": "transition",
      "easing": "ease-out",
      "params": {
        "durationMs": 400
      },
      "keyframes": [
        {
          "t": 0,
          "props": {
            "iris": 0
          }
        },
        {
          "t": 1,
          "props": {
            "iris": 1
          }
        }
      ],
      "sfx": [
        "whoosh"
      ],
      "exampleLine": "iris wipe to lens close-up",
      "exampleLinks": [
        "https://www.capcut.com/tools/free-video-transitions"
      ]
    },
    {
      "id": "camera_hud",
      "name": "Retro camera HUD / REC",
      "category": "element",
      "easing": "none",
      "params": {
        "recBlinkMs": 1000,
        "font": "Space Mono"
      },
      "keyframes": [],
      "sfx": [
        "beep"
      ],
      "exampleLine": "REC + ISO6400 1/40 f/1.8",
      "exampleLinks": [
        "https://elements.envato.com/learn/motion-graphics-for-short-form-video"
      ]
    }
  ]
}
```

## 9. CapCut / Resolve / Premiere / AE mapping

| Product | What to mirror |
|---------|----------------|
| **CapCut** | Text In: Pop, Bounce, Typewriter, Slide, Fade, Shake, Stretch, Elastic, Glitch, Mask; Auto BG remove for text-behind; Transitions: whip, glitch, flash, blur, mask ([transitions](https://www.capcut.com/tools/free-video-transitions), [handwriting](https://www.capcut.com/resource/create-handwritten-animation), [text-behind](https://www.capcut.com/resource/how-to-put-text-behind-a-person-in-capcut)) |
| **DaVinci Resolve** | Text+ Follower (Word/Character) + Spline OutBack; Transform pop ([cutsio](https://cutsio.com/blog/pop-up-text-tutorial-in-davinci-resolve-text-bounce-effect)); Fusion masks; Magic Mask for text-behind; GIRAFFRAME free caption pack |
| **After Effects** | Text Animators + Range Selector; Character Offset scramble; 3D text; mask paths ([Adobe](https://www.adobe.com/products/aftereffects/text-animation.html)); TikTokText plugin ([aaeplugins](https://aaeplugins.com/plugins/tiktoktext/)) |
| **Premiere Pro** | MOGRTs; track mattes; AutoCut Advanced captions; Dynamic Link to AE |
| **Submagic / Opus / AutoCaption** | Theme libraries + karaoke/Hormozi/Iman presets |

Glenn edits Resolve + Adobe → ship: (a) burned video, (b) SRT+style JSON, (c) optional Fusion/MOGRT later.

---

## 10. Implementation checklist for Claude

1. Bundle OFL fonts from §2.7 (`paid:false` only).
2. Require word-level timestamps.
3. Caption layout: safe-zone clamp, words-per-page packer.
4. Implement **all registry ids** in §8 (text + element + transition).
5. Ship 8 presets in §7 with `exampleLine` / `exampleBeat` / `exampleLinks` as fixture tests.
6. Element layer + SFX matrix §5.18; motion principles §6 as defaults.
7. Default Glenn → `photography_educator` + cross-post safe zone; optional `camera_hud`.
8. Do **not** redistribute Impact / Proxima Nova / The Bold Font binaries.
9. For every animation/preset: keep example links verified, photography worked beats, and CSS/JSON keyframes in sync with the Page demos.

---

## 11. Sources

1. Submagic — fonts: https://www.submagic.co/blog/best-font-for-subtitle
2. ReelWords — caption fonts: https://reelwords.ai/blog/best-fonts-for-captions
3. Sycamore — fonts + defaults: https://www.sycamore.to/blog/best-fonts-for-captions-on-shorts-reels-and-tiktok
4. StoryCut — Hormozi: https://www.storycut.com/features/hormozi-captions
5. VideoCaptions.AI — MrBeast: https://www.videocaptions.ai/caption-styles/mrbeast-style
6. VideoCaptions.AI — styles: https://www.videocaptions.ai/caption-styles
7. AutoCaption — karaoke: https://autocaption.app/caption-styles/karaoke-captions
8. FilmScribe — Ali Abdaal: https://filmscribe.ai/en/caption-styles/ali-abdaal
9. Submagic — Iman Gadzhi: https://www.submagic.co/blog/how-to-make-captions-like-iman-gadzhi
10. Solid Labs — safe zones 2026: https://www.solidlabs.com/social-safe-zones
11. CapCut — text behind person: https://www.capcut.com/resource/how-to-put-text-behind-a-person-in-capcut
12. CapCut — handwriting: https://www.capcut.com/resource/create-handwritten-animation
13. CapCut — animated text: https://www.capcut.com/create/animated-text-maker
14. CapCut — transitions: https://www.capcut.com/tools/free-video-transitions
15. CapCut — kinetic typography templates: https://www.capcut.com/explore/template-kinetic-typography/7497635722376497168
16. Adobe — AE text animation: https://www.adobe.com/products/aftereffects/text-animation.html
17. Adobe Help — animating text: https://helpx.adobe.com/after-effects/desktop/animating-text/text-animation/animating-text.html
18. Mike Murphy — AE text animators: https://mikemurphy.ai/tutorials/textanimators/
19. Envato — motion graphics short form: https://elements.envato.com/learn/motion-graphics-for-short-form-video
20. Neuvo — Reel transitions: https://neuvo.co/viral-instagram-reel-transition-techniques/
21. VideoWizardTools — CapCut transitions: https://videowizardtools.com/capcut-transitions-for-reels-tiktok/
22. CapCut effects/transitions roundup: https://arwriterai.com/en/blog/best-capcut-effects-transitions-boost-views-2026/
23. Cutsio — Resolve pop-up: https://cutsio.com/blog/pop-up-text-tutorial-in-davinci-resolve-text-bounce-effect
24. TypeFlare — Resolve captions: https://tagger.mov/typeflare/guides/animated-captions
25. Skalablog — CapCut premium text (Matt Loui): https://www.capcut.com/create/animated-text-maker
26. YouTube — CapCut free text effects: https://www.youtube.com/watch?v=3TtgmGpnNKQ
27. YouTube — CapCut mask text reveal: https://www.youtube.com/watch?v=jEI0iQj7Mzc
28. YouTube — AE scramble: https://www.youtube.com/watch?v=sx9G0hjSmMY
29. YouTube — AE decoder: https://www.youtube.com/watch?v=YZH95fn2_6o
30. TikTok — text behind tutorial: https://www.tiktok.com/@jera.bean/video/7379043709146533166
31. CapCut CLI Ken Burns: https://github.com/renezander030/capcut-cli/blob/master/skills/capcut-edit/references/workflows.md
32. TikTokText AE plugin: https://aaeplugins.com/plugins/tiktoktext/
33. GIRAFFRAME Resolve pack: https://frametoolsmith.gumroad.com/l/capcut-captions-free
34. AutoCut Advanced: https://www.autocut.com/en/advanced-captions/
35. Google Fonts: https://fonts.google.com/

---

*Updated 2026-11-02 (Europe/Dublin). Stats and creator-style matches are as reported by linked tools/tutorials — not official brand kits. Curl checks: Adobe adobe.com/helpx and Skalablog often 403 to bots — keep as browser URLs; prefer Mike Murphy AE, CapCut official guides, and YouTube tutorials (all 200) as primary cites when bot fetch fails.*

---

# §12 Premium tier upgrade (v3)
**Total animations:** 112 — Foundations 46 + Premium 66.
**Categories:** {"caption": 24, "kinetic_title": 34, "element": 26, "transition": 11, "overlay": 4, "fx": 7, "layout": 6}
**Combo recipes:** 12 · **Presets:** 24 (8 Foundations + 16 Premium)
**Source of truth:** `animation-registry.json` v3 · `presets.json` v3

## Premium principles (what makes motion look expensive)

- **layeredKeyframes:** Animate 2–4 properties together (opacity, transform, blur, glow).
- **spring:** Prefer spring or overshoot cubic-bezier; settle past target then rest.
- **anticipation:** 40–80ms opposite move before main action.
- **secondary:** Shadows, glints, echoes follow primary with delay.
- **stagger:** Letters 30–50ms, words 60–100ms, with range feather.
- **motionBlur:** Enable ~180° shutter on fast moves; disable when settled.
- **density:** One premium recipe per beat; readable twice on-screen.
**Reference tutorials / packs (verified):**
- https://olafmotion.com/tutorials/kinetic-text-animation-tutorial/
- https://olafmotion.com/tutorials/how-to-animate-text-in-after-effects-pro/
- https://www.sonicmusicrecords.com/top-10-kinetic-typography-techniques-in-adobe-after-effects/
- https://elements.envato.com/learn/motion-graphics-for-short-form-video
- https://www.schoolofmotion.com/

Market research (packs & educators — only pages that returned HTTP 200 in audit): MotionVFX mTitle Cinematic 2 / mCaptionsAI, Envato Elements AE titles + short-form MG learn page, Mister Horse Animation Composer, Ben Marriott, Jake in Motion, Video Copilot, MT Mograph, Apple Motion, School of Motion (home + Animation Bootcamp), OlafMotion kinetic/pro text, Infinite Creation kinetic, SonicMusicRecords top-10 kinetic techniques, CapCut text-behind / handwriting / animated text / transitions / kinetic template, Captions.ai, PremiumBeat blog. Bot-403 sites (Motion Array, Rocketstock, aescripts, Adobe helpx) kept as browser URLs only when needed — prefer CapCut/YT/Envato/MotionVFX primary cites. Dropped 404s: School of Motion kinetic-typography & expressions posts, PremiumBeat AE presets article, Motion Array blog AE presets, Envato `/category/video-templates/after-effects`, Captions.ai `/tools/auto-captions`, old MotionVFX path variants.

## Premium animations (registry-driven)

Every Premium entry below is fully specified in `animation-registry.json` with: layered keyframe specs (per-layer, per-property, ms/values, cubic-bezier or spring stiffness/damping/mass), stagger, motion-blur/shutter, SFX, photography-niche worked example, 1–3 verified links, tool mapping (AE / Premiere / Resolve Fusion / CapCut), and don't-do.

### caption (12)

#### `prem_soft_spring_caption` — Soft spring caption (multi-prop)
- **Look:** Caption rises with opacity+scale+Y+blur settle — no hard pop.
- **Why premium:** Layered multi-property keyframes + spring settle + blur-as-MB; optional anticipation.
- **Layers:** 2 — see registry for full per-property keyframes
- **Stagger:** `{"unit": "word", "ms": 70}`
- **Motion blur:** `{"enabled": true, "shutterAngle": 180, "fallbackCssBlurPx": 6}`
- **SFX:** soft_tick
- **Photography example:** “Expose for the skin” — Words +70ms cascade; each soft-springs 520ms blur 8→0
- **Example:** https://olafmotion.com/tutorials/kinetic-text-animation-tutorial/
- **Example:** https://cutsio.com/blog/pop-up-text-tutorial-in-davinci-resolve-text-bounce-effect
- **Example:** https://elements.envato.com/learn/motion-graphics-for-short-form-video
- **Tools:** AE: Text Animator Pos+Scale+Blur + spring · Premiere: MOGRT spring · Resolve: Text+ Follower + blur · CapCut: Combo Elastic + Blur
- **Don't:** Don't use linear opacity-only fades for premium talking-head.

#### `prem_karaoke_glow_track` — Karaoke glow track
- **Look:** Active word: fill + outer glow + micro-scale; rest dim.
- **Why premium:** Secondary glow layer + micro overshoot + plate separation.
- **Layers:** 2 — see registry for full per-property keyframes
- **Stagger:** `{"unit": "word", "sync": "asr"}`
- **SFX:** tick
- **Photography example:** “Watch the catchlights in her eyes” — Each ASR word glow 0→0.7→0.35 + scale 1.06
- **Example:** https://autocaption.app/caption-styles/karaoke-captions
- **Example:** https://www.motionvfx.com/mCaptionsAI
- **Example:** https://tagger.mov/typeflare/guides/animated-captions
- **Tools:** AE: Fill+Glow animators · Premiere: AutoCut/MOGRT · Resolve: Text+ Glow · CapCut: Highlight+Glow
- **Don't:** Don't max glow until glyphs bloom.

#### `prem_split_mask_dual` — Split-mask dual fill
- **Look:** Stacked captions; split mask reveals accent fill as spoken.
- **Why premium:** Track-matte/split mask + per-word timing.
- **Layers:** 2 — see registry for full per-property keyframes
- **Stagger:** `{"unit": "word", "sync": "asr"}`
- **Photography example:** “Softbox left. Rim right.” — Accent amber wipe per word 180ms
- **Example:** https://www.youtube.com/watch?v=jEI0iQj7Mzc
- **Example:** https://olafmotion.com/tutorials/how-to-animate-text-in-after-effects-pro/
- **Example:** https://www.capcut.com/create/animated-text-maker
- **Tools:** AE: Track matte · Premiere: Track matte · Resolve: Fusion mask · CapCut: Split mask
- **Don't:** Don't wipe whole line evenly.

#### `prem_outline_offset_echo` — Outline offset echo
- **Look:** Hollow outline leads; solid fill follows 40–60ms.
- **Why premium:** Follow-through / secondary motion between outline and fill.
- **Layers:** 2 — see registry for full per-property keyframes
- **Motion blur:** `{"enabled": true, "shutterAngle": 180}`
- **SFX:** whoosh_soft, pop
- **Photography example:** “TRIPOD” — Outline 0–150ms; fill +50ms echo
- **Example:** https://www.sonicmusicrecords.com/top-10-kinetic-typography-techniques-in-adobe-after-effects/
- **Example:** https://misterhorse.com/animation-composer
- **Example:** https://elements.envato.com/video-templates/after-effects/titles
- **Tools:** AE: Dup stroke-only + delay · Premiere: MOGRT · Resolve: Two Text+ · CapCut: Duplicate + delay
- **Don't:** Don't delay >90ms.

#### `prem_weight_crossfade_premium` — Variable-weight crossfade
- **Look:** Light↔bold layers crossfade with micro Y settle.
- **Why premium:** True weight morph via crossfade + micro motion.
- **Layers:** 2 — see registry for full per-property keyframes
- **Stagger:** `{"unit": "word", "sync": "asr"}`
- **Photography example:** “clarity over noise” — Spoken word light→bold 140ms + 2px Y
- **Example:** https://www.submagic.co/blog/how-to-make-captions-like-iman-gadzhi
- **Example:** https://olafmotion.com/tutorials/how-to-animate-text-in-after-effects-pro/
- **Tools:** AE: Two layers/variable font · Premiere: MOGRT · Resolve: Two Text+ · CapCut: Two layers opacity
- **Don't:** Don't add bounce.

#### `prem_dim_chorus_active` — Dim chorus / bright solo
- **Look:** Phrase dim; solo word brightens with micro-lift.
- **Why premium:** Hierarchy + micro Y — Ali-class polish.
- **Layers:** 2 — see registry for full per-property keyframes
- **Photography example:** “Here's the histogram trick” — histogram lifts -3px + full opacity
- **Example:** https://filmscribe.ai/en/caption-styles/ali-abdaal
- **Example:** https://www.motionvfx.com/mCaptionsAI
- **Example:** https://www.captions.ai/
- **Tools:** AE: Opacity animators · Premiere: MOGRT · Resolve: Text+ · CapCut: Highlight
- **Don't:** Don't bounce teaching tone.

#### `prem_box_slide_highlight` — Sliding pill highlight
- **Look:** Pill interpolates between word bounds.
- **Why premium:** Interpolated box motion > snap color — Captions-app premium feel.
- **Layers:** 1 — see registry for full per-property keyframes
- **Photography example:** “ND filter first” — Pill eases between word bounds
- **Example:** https://autocaption.app/caption-styles/karaoke-captions
- **Example:** https://www.captions.ai/
- **Example:** https://www.motionvfx.com/mCaptionsAI
- **Tools:** AE: Null-driven shape · Premiere: MOGRT · Resolve: Fusion · CapCut: Background highlight
- **Don't:** Don't cover eyes — y≈0.58–0.68.

#### `prem_vertical_stack_pop` — Vertical stack pop
- **Look:** Words stack; each springs with delay.
- **Why premium:** Staggered springs + stack layout — mCaptions social territory.
- **Layers:** 1 — see registry for full per-property keyframes
- **Stagger:** `{"unit": "word", "ms": 90}`
- **Motion blur:** `{"enabled": true, "shutterAngle": 180}`
- **SFX:** pop
- **Photography example:** “STOP / SHOOTING / NOON” — Each line +90ms spring
- **Example:** https://www.motionvfx.com/mCaptionsAI
- **Example:** https://www.storycut.com/features/hormozi-captions
- **Example:** https://www.captions.ai/
- **Tools:** AE: Per-word layers · Premiere: MOGRT · Resolve: Follower · CapCut: Pop + delay
- **Don't:** Don't stack >3 lines on 9:16.

#### `prem_subtitle_safe_fade` — Subtitle safe cinematic fade
- **Look:** Smaller subtitle band, soft fade, no bounce.
- **Why premium:** Restraint + safe-zone discipline — documentary/cinema.
- **Layers:** 1 — see registry for full per-property keyframes
- **Photography example:** “Meter for the highlights” — Fade 280ms at y=0.72
- **Example:** https://www.motionvfx.com/store,mtitle-cinematic-2-dvr,p3795.html
- **Example:** https://elements.envato.com/learn/motion-graphics-for-short-form-video
- **Example:** https://www.solidlabs.com/social-safe-zones
- **Tools:** AE: Opacity · Premiere: Captions · Resolve: Subtitles · CapCut: Fade
- **Don't:** Don't use impact fonts here.

#### `prem_typewriter_cursor_premium` — Typewriter + blinking cursor
- **Look:** Characters appear with cursor blink and soft click SFX.
- **Why premium:** Secondary cursor layer + timing discipline — not raw typewriter.
- **Layers:** 2 — see registry for full per-property keyframes
- **SFX:** soft_tick
- **Photography example:** “check your histogram” — Type ~42ms/char; cursor blinks
- **Example:** https://www.capcut.com/create/animated-text-maker
- **Example:** https://olafmotion.com/tutorials/how-to-animate-text-in-after-effects-pro/
- **Example:** https://tagger.mov/typeflare/guides/animated-captions
- **Tools:** AE: Typewriter expr + cursor · Premiere: MOGRT · Resolve: Text+ write-on · CapCut: Typewriter
- **Don't:** Don't type faster than readable aloud.

#### `prem_word_magnet_snap` — Word magnet snap
- **Look:** Words fly from offscreen and magnet-snap into line.
- **Why premium:** Staggered trajectories + overshoot settle.
- **Layers:** 1 — see registry for full per-property keyframes
- **Stagger:** `{"unit": "word", "ms": 80}`
- **Motion blur:** `{"enabled": true, "shutterAngle": 180}`
- **SFX:** pop
- **Photography example:** “Soft light wraps faces” — Words magnet from L with 80ms stagger
- **Example:** https://misterhorse.com/animation-composer
- **Example:** https://olafmotion.com/tutorials/kinetic-text-animation-tutorial/
- **Example:** https://www.motionvfx.com/mCaptionsAI
- **Tools:** AE: Per-word Position+Rotation · Premiere: MOGRT · Resolve: Follower · CapCut: Combo fly-in
- **Don't:** Don't magnet every ASR word for long tips.

#### `prem_caption_exit_settle` — Caption soft exit settle
- **Look:** Caption exits with scale-down + blur + opacity (not hard cut).
- **Why premium:** Exits matter — premium packs animate out with settle.
- **Layers:** 1 — see registry for full per-property keyframes
- **Photography example:** “Expose for the skin” — Exit 280ms before next line
- **Example:** https://olafmotion.com/tutorials/kinetic-text-animation-tutorial/
- **Example:** https://cutsio.com/blog/pop-up-text-tutorial-in-davinci-resolve-text-bounce-effect
- **Example:** https://www.motionvfx.com/mCaptionsAI
- **Tools:** AE: Out animators · Premiere: MOGRT out · Resolve: Follower out · CapCut: Out animation
- **Don't:** Don't hard-cut captions between phrases.

### kinetic_title (19)

#### `prem_mask_reveal_light_sweep` — Mask reveal + light sweep
- **Look:** Title revealed by mask; specular bar sweeps glyphs.
- **Why premium:** Composable mask + secondary glint + motion blur on sweep.
- **Layers:** 2 — see registry for full per-property keyframes
- **Motion blur:** `{"enabled": true, "shutterAngle": 180}`
- **SFX:** whoosh, shimmer
- **Photography example:** “GOLDEN HOUR” — Mask 0–700ms; glint peaks mid-reveal
- **Example:** https://www.motionvfx.com/design-studio/collections/mtitle-cinematic-2
- **Example:** https://elements.envato.com/video-templates/after-effects/titles
- **Example:** https://www.youtube.com/watch?v=jEI0iQj7Mzc
- **Tools:** AE: Linear wipe + highlight add · Premiere: MOGRT · Resolve: Fusion mask + Soft Glow · CapCut: Mask + Shine
- **Don't:** Don't leave glint looping.

#### `prem_parallax_stack_type` — Parallax stacked type
- **Look:** FG word moves more than BG line; fake depth.
- **Why premium:** Multi-layer parallax + blur-by-depth + shadow separation.
- **Layers:** 2 — see registry for full per-property keyframes
- **Motion blur:** `{"enabled": true, "shutterAngle": 180}`
- **SFX:** whoosh_soft
- **Photography example:** “NEAR / far” — FG 40px; BG 12px; BG stays soft
- **Example:** https://www.motionvfx.com/store,mtitle-cinematic-2-dvr,p3795.html
- **Example:** https://infinitecreation.io/tutorial-kinetic-text
- **Example:** https://elements.envato.com/learn/motion-graphics-for-short-form-video
- **Tools:** AE: Nulls + 2.5D · Premiere: Nested MOGRT · Resolve: Fusion Transform · CapCut: Compound keyframes
- **Don't:** Don't parallax body captions.

#### `prem_3d_camera_orbit_title` — 3D camera orbit title
- **Look:** Text in 3D; camera orbits then settles readable.
- **Why premium:** True 3D camera + settle + motion blur.
- **Layers:** 2 — see registry for full per-property keyframes
- **Motion blur:** `{"enabled": true, "shutterAngle": 180}`
- **SFX:** whoosh_deep, hit_soft
- **Photography example:** “DEPTH OF FIELD” — Orbit 35°→0 over 900ms
- **Example:** https://www.motionvfx.com/design-studio/collections/mtitle-cinematic-2
- **Example:** https://www.videocopilot.net/
- **Example:** https://jakeinmotion.com/
- **Tools:** AE: 3D text + camera · Premiere: AE Dynamic Link · Resolve: Fusion Text3D · CapCut: 3D text + freeze
- **Don't:** Don't keep orbiting during VO.

#### `prem_stagger_cascade_blur` — Cascade stagger + blur falloff
- **Look:** Per-letter cascade with blur/opacity falloff.
- **Why premium:** Feathered range selectors + multi-prop + graph easing.
- **Layers:** 1 — see registry for full per-property keyframes
- **Stagger:** `{"unit": "letter", "ms": 40, "feather": 0.25}`
- **Motion blur:** `{"enabled": true, "shutterAngle": 180, "fallbackCssBlurPx": 8}`
- **SFX:** ticks_cascade
- **Photography example:** “FRAME” — Letters stagger 40ms; each 320ms blur falloff
- **Example:** https://mikemurphy.ai/tutorials/textanimators/
- **Example:** https://www.sonicmusicrecords.com/top-10-kinetic-typography-techniques-in-adobe-after-effects/
- **Example:** https://olafmotion.com/tutorials/kinetic-text-animation-tutorial/
- **Tools:** AE: Animators + Range + Blur · Premiere: MOGRT · Resolve: Follower Character · CapCut: Per-letter combo
- **Don't:** Don't letter-stagger body ASR.

#### `prem_tracking_expand` — Tracking expand (letter-spacing)
- **Look:** Collapsed tracking expands to final spacing.
- **Why premium:** Typographic tracking animation + settle — editorial luxury.
- **Layers:** 1 — see registry for full per-property keyframes
- **SFX:** whoosh_soft
- **Photography example:** “PORTRAIT” — Tracking −80→0 over 800ms
- **Example:** https://www.motionvfx.com/design-studio/collections/mtitle-cinematic-2
- **Example:** https://elements.envato.com/video-templates/after-effects/titles
- **Example:** https://www.benmarriott.com/
- **Tools:** AE: Tracking animator · Premiere: MOGRT · Resolve: Text+ Tracking · CapCut: Spacing keyframes
- **Don't:** Don't expand past safe sides.

#### `prem_focus_pull_title` — Focus-pull title
- **Look:** Heavy defocus → sharp as racking focus.
- **Why premium:** Photographic language (focus) + opacity.
- **Layers:** 1 — see registry for full per-property keyframes
- **Photography example:** “Subject sharp. Background melts.” — Blur 18→0 in 650ms
- **Example:** https://elements.envato.com/learn/motion-graphics-for-short-form-video
- **Example:** https://www.motionvfx.com/store,mtitle-cinematic-2-dvr,p3795.html
- **Example:** https://olafmotion.com/tutorials/how-to-animate-text-in-after-effects-pro/
- **Tools:** AE: Lens Blur · Premiere: Blur MOGRT · Resolve: Blur keyframes · CapCut: Blur in
- **Don't:** Don't use on tiny captions.

#### `prem_chromatic_impact` — Chromatic aberration impact
- **Look:** Brief RGB split on hit, then clean.
- **Why premium:** Controlled FX pulse (not full-time glitch) + settle.
- **Layers:** 1 — see registry for full per-property keyframes
- **SFX:** glitch_soft, hit
- **Photography example:** “ISO 6400” — 8-frame RGB ±8px @ ~40% then clean
- **Example:** https://arwriterai.com/en/blog/best-capcut-effects-transitions-boost-views-2026/
- **Example:** https://neuvo.co/viral-instagram-reel-transition-techniques/
- **Example:** https://www.capcut.com/tools/free-video-transitions
- **Tools:** AE: RGB split · Premiere: Effect presets · Resolve: RGB Split · CapCut: Glitch ~40%
- **Don't:** Don't leave CA on for readability.

#### `prem_echo_trail_type` — Velocity echo trails
- **Look:** Ghost copies offset in time during fast move.
- **Why premium:** Echo/secondary forms during velocity.
- **Layers:** 3 — see registry for full per-property keyframes
- **Motion blur:** `{"enabled": true, "shutterAngle": 360}`
- **SFX:** whoosh
- **Photography example:** “SNAP FOCUS” — Main slides; echoes +40/+80ms fade
- **Example:** https://misterhorse.com/animation-composer
- **Example:** https://www.sonicmusicrecords.com/top-10-kinetic-typography-techniques-in-adobe-after-effects/
- **Example:** https://www.videocopilot.net/
- **Tools:** AE: Echo / dup delay · Premiere: Echo · Resolve: Trails · CapCut: Ghost/afterimage
- **Don't:** Don't keep echoes after settle.

#### `prem_liquid_morph_word` — Liquid morph word-swap
- **Look:** Word A melts into Word B in same slot.
- **Why premium:** Distortion/liquid used sparingly for emphasis.
- **Layers:** 1 — see registry for full per-property keyframes
- **SFX:** liquid, whoosh_soft
- **Photography example:** “auto → aperture” — Morph peak mid-swap; land sharp
- **Example:** https://www.sonicmusicrecords.com/top-10-kinetic-typography-techniques-in-adobe-after-effects/
- **Example:** https://www.capcut.com/explore/template-kinetic-typography/7497635722376497168
- **Example:** https://elements.envato.com/video-templates/after-effects/titles
- **Tools:** AE: Turbulent Displace · Premiere: AE link · Resolve: Fusion displace · CapCut: Liquid/morph
- **Don't:** Don't morph mid-phoneme.

#### `prem_anticipation_squash_title` — Anticipation squash title
- **Look:** Tiny squash opposite, then expand slam + settle.
- **Why premium:** Anticipation + squash/stretch + overshoot principle stack.
- **Layers:** 1 — see registry for full per-property keyframes
- **Motion blur:** `{"enabled": true, "shutterAngle": 180}`
- **SFX:** whoosh, hit
- **Photography example:** “SHARP” — Anticipate 60ms → slam → settle
- **Example:** https://www.schoolofmotion.com/courses/animation-bootcamp
- **Example:** https://olafmotion.com/tutorials/kinetic-text-animation-tutorial/
- **Example:** https://misterhorse.com/animation-composer
- **Tools:** AE: Graph Editor axes · Premiere: MOGRT · Resolve: Transform · CapCut: Stretch/Elastic
- **Don't:** Don't squash multi-line body captions.

#### `prem_occlusion_text_behind` — Occlusion text-behind (polished)
- **Look:** Clean cutout over type; edge refine + contact shadow.
- **Why premium:** Depth illusion + contact shadow + refined matte.
- **Layers:** 2 — see registry for full per-property keyframes
- **Photography example:** “f/2.8” — Text mid-ground; subject crosses with contact shadow
- **Example:** https://www.capcut.com/resource/how-to-put-text-behind-a-person-in-capcut
- **Example:** https://www.tiktok.com/@jera.bean/video/7379043709146533166
- **Example:** https://www.youtube.com/watch?v=jEI0iQj7Mzc
- **Tools:** AE: Roto Brush 3 · Premiere: AE · Resolve: Magic Mask · CapCut: Remove BG overlay
- **Don't:** Don't skip edge refine on hair.

#### `prem_ink_brush_write` — Ink brush write-on
- **Look:** Brush/ink stroke reveals title along path.
- **Why premium:** Stroke-on-path + texture — above typewriter.
- **Layers:** 1 — see registry for full per-property keyframes
- **SFX:** brush, chalk
- **Photography example:** “watch the edges” — Ink path 1.4s near crop
- **Example:** https://www.capcut.com/resource/create-handwritten-animation
- **Example:** https://elements.envato.com/video-templates/after-effects/titles
- **Example:** https://www.benmarriott.com/
- **Tools:** AE: Stroke on path · Premiere: AE · Resolve: Paint/stroke · CapCut: Handwriting
- **Don't:** Don't use for full VO track.

#### `prem_neon_flicker_sign` — Neon flicker sign
- **Look:** Neon tubes flicker on with glow layers then hold.
- **Why premium:** Multi-pass glow + limited flicker + settle.
- **Layers:** 2 — see registry for full per-property keyframes
- **SFX:** electric, hum
- **Photography example:** “OPEN LATE” — Flicker then stable neon hold
- **Example:** https://elements.envato.com/video-templates/after-effects/titles
- **Example:** https://www.capcut.com/explore/template-kinetic-typography/7497635722376497168
- **Example:** https://www.mtmograph.com/
- **Tools:** AE: Glow passes + limited wiggle · Premiere: MOGRT · Resolve: Glow · CapCut: Neon templates
- **Don't:** Don't flicker through paragraphs.

#### `prem_line_grow_type` — Line-grow + type fade
- **Look:** Rule draws; type fades/slides above.
- **Why premium:** Two-stage reveal: structure then type — editorial.
- **Layers:** 2 — see registry for full per-property keyframes
- **SFX:** whoosh_soft
- **Photography example:** “LOCATION — DUBLIN” — Rule 400ms; type +180ms
- **Example:** https://www.motionvfx.com/design-studio/collections/mtitle-cinematic-2
- **Example:** https://elements.envato.com/video-templates/after-effects/titles
- **Example:** https://www.apple.com/final-cut-pro/motion/
- **Tools:** AE: Shape trim + text · Premiere: MOGRT · Resolve: Fusion · CapCut: Shape + delay
- **Don't:** Don't start type before rule ≥50%.

#### `prem_impact_stamp_layers` — Impact stamp (layered)
- **Look:** Stamp + shadow slam + brief shake + flash frame.
- **Why premium:** Designed density combo: stamp+shake+flash.
- **Layers:** 3 — see registry for full per-property keyframes
- **Motion blur:** `{"enabled": true, "shutterAngle": 180}`
- **SFX:** whoosh, hit
- **Photography example:** “SOLD OUT” — Stamp→shake→2f flash
- **Example:** https://misterhorse.com/animation-composer
- **Example:** https://www.videocaptions.ai/caption-styles/mrbeast-style
- **Example:** https://arwriterai.com/en/blog/best-capcut-effects-transitions-boost-views-2026/
- **Tools:** AE: Precomp recipe · Premiere: MOGRT · Resolve: Fusion macro · CapCut: Combo
- **Don't:** Don't use every line.

#### `prem_counter_spring_roll` — Spring number roll
- **Look:** Digits roll with per-digit stagger and spring.
- **Why premium:** Per-digit stagger + spring — above linear counters.
- **Layers:** 1 — see registry for full per-property keyframes
- **Stagger:** `{"unit": "digit", "ms": 40}`
- **SFX:** tick_roll
- **Photography example:** “ISO 100 → 6400” — 1s roll; digits cascade 40ms
- **Example:** https://www.videocaptions.ai/caption-styles/mrbeast-style
- **Example:** https://misterhorse.com/animation-composer
- **Example:** https://olafmotion.com/tutorials/kinetic-text-animation-tutorial/
- **Tools:** AE: Slider + expression · Premiere: MOGRT · Resolve: Text+ expr · CapCut: Text effects
- **Don't:** Don't finish before number spoken.

#### `prem_match_move_title` — Match-move title stick
- **Look:** Title sticks to tracked point on moving cam/object.
- **Why premium:** 3D camera solve / point track — type in world space.
- **Layers:** 2 — see registry for full per-property keyframes
- **Photography example:** “85mm” — Stick to lens ring; fade when track confident
- **Example:** https://www.videocopilot.net/
- **Example:** https://www.motionvfx.com/
- **Example:** https://jakeinmotion.com/
- **Tools:** AE: Track / Camera Tracker · Premiere: AE · Resolve: Camera tracker · CapCut: Tracking
- **Don't:** Don't show during track slip.

#### `prem_scale_blur_impact` — Scale-blur impact word
- **Look:** One word scales 1.6→1 with heavy blur clearing.
- **Why premium:** Multi-prop impact (scale+blur+opacity) — punch vocabulary.
- **Layers:** 1 — see registry for full per-property keyframes
- **Motion blur:** `{"enabled": true, "shutterAngle": 180}`
- **SFX:** hit
- **Photography example:** “WRONG” — Impact on correction beat
- **Example:** https://www.sonicmusicrecords.com/top-10-kinetic-typography-techniques-in-adobe-after-effects/
- **Example:** https://misterhorse.com/animation-composer
- **Example:** https://www.storycut.com/features/hormozi-captions
- **Tools:** AE: Scale+Blur animators · Premiere: MOGRT · Resolve: Transform+Blur · CapCut: Pop+Blur
- **Don't:** Don't impact every word.

#### `prem_gradient_wipe_title` — Gradient wipe title
- **Look:** Soft gradient matte reveals title left→right.
- **Why premium:** Feathered matte > hard wipe — premium soft reveal.
- **Layers:** 1 — see registry for full per-property keyframes
- **SFX:** whoosh_soft
- **Photography example:** “NATURAL LIGHT” — Gradient wipe 800ms feather 40px
- **Example:** https://www.motionvfx.com/design-studio/collections/mtitle-cinematic-2
- **Example:** https://elements.envato.com/video-templates/after-effects/titles
- **Example:** https://olafmotion.com/tutorials/how-to-animate-text-in-after-effects-pro/
- **Tools:** AE: Gradient wipe / matte · Premiere: MOGRT · Resolve: Fusion soft mask · CapCut: Mask soft
- **Don't:** Don't use hard rectangular wipe for luxury.

### element (12)

#### `prem_shape_burst` — Shape-layer burst
- **Look:** Geometric shards burst from impact then fade.
- **Why premium:** Shape particles with stagger + overshoot — Envato staple.
- **Layers:** 1 — see registry for full per-property keyframes
- **Stagger:** `{"unit": "shape", "ms": 25}`
- **SFX:** pop_cluster, hit
- **Photography example:** “(burst on shutter click)” — 12 shapes stagger 25ms from hotshoe
- **Example:** https://elements.envato.com/video-templates/after-effects/titles
- **Example:** https://misterhorse.com/animation-composer
- **Example:** https://www.mtmograph.com/
- **Tools:** AE: Shape layers / particles · Premiere: MOGRT pack · Resolve: Fusion particles · CapCut: Sticker burst
- **Don't:** Don't obscure faces.

#### `prem_tracked_lower_third` — Tracked lower third (planar)
- **Look:** Nameplate follows planar track on wall/laptop/plane.
- **Why premium:** Footage interaction via tracking — agency premium.
- **Layers:** 2 — see registry for full per-property keyframes
- **SFX:** whoosh_soft
- **Photography example:** “GLENN SOMERS · Educator” — Track wall; plate once stable
- **Example:** https://www.motionvfx.com/
- **Example:** https://www.videocopilot.net/
- **Example:** https://elements.envato.com/learn/motion-graphics-for-short-form-video
- **Tools:** AE: Mocha + parent · Premiere: AE link · Resolve: Tracker + Fusion · CapCut: Tracking/keyframe
- **Don't:** Don't start before track stable.

#### `prem_callout_draw_glow` — Callout draw + glow settle
- **Look:** Stroke draws around detail; soft glow settles.
- **Why premium:** Path draw + secondary glow — two-stage motion.
- **Layers:** 2 — see registry for full per-property keyframes
- **SFX:** tick, shimmer
- **Photography example:** “(circle zebra blinkies)” — Draw 480ms; glow +200ms
- **Example:** https://elements.envato.com/learn/motion-graphics-for-short-form-video
- **Example:** https://misterhorse.com/animation-composer
- **Tools:** AE: Trim Paths + Glow · Premiere: MOGRT · Resolve: Polygon + Soft Glow · CapCut: Shape + Glow
- **Don't:** Don't share band with captions.

#### `prem_ken_burns_ease` — Ken Burns eased path
- **Look:** Still zooms/pans on curved ease toward eye/product.
- **Why premium:** Ease-in-out path + single dominant axis.
- **Layers:** 1 — see registry for full per-property keyframes
- **Photography example:** “(portfolio still → eye)” — 3.2s ease into catchlight
- **Example:** https://arwriterai.com/en/blog/best-capcut-effects-transitions-boost-views-2026/
- **Example:** https://elements.envato.com/learn/motion-graphics-for-short-form-video
- **Tools:** AE: Transform + graph · Premiere: Effect controls · Resolve: Transform · CapCut: Keyframes
- **Don't:** Don't animate X+Y aggressively together.

#### `prem_card_flip_3d` — Card flip 3D
- **Look:** Info card flips on Y revealing reverse.
- **Why premium:** Perspective 3D + shadow + settle.
- **Layers:** 1 — see registry for full per-property keyframes
- **Motion blur:** `{"enabled": true, "shutterAngle": 180}`
- **SFX:** whoosh_soft
- **Photography example:** “SOOC → Edited” — Flip 700ms on before/after beat
- **Example:** https://elements.envato.com/video-templates/after-effects/titles
- **Example:** https://misterhorse.com/animation-composer
- **Example:** https://www.apple.com/final-cut-pro/motion/
- **Tools:** AE: 3D rotateY · Premiere: MOGRT · Resolve: Fusion 3D · CapCut: 3D flip
- **Don't:** Don't flip while fine text must be read mid-turn.

#### `prem_speed_ramp_optical` — Optical-flow speed ramp
- **Look:** Ramp 0.5×→2× with optical flow; freeze on impact.
- **Why premium:** Optical flow + intentional freeze — retention craft.
- **Layers:** 1 — see registry for full per-property keyframes
- **SFX:** bass, click
- **Photography example:** “(ramp into shutter press)” — 14f ramp; freeze 2f on click
- **Example:** https://arwriterai.com/en/blog/best-capcut-effects-transitions-boost-views-2026/
- **Example:** https://neuvo.co/viral-instagram-reel-transition-techniques/
- **Tools:** AE: Time remap + pixel motion · Premiere: Optical flow · Resolve: Retime OF · CapCut: Speed ramp
- **Don't:** Don't ramp dialogue talking-head.

#### `prem_zoom_punch_blur` — Zoom punch + radial blur
- **Look:** Punch-in with brief radial blur that clears on settle.
- **Why premium:** Velocity blur as secondary to scale.
- **Layers:** 2 — see registry for full per-property keyframes
- **SFX:** whoosh
- **Photography example:** “(punch to catchlight)” — 280ms punch; radial peaks mid
- **Example:** https://arwriterai.com/en/blog/best-capcut-effects-transitions-boost-views-2026/
- **Example:** https://olafmotion.com/tutorials/how-to-animate-text-in-after-effects-pro/
- **Tools:** AE: Transform + Radial Fast Blur · Premiere: Transform + blur · Resolve: Zoom + blur · CapCut: Punch + blur
- **Don't:** Don't leave radial on settled frame.

#### `prem_map_route_pulse` — Map route + pulse dot
- **Look:** Path draws; tip pulse; pin pops.
- **Why premium:** Staggered pin pops + pulse — travel editorial.
- **Layers:** 2 — see registry for full per-property keyframes
- **SFX:** whoosh_soft, pin_pop
- **Photography example:** “studio → overlook” — Path 1.4s; pins at ends
- **Example:** https://elements.envato.com/learn/motion-graphics-for-short-form-video
- **Example:** https://www.mtmograph.com/
- **Tools:** AE: Trim Paths + null · Premiere: MOGRT · Resolve: Fusion · CapCut: Keyframe stroke
- **Don't:** Don't show tiny street labels.

#### `prem_screenshot_spring` — Screenshot spring dock
- **Look:** UI card springs from below with shadow lift.
- **Why premium:** Spring physics + shadow secondary + settle.
- **Layers:** 2 — see registry for full per-property keyframes
- **SFX:** pop
- **Photography example:** “(IG insights)” — Spring dock 320–400ms; shadow lifts
- **Example:** https://misterhorse.com/animation-composer
- **Example:** https://www.capcut.com/create/animated-text-maker
- **Example:** https://elements.envato.com/learn/motion-graphics-for-short-form-video
- **Tools:** AE: Spring + drop shadow · Premiere: MOGRT · Resolve: Transform + shadow · CapCut: Elastic in
- **Don't:** Don't cover captions with UI.

#### `prem_hand_ui_cursor` — Cursor / hand UI guide
- **Look:** Cursor/hand taps UI or product hotspot.
- **Why premium:** Guided attention with easing + click scale.
- **Layers:** 1 — see registry for full per-property keyframes
- **SFX:** click
- **Photography example:** “(tap histogram button)” — Move 700ms; click squash at target
- **Example:** https://elements.envato.com/learn/motion-graphics-for-short-form-video
- **Example:** https://misterhorse.com/animation-composer
- **Tools:** AE: Null + icon · Premiere: MOGRT · Resolve: Fusion · CapCut: Sticker keyframes
- **Don't:** Don't cover the detail indicated.

#### `prem_progress_chapter` — Chapter progress rail
- **Look:** Thin mid-frame rail with chapter ticks filling.
- **Why premium:** Editorial progress UI clear of bottom safe zone.
- **Layers:** 1 — see registry for full per-property keyframes
- **Photography example:** “3 fixes for soft images” — Rail at y≈0.53 fills with tip
- **Example:** https://www.solidlabs.com/social-safe-zones
- **Example:** https://elements.envato.com/learn/motion-graphics-for-short-form-video
- **Tools:** AE: Shape width · Premiere: MOGRT · Resolve: Fusion · CapCut: Keyframe
- **Don't:** Don't put rail in bottom 35%.

#### `prem_circle_mask_pop` — Circle mask pop
- **Look:** Circular mask expands from product hotspot.
- **Why premium:** Mask-as-motion + overshoot — CapCut/AE staple elevated.
- **Layers:** 1 — see registry for full per-property keyframes
- **SFX:** pop
- **Photography example:** “(pop on AF point)” — Circle expands 420ms with overshoot
- **Example:** https://www.youtube.com/watch?v=jEI0iQj7Mzc
- **Example:** https://www.capcut.com/create/animated-text-maker
- **Example:** https://misterhorse.com/animation-composer
- **Tools:** AE: Ellipse matte · Premiere: Track matte · Resolve: Shape mask · CapCut: Mask
- **Don't:** Don't expand covering face mid-VO.

### transition (6)

#### `prem_whip_blur_matchcut` — Whip-blur match cut
- **Look:** Directional blur hides cut; vectors match exit→enter.
- **Why premium:** Matched motion vectors + blur + whoosh.
- **Layers:** 1 — see registry for full per-property keyframes
- **SFX:** whoosh
- **Photography example:** “(studio → location)” — 220ms whip; direction matched
- **Example:** https://neuvo.co/viral-instagram-reel-transition-techniques/
- **Example:** https://videowizardtools.com/capcut-transitions-for-reels-tiktok/
- **Example:** https://www.capcut.com/tools/free-video-transitions
- **Tools:** AE: Directional Blur · Premiere: Direction Blur · Resolve: Motion blur · CapCut: Motion whip
- **Don't:** Don't whip without matching pan.

#### `prem_iris_optical` — Optical iris wipe
- **Look:** Aperture-like circle wipe centered on lens/subject.
- **Why premium:** On-niche metaphor + feathered matte + timed SFX.
- **Layers:** 1 — see registry for full per-property keyframes
- **SFX:** whoosh_soft, shutter
- **Photography example:** “(iris into lens close-up)” — 420ms iris from glass center
- **Example:** https://www.capcut.com/tools/free-video-transitions
- **Example:** https://videowizardtools.com/capcut-transitions-for-reels-tiktok/
- **Example:** https://elements.envato.com/learn/motion-graphics-for-short-form-video
- **Tools:** AE: Iris wipe · Premiere: Iris · Resolve: Shape mask · CapCut: Mask circle
- **Don't:** Don't use 1s+ iris on hooks.

#### `prem_flash_frame_grade` — Grade flash (2-frame)
- **Look:** 2-frame near-white/warm flash timed to hit SFX.
- **Why premium:** Short, intentional, graded — not 15-frame default.
- **Layers:** 1 — see registry for full per-property keyframes
- **SFX:** hit
- **Photography example:** “(into first B-roll)” — 2 frames @30fps ≈67ms
- **Example:** https://arwriterai.com/en/blog/best-capcut-effects-transitions-boost-views-2026/
- **Example:** https://neuvo.co/viral-instagram-reel-transition-techniques/
- **Tools:** AE: Adjustment solid · Premiere: Dip to white short · Resolve: Flash frame · CapCut: Flash short
- **Don't:** Don't use long default flashes.

#### `prem_glitch_graded` — Graded glitch transition
- **Look:** Short RGB/block glitch ~40% intensity with grade intact.
- **Why premium:** Intensity discipline + SFX sync.
- **Layers:** 1 — see registry for full per-property keyframes
- **SFX:** glitch
- **Photography example:** “(into mirrorless vs DSLR)” — 8 frames; electronic hit frame 1
- **Example:** https://neuvo.co/viral-instagram-reel-transition-techniques/
- **Example:** https://www.capcut.com/tools/free-video-transitions
- **Example:** https://arwriterai.com/en/blog/best-capcut-effects-transitions-boost-views-2026/
- **Tools:** AE: Glitch limited · Premiere: Effects · Resolve: RGB split · CapCut: Glitch 40%
- **Don't:** Don't stack with shake+flash.

#### `prem_zoom_through_letter` — Zoom-through letter portal
- **Look:** Camera pushes through giant glyph into next scene.
- **Why premium:** Match-cut portal with opacity falloff.
- **Layers:** 1 — see registry for full per-property keyframes
- **SFX:** whoosh_deep
- **Photography example:** “GO” — Push through O into location B-roll
- **Example:** https://elements.envato.com/learn/motion-graphics-for-short-form-video
- **Example:** https://infinitecreation.io/tutorial-kinetic-text
- **Example:** https://arwriterai.com/en/blog/best-capcut-effects-transitions-boost-views-2026/
- **Tools:** AE: Scale + opacity + cut · Premiere: Nested · Resolve: Transform · CapCut: Keyframe zoom
- **Don't:** Don't use with small captions.

#### `prem_paper_tear_wipe` — Paper tear wipe
- **Look:** Torn-edge matte reveals next shot.
- **Why premium:** Textured matte + organic edge — editorial/print feel.
- **Layers:** 1 — see registry for full per-property keyframes
- **SFX:** paper, whoosh_soft
- **Photography example:** “(tear into print layout)” — 500ms tear wipe
- **Example:** https://elements.envato.com/learn/motion-graphics-for-short-form-video
- **Example:** https://www.capcut.com/tools/free-video-transitions
- **Tools:** AE: Torn matte footage · Premiere: Track matte · Resolve: Matte · CapCut: Tear transition
- **Don't:** Don't use on every cut.

### overlay (4)

#### `prem_light_leak_overlay` — Organic light leak overlay
- **Look:** Warm analog leak drifts across cut with soft-light.
- **Why premium:** Texture/overlay grade language — cinematic.
- **Layers:** 1 — see registry for full per-property keyframes
- **Photography example:** “(leak into golden-hour B-roll)” — 700ms soft-light leak on cut
- **Example:** https://neuvo.co/viral-instagram-reel-transition-techniques/
- **Example:** https://elements.envato.com/learn/motion-graphics-for-short-form-video
- **Example:** https://arwriterai.com/en/blog/best-capcut-effects-transitions-boost-views-2026/
- **Tools:** AE: Leak footage / fractal · Premiere: Overlay track · Resolve: Soft light · CapCut: Overlay leak
- **Don't:** Don't stack leak+flash+glitch.

#### `prem_film_grain_texture` — Film grain + vignette
- **Look:** Subtle animated grain + soft vignette unify plate.
- **Why premium:** Texture cohesion — cinematic title packs.
- **Layers:** 2 — see registry for full per-property keyframes
- **Photography example:** “(always-on grade plate)” — Grain 18%; vignette 25%
- **Example:** https://www.motionvfx.com/design-studio/collections/mtitle-cinematic-2
- **Example:** https://elements.envato.com/learn/motion-graphics-for-short-form-video
- **Example:** https://www.premiumbeat.com/blog/
- **Tools:** AE: Noise + vignette · Premiere: Lumetri + noise · Resolve: Film Grain · CapCut: Grain + Vignette
- **Don't:** Don't crush fine type with grain.

#### `prem_hud_camera_chrome` — Cinematic camera HUD
- **Look:** REC, timecode, exposure, AF box — mono, blinking REC.
- **Why premium:** Themed UI overlay with timing discipline + safe insets.
- **Layers:** 1 — see registry for full per-property keyframes
- **SFX:** beep
- **Photography example:** “REC · ISO6400 1/40 f/1.8” — 2–4s motif then clear for captions
- **Example:** https://elements.envato.com/learn/motion-graphics-for-short-form-video
- **Example:** https://www.apple.com/final-cut-pro/motion/
- **Tools:** AE: Shape + mono text · Premiere: MOGRT HUD · Resolve: Fusion · CapCut: Stickers + text
- **Don't:** Don't cover faces whole tip.

#### `prem_parallax_bg_drift` — Parallax BG drift plate
- **Look:** Slow drifting textured BG behind type for depth.
- **Why premium:** Continuous subtle secondary motion under titles.
- **Layers:** 1 — see registry for full per-property keyframes
- **Photography example:** “(under PORTRAIT title)” — 12s slow drift −40px
- **Example:** https://www.motionvfx.com/design-studio/collections/mtitle-cinematic-2
- **Example:** https://elements.envato.com/learn/motion-graphics-for-short-form-video
- **Tools:** AE: BG plate + null · Premiere: Nested · Resolve: Transform · CapCut: Keyframe BG
- **Don't:** Don't drift so fast it distracts from type.

### fx (7)

#### `prem_specular_glint` — Specular glint bar
- **Look:** Thin diagonal highlight sweeps once across logo/title.
- **Why premium:** Secondary light motion — luxury/editorial cue.
- **Layers:** 1 — see registry for full per-property keyframes
- **SFX:** shimmer
- **Photography example:** “SOMERS” — Single glint 650ms after title lands
- **Example:** https://www.motionvfx.com/design-studio/collections/mtitle-cinematic-2
- **Example:** https://elements.envato.com/video-templates/after-effects/titles
- **Example:** https://www.benmarriott.com/
- **Tools:** AE: Shape highlight + add · Premiere: MOGRT · Resolve: Soft Glow sweep · CapCut: Shine
- **Don't:** Don't loop glint every second.

#### `prem_outer_glow_breathe` — Outer glow breathe
- **Look:** Soft glow amplitude breathes then rests.
- **Why premium:** Controlled secondary motion after primary land.
- **Layers:** 1 — see registry for full per-property keyframes
- **Photography example:** “f/1.4” — Glow breathes once; settles 0.3
- **Example:** https://www.motionvfx.com/mCaptionsAI
- **Example:** https://elements.envato.com/learn/motion-graphics-for-short-form-video
- **Tools:** AE: Glow keyframes · Premiere: Glow · Resolve: Soft Glow · CapCut: Glow
- **Don't:** Don't breathe forever under dense captions.

#### `prem_reflection_floor` — Floor reflection type
- **Look:** Mirrored fade of title beneath glossy floor.
- **Why premium:** Fake reflection = depth cue in luxury titles.
- **Layers:** 2 — see registry for full per-property keyframes
- **Photography example:** “STUDIO” — Main lands; reflection to 28%
- **Example:** https://elements.envato.com/video-templates/after-effects/titles
- **Example:** https://www.motionvfx.com/design-studio/collections/mtitle-cinematic-2
- **Example:** https://www.apple.com/final-cut-pro/motion/
- **Tools:** AE: Dup + flip + mask · Premiere: MOGRT · Resolve: Fusion · CapCut: Dup flip opacity
- **Don't:** Don't use over busy floors.

#### `prem_audio_reactive_scale` — Audio-reactive scale
- **Look:** Scale/brightness pulses with music amplitude.
- **Why premium:** Audio-driven motion — beat sync beyond manual markers.
- **Layers:** 1 — see registry for full per-property keyframes
- **Photography example:** “CLICK” — Scale pulses to snare ±8%
- **Example:** https://misterhorse.com/animation-composer
- **Example:** https://olafmotion.com/tutorials/kinetic-text-animation-tutorial/
- **Example:** https://www.schoolofmotion.com/
- **Tools:** AE: Audio Amplitude + expr · Premiere: AE/Essential Sound · Resolve: Audio modifiers · CapCut: Beat sync
- **Don't:** Don't react every sample — smooth + threshold.

#### `prem_drop_shadow_lift` — Drop-shadow depth lift
- **Look:** As type scales in, shadow softens/offsets to fake lift.
- **Why premium:** Shadow as secondary motion tied to Z-fake.
- **Layers:** 2 — see registry for full per-property keyframes
- **Photography example:** “LIGHT” — Shadow blur 4→18 as type springs
- **Example:** https://elements.envato.com/learn/motion-graphics-for-short-form-video
- **Example:** https://olafmotion.com/tutorials/how-to-animate-text-in-after-effects-pro/
- **Tools:** AE: Drop Shadow keyframes · Premiere: Shadow · Resolve: Shadow · CapCut: Shadow
- **Don't:** Don't use hard 0-blur shadows on cinematic grades.

#### `prem_dual_exposure_type` — Dual-exposure type blend
- **Look:** Type blended into footage via screen/add or silhouette.
- **Why premium:** Compositing interaction — type lives in the image.
- **Layers:** 1 — see registry for full per-property keyframes
- **Photography example:** “SEA” — Title screens over ocean 600ms
- **Example:** https://elements.envato.com/video-templates/after-effects/titles
- **Example:** https://www.motionvfx.com/design-studio/collections/mtitle-cinematic-2
- **Example:** https://www.videocopilot.net/
- **Tools:** AE: Blend modes / matte · Premiere: Blend · Resolve: Composite · CapCut: Blend modes
- **Don't:** Don't use low-contrast plates.

#### `prem_dup_offset_rgb` — RGB duplicate offset settle
- **Look:** R/G/B copies offset then converge to clean type.
- **Why premium:** Chromatic settle as entrance — controlled CA.
- **Layers:** 3 — see registry for full per-property keyframes
- **SFX:** glitch_soft
- **Photography example:** “RAW” — RGB offset converges 400ms
- **Example:** https://arwriterai.com/en/blog/best-capcut-effects-transitions-boost-views-2026/
- **Example:** https://neuvo.co/viral-instagram-reel-transition-techniques/
- **Example:** https://www.sonicmusicrecords.com/top-10-kinetic-typography-techniques-in-adobe-after-effects/
- **Tools:** AE: Three fills RGB · Premiere: MOGRT · Resolve: RGB Split settle · CapCut: RGB effect
- **Don't:** Don't leave RGB copies visible after settle.

### layout (6)

#### `prem_type_reflow_layout` — Typographic reflow layout
- **Look:** Words rearrange stacked→inline with springs.
- **Why premium:** Layout animation, not just entrance — editorial kinetic.
- **Layers:** 2 — see registry for full per-property keyframes
- **SFX:** ticks_cascade
- **Photography example:** “SHOT TIGHT” — Two stacked words spring onto one baseline
- **Example:** https://elements.envato.com/video-templates/after-effects/titles
- **Example:** https://www.mtmograph.com/
- **Example:** https://infinitecreation.io/tutorial-kinetic-text
- **Tools:** AE: Word layers + null · Premiere: MOGRT · Resolve: Fusion · CapCut: Keyframe positions
- **Don't:** Don't reflow while still reading start.

#### `prem_credit_roll_cinematic` — Cinematic vertical credit
- **Look:** Slow vertical crawl with optical spacing; fade head/tail.
- **Why premium:** Restraint, timing, opacity masking — film language.
- **Layers:** 2 — see registry for full per-property keyframes
- **Photography example:** “Glenn Somers · Photography” — 8s crawl; soft edge fades
- **Example:** https://www.motionvfx.com/design-studio/collections/mtitle-cinematic-2
- **Example:** https://www.apple.com/final-cut-pro/motion/
- **Example:** https://elements.envato.com/learn/motion-graphics-for-short-form-video
- **Tools:** AE: Position linear + feather mask · Premiere: Credits roll · Resolve: Text+ scroll · CapCut: Keyframe Y
- **Don't:** Don't speed crawl unreadably.

#### `prem_beat_cascade_sequence` — Beat-synced cascade sequence
- **Look:** On each beat next word springs; previous dims.
- **Why premium:** Musical sequencing + spring + dim hierarchy.
- **Layers:** 1 — see registry for full per-property keyframes
- **Stagger:** `{"unit": "line", "sync": "beat", "beatMs": 500}`
- **SFX:** kick_tick
- **Photography example:** “Meter. → Aperture. → ISO.” — Each beat @500ms next springs; prior →0.35
- **Example:** https://olafmotion.com/tutorials/kinetic-text-animation-tutorial/
- **Example:** https://misterhorse.com/animation-composer
- **Example:** https://infinitecreation.io/tutorial-kinetic-text
- **Tools:** AE: Markers + stagger · Premiere: Markers · Resolve: Markers · CapCut: Beat detect
- **Don't:** Don't fight ASR on dialogue tips.

#### `prem_split_wipe_grade` — Split wipe + grade mismatch
- **Look:** SOOC|Edited split; divider wipe; grade contrast.
- **Why premium:** Wiped divider + labeled panes + intentional grade delta.
- **Layers:** 1 — see registry for full per-property keyframes
- **Photography example:** “SOOC | Edited” — Divider wipe 280ms; Bebas labels
- **Example:** https://arwriterai.com/en/blog/best-capcut-effects-transitions-boost-views-2026/
- **Example:** https://elements.envato.com/learn/motion-graphics-for-short-form-video
- **Tools:** AE: Track mattes · Premiere: Crop + wipe · Resolve: OpenFX · CapCut: Overlay split
- **Don't:** Don't put paragraphs in panes.

#### `prem_center_lockup_breathe` — Center lockup breathe
- **Look:** Logo+wordmark scales almost imperceptibly after land.
- **Why premium:** Post-land secondary motion — luxury restraint.
- **Layers:** 1 — see registry for full per-property keyframes
- **Photography example:** “SOMERS.jpg” — After land, 2.4s breathe ±2.5%
- **Example:** https://www.motionvfx.com/design-studio/collections/mtitle-cinematic-2
- **Example:** https://www.benmarriott.com/
- **Example:** https://elements.envato.com/learn/motion-graphics-for-short-form-video
- **Tools:** AE: Scale loop subtle · Premiere: MOGRT · Resolve: Transform · CapCut: Scale keyframes
- **Don't:** Don't breathe >3%.

#### `prem_em_dash_split` — Em-dash split title
- **Look:** Left phrase and right phrase slide to meet an em dash.
- **Why premium:** Typographic layout choreography — editorial openers.
- **Layers:** 3 — see registry for full per-property keyframes
- **SFX:** whoosh_soft
- **Photography example:** “LIGHT — SHADOW” — Sides meet; dash grows
- **Example:** https://www.motionvfx.com/design-studio/collections/mtitle-cinematic-2
- **Example:** https://elements.envato.com/video-templates/after-effects/titles
- **Example:** https://www.benmarriott.com/
- **Tools:** AE: 3 text layers · Premiere: MOGRT · Resolve: Fusion · CapCut: 3 texts keyframed
- **Don't:** Don't squeeze past side safe margins.

## Combo recipes

### `combo_hook_title` — Hook title stack
- **Uses:** `prem_mask_reveal_light_sweep`, `prem_tracking_expand`, `prem_specular_glint`, `prem_whip_blur_matchcut`
- **Beat:** Mask+glint title → tracking settle → whip into talking-head
- **Example line:** “STOP SHOOTING AT NOON”
- **Link:** https://www.motionvfx.com/design-studio/collections/mtitle-cinematic-2
- **Link:** https://olafmotion.com/tutorials/kinetic-text-animation-tutorial/
- **Link:** https://neuvo.co/viral-instagram-reel-transition-techniques/
- **Don't:** Don't exceed ~1.2s before first spoken word.

### `combo_product_gear` — Gear reveal
- **Uses:** `prem_focus_pull_title`, `prem_callout_draw_glow`, `prem_zoom_punch_blur`, `prem_specular_glint`
- **Beat:** Focus-pull type → circle callout on glass → punch → glint
- **Example line:** “85mm · f/1.4”
- **Link:** https://elements.envato.com/learn/motion-graphics-for-short-form-video
- **Link:** https://misterhorse.com/animation-composer
- **Don't:** Don't callout and caption same vertical band.

### `combo_bts` — BTS handheld energy
- **Uses:** `prem_soft_spring_caption`, `prem_hud_camera_chrome`, `prem_light_leak_overlay`, `prem_flash_frame_grade`
- **Beat:** HUD 2s → soft spring captions → leak/flash between clips
- **Example line:** “Behind the shoot”
- **Link:** https://elements.envato.com/learn/motion-graphics-for-short-form-video
- **Link:** https://arwriterai.com/en/blog/best-capcut-effects-transitions-boost-views-2026/
- **Don't:** Don't leave HUD up during dense captions.

### `combo_luxury_editorial` — Luxury editorial open
- **Uses:** `prem_tracking_expand`, `prem_line_grow_type`, `prem_film_grain_texture`, `prem_center_lockup_breathe`
- **Beat:** Line grow → tracking title → grain plate → breathe
- **Example line:** “PORTRAIT — DUBLIN”
- **Link:** https://www.motionvfx.com/design-studio/collections/mtitle-cinematic-2
- **Link:** https://www.benmarriott.com/
- **Don't:** Don't add bounce or emoji.

### `combo_doc_interview` — Documentary interview
- **Uses:** `prem_subtitle_safe_fade`, `prem_tracked_lower_third`, `prem_film_grain_texture`
- **Beat:** Lower third once → safe subtitles fade · grain subtle
- **Example line:** “Meter for the highlights”
- **Link:** https://www.motionvfx.com/store,mtitle-cinematic-2-dvr,p3795.html
- **Link:** https://www.solidlabs.com/social-safe-zones
- **Don't:** Don't karaoke-bounce interview subs.

### `combo_travel` — Travel arrival
- **Uses:** `prem_map_route_pulse`, `prem_parallax_stack_type`, `prem_light_leak_overlay`, `prem_whip_blur_matchcut`
- **Beat:** Map path → parallax title → whip to wide
- **Example line:** “Dublin → Howth”
- **Link:** https://elements.envato.com/learn/motion-graphics-for-short-form-video
- **Link:** https://neuvo.co/viral-instagram-reel-transition-techniques/
- **Don't:** Don't keep map labels readable-small.

### `combo_wedding` — Wedding soft open
- **Uses:** `prem_focus_pull_title`, `prem_ink_brush_write`, `prem_specular_glint`, `prem_film_grain_texture`
- **Beat:** Focus pull names → ink date → glint → grain
- **Example line:** “A & J · June”
- **Link:** https://www.motionvfx.com/design-studio/collections/mtitle-cinematic-2
- **Link:** https://www.capcut.com/resource/create-handwritten-animation
- **Don't:** Don't use glitch/stomp.

### `combo_tech_minimal` — Tech minimal
- **Uses:** `prem_weight_crossfade_premium`, `prem_box_slide_highlight`, `prem_drop_shadow_lift`
- **Beat:** Weight morph captions + sliding pill on keywords
- **Example line:** “clarity over noise”
- **Link:** https://www.submagic.co/blog/how-to-make-captions-like-iman-gadzhi
- **Link:** https://www.captions.ai/
- **Don't:** Don't add neon flicker.

### `combo_street_film` — Street film-camera
- **Uses:** `prem_hud_camera_chrome`, `prem_chromatic_impact`, `prem_flash_frame_grade`, `prem_film_grain_texture`
- **Beat:** HUD → CA hit on photo → flash → grain
- **Example line:** “REC · Zone-focus”
- **Link:** https://arwriterai.com/en/blog/best-capcut-effects-transitions-boost-views-2026/
- **Link:** https://neuvo.co/viral-instagram-reel-transition-techniques/
- **Don't:** Don't full-time glitch.

### `combo_before_after` — Before/after payoff
- **Uses:** `prem_split_wipe_grade`, `prem_card_flip_3d`, `prem_zoom_punch_blur`
- **Beat:** Split wipe → optional card flip → punch on edited eye
- **Example line:** “SOOC | Edited”
- **Link:** https://arwriterai.com/en/blog/best-capcut-effects-transitions-boost-views-2026/
- **Link:** https://elements.envato.com/learn/motion-graphics-for-short-form-video
- **Don't:** Don't tiny-text the panes.

### `combo_agency_open` — Agency kinetic open
- **Uses:** `prem_stagger_cascade_blur`, `prem_echo_trail_type`, `prem_shape_burst`, `prem_whip_blur_matchcut`
- **Beat:** Cascade letters → echo exit → burst → whip
- **Example line:** “FRAME”
- **Link:** https://mikemurphy.ai/tutorials/textanimators/
- **Link:** https://misterhorse.com/animation-composer
- **Link:** https://www.sonicmusicrecords.com/top-10-kinetic-typography-techniques-in-adobe-after-effects/
- **Don't:** Don't cascade letter body captions.

### `combo_education_glow` — Education glow karaoke
- **Uses:** `prem_karaoke_glow_track`, `prem_zoom_punch_blur`, `prem_callout_draw_glow`
- **Beat:** Glow karaoke → punch to eyes → callout
- **Example line:** “Watch the catchlights”
- **Link:** https://autocaption.app/caption-styles/karaoke-captions
- **Link:** https://www.motionvfx.com/mCaptionsAI
- **Don't:** Don't over-glow into mush.

## Premium presets (≥15)

### `prem_cinematic_photographer` — Cinematic photographer
- **Font:** {'family': 'DM Sans', 'weight': 600, 'titleFamily': 'DM Serif Display'}
- **Animation:** `prem_soft_spring_caption` · **Combo:** `combo_luxury_editorial`
- **Example:** “Golden hour lasts minutes” — Soft spring captions + grain + occasional leak
- **Link:** https://www.motionvfx.com/design-studio/collections/mtitle-cinematic-2
- **Link:** https://elements.envato.com/learn/motion-graphics-for-short-form-video

### `prem_documentary` — Documentary
- **Font:** {'family': 'Inter', 'weight': 600}
- **Animation:** `prem_subtitle_safe_fade` · **Combo:** `combo_doc_interview`
- **Example:** “Meter for the highlights” — Safe fade subs + one lower third
- **Link:** https://www.motionvfx.com/store,mtitle-cinematic-2-dvr,p3795.html
- **Link:** https://www.solidlabs.com/social-safe-zones

### `prem_luxury_editorial` — Luxury / editorial
- **Font:** {'family': 'Cormorant Garamond', 'weight': 600, 'fallback': 'DM Serif Display'}
- **Animation:** `prem_tracking_expand` · **Combo:** `combo_luxury_editorial`
- **Example:** “PORTRAIT” — Tracking expand + line grow + single glint
- **Link:** https://www.motionvfx.com/design-studio/collections/mtitle-cinematic-2
- **Link:** https://www.benmarriott.com/

### `prem_gear_review` — Gear review
- **Font:** {'family': 'Montserrat', 'weight': 700, 'titleFamily': 'Bebas Neue'}
- **Animation:** `prem_soft_spring_caption` · **Combo:** `combo_product_gear`
- **Example:** “85mm · f/1.4” — Focus-pull title + callout + punch
- **Link:** https://elements.envato.com/learn/motion-graphics-for-short-form-video
- **Link:** https://misterhorse.com/animation-composer

### `prem_bts` — BTS / behind the shoot
- **Font:** {'family': 'Rubik', 'weight': 700}
- **Animation:** `prem_vertical_stack_pop` · **Combo:** `combo_bts`
- **Example:** “Behind the shoot” — HUD motif + stack pop captions + leaks
- **Link:** https://elements.envato.com/learn/motion-graphics-for-short-form-video
- **Link:** https://www.capcut.com/resource/how-to-put-text-behind-a-person-in-capcut

### `prem_tech_minimal` — Tech minimal
- **Font:** {'family': 'Inter', 'weight': 500, 'activeWeight': 700}
- **Animation:** `prem_weight_crossfade_premium` · **Combo:** `combo_tech_minimal`
- **Example:** “clarity over noise” — Weight crossfade + sliding pill
- **Link:** https://www.submagic.co/blog/how-to-make-captions-like-iman-gadzhi
- **Link:** https://www.captions.ai/

### `prem_street_film` — Street / film-camera
- **Font:** {'family': 'Space Mono', 'weight': 700, 'fallback': 'IBM Plex Mono'}
- **Animation:** `prem_chromatic_impact` · **Combo:** `combo_street_film`
- **Example:** “ZONE FOCUS” — HUD + CA impact + grain
- **Link:** https://neuvo.co/viral-instagram-reel-transition-techniques/
- **Link:** https://arwriterai.com/en/blog/best-capcut-effects-transitions-boost-views-2026/

### `prem_wedding` — Wedding / romance
- **Font:** {'family': 'Cormorant Garamond', 'weight': 500, 'accentFamily': 'Caveat'}
- **Animation:** `prem_focus_pull_title` · **Combo:** `combo_wedding`
- **Example:** “A & J · June” — Focus pull + ink date + glint
- **Link:** https://www.motionvfx.com/design-studio/collections/mtitle-cinematic-2
- **Link:** https://www.capcut.com/resource/create-handwritten-animation

### `prem_travel` — Travel
- **Font:** {'family': 'Bebas Neue', 'weight': 400, 'bodyFamily': 'Montserrat'}
- **Animation:** `prem_parallax_stack_type` · **Combo:** `combo_travel`
- **Example:** “DUBLIN → HOWTH” — Map → parallax title → whip
- **Link:** https://elements.envato.com/learn/motion-graphics-for-short-form-video
- **Link:** https://neuvo.co/viral-instagram-reel-transition-techniques/

### `prem_education_glow` — Education glow karaoke
- **Font:** {'family': 'Montserrat', 'weight': 750}
- **Animation:** `prem_karaoke_glow_track` · **Combo:** `combo_education_glow`
- **Example:** “Watch the catchlights in her eyes” — Glow karaoke per ASR word
- **Link:** https://autocaption.app/caption-styles/karaoke-captions
- **Link:** https://www.motionvfx.com/mCaptionsAI

### `prem_hook_slam` — Hook slam (premium)
- **Font:** {'family': 'Anton', 'weight': 400}
- **Animation:** `prem_impact_stamp_layers` · **Combo:** `combo_hook_title`
- **Example:** “STOP SHOOTING AT NOON” — Mask glint open OR stamp combo into VO
- **Link:** https://www.motionvfx.com/design-studio/collections/mtitle-cinematic-2
- **Link:** https://www.storycut.com/features/hormozi-captions
- **Link:** https://olafmotion.com/tutorials/kinetic-text-animation-tutorial/

### `prem_podcast_pill` — Podcast sliding pill
- **Font:** {'family': 'Inter', 'weight': 700}
- **Animation:** `prem_box_slide_highlight`
- **Example:** “ND filter first” — Sliding green pill + nameplate
- **Link:** https://autocaption.app/caption-styles/karaoke-captions
- **Link:** https://www.captions.ai/

### `prem_before_after` — Before / after
- **Font:** {'family': 'Bebas Neue', 'weight': 400}
- **Animation:** `prem_split_wipe_grade` · **Combo:** `combo_before_after`
- **Example:** “SOOC | EDITED” — Split wipe → punch on edited
- **Link:** https://arwriterai.com/en/blog/best-capcut-effects-transitions-boost-views-2026/
- **Link:** https://elements.envato.com/learn/motion-graphics-for-short-form-video

### `prem_agency_kinetic` — Agency kinetic
- **Font:** {'family': 'Montserrat', 'weight': 800}
- **Animation:** `prem_stagger_cascade_blur` · **Combo:** `combo_agency_open`
- **Example:** “FRAME” — Cascade blur letters + optional echo on exit
- **Link:** https://mikemurphy.ai/tutorials/textanimators/
- **Link:** https://www.sonicmusicrecords.com/top-10-kinetic-typography-techniques-in-adobe-after-effects/
- **Link:** https://misterhorse.com/animation-composer

### `prem_fcpx_cinematic` — FCP/Motion cinematic captions
- **Font:** {'family': 'SF Pro Display', 'fallback': 'Inter', 'weight': 600}
- **Animation:** `prem_mask_reveal_light_sweep`
- **Example:** “Light that wraps the face” — Mask reveal + light sweep title cards
- **Link:** https://www.motionvfx.com/design-studio/collections/mtitle-cinematic-2
- **Link:** https://www.motionvfx.com/mCaptionsAI
- **Link:** https://www.apple.com/final-cut-pro/motion/

### `prem_glenn_pro` — Glenn Pro (photography educator premium)
- **Font:** {'family': 'Montserrat', 'weight': 700, 'titleFamily': 'Bebas Neue'}
- **Animation:** `prem_soft_spring_caption` · **Combo:** `combo_product_gear`
- **Example:** “Expose for the highlights” — Soft spring in; highlights glow-karaoke; punch+callout on zebra; optional HUD motif
- **Link:** https://cutsio.com/blog/pop-up-text-tutorial-in-davinci-resolve-text-bounce-effect
- **Link:** https://olafmotion.com/tutorials/kinetic-text-animation-tutorial/
- **Link:** https://www.capcut.com/resource/how-to-put-text-behind-a-person-in-capcut

## Foundations note

Earlier basic caption/kinetic/element/transition entries remain in the registry as **`tier: foundations`** (46 entries). Use them as baselines; layer properties and secondary motion to graduate to Premium.

---
*v3 Premium upgrade — registry-driven. Links verified via curl; 404s dropped.*
