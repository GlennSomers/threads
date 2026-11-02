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

Assume **30 fps**. Durations given in **ms** and **frames**. Prefer spring/overshoot over linear.

### Shared data model

```ts
type Word = { text: string; startMs: number; endMs: number; isKeyword?: boolean };
type CaptionPage = { words: Word[]; startMs: number; endMs: number };
```

Word timings must come from ASR word-level timestamps (Whisper/faster-whisper style). If missing, fall back to even split — document that karaoke becomes approximate ([AutoCaption](https://autocaption.app/caption-styles/karaoke-captions)).

---

### 4.1 Word-by-word pop (Hormozi family)

**Description:** Only current 1–3 words visible; each scales in as spoken.
**When:** Hooks, sales, high-retention talking-head; NOT dense explainers.
**Params:**
- `wordsPerPage`: 2 (option 1 or 3)
- `enterDurationMs`: 120–180
- `scaleFrom`: 0.6–0.8 → `scaleTo`: 1.0 with overshoot `1.08` then settle
- `easing`: spring `stiffness≈400`, `damping≈18` (or cubic-bezier `0.34,1.56,0.64,1`)
- `opacity`: 0→1 in first 60 ms
- Optional `tiltDeg`: ±3–6 on land (StoryCut Hormozi Short 2026 E)
- Keyword: color swap instantly on appear; optional emoji

**Pseudo:**
```
onWordStart(w):
  show page containing w
  animate w: scale 0.7→1.08→1.0, opacity 0→1, duration 150ms
  if w.isKeyword: fill = accent
```

**CSS-like:**
```css
@keyframes word-pop {
  0%   { transform: scale(0.7); opacity: 0; }
  70%  { transform: scale(1.08); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
.word { animation: word-pop 150ms cubic-bezier(0.34,1.56,0.64,1) both; }
```

---

### 4.2 Karaoke highlight (color / wipe / box / bounce)

**Description:** Full line visible; active word changes style.
**When:** Education, podcast clips, lyrics, lists of figures ([AutoCaption](https://autocaption.app/caption-styles/karaoke-captions)).
**Submodes (VideoCaptions.AI):** ColorChange | Scale | Background box | Bounce.
**Params:**
- `restColor`: `#FFFFFF`
- `activeColor`: `#FFD400`
- `plateOpacity`: 0.32
- `outlinePx`: 2
- `activeScale`: 1.0 → 1.08 (Scale submode)
- Wipe: progress `t = (now - word.start)/(word.end - word.start)` across word glyph bounds (not even across whole line)

**Pseudo:**
```
render all words in page
for each word:
  if now in [start,end]: apply activeStyle (color/scale/box)
  elif now > end: apply spokenRest (optional keep gold or return white)
  else: dim or white rest
```

---

### 4.3 Bounce / scale-in (elastic)

**Description:** Word enters from below, overshoots up, settles (CapCut Bounce; GIRAFFRAME Bounce/Popup Bounce).
**When:** Lifestyle, comedy, energetic educators.
**Params (desktop keyframe recipe from CapCut guides):**
| t (ms) | y | scale | opacity | ease |
|--------|---|-------|---------|------|
| 0 | +40px | 0.90 | 0 | — |
| 300 | −12px | 1.05 | 1 | ease-out |
| 500 | +4px | 0.98 | 1 | ease-in-out |
| 700 | 0 | 1.00 | 1 | ease-out |

Mobile CapCut: Bounce in, duration **400–600 ms**, intensity ~70–80%.
Optional loop: breathing pulse 2–3s at 20–30% intensity after land.

---

### 4.4 Slide up

**Description:** Translates from below into place (GIRAFFRAME Slide In).
**Params:** `fromY=+60px`, `duration=250–350ms`, `ease=cubic-bezier(0.22,1,0.36,1)`, opacity 0→1 in first 120ms.
**When:** Softer than bounce; product demos, calm hooks.

---

### 4.5 Typewriter (char or word)

**Description:** Characters reveal L→R (VideoCaptions.AI Typewriter; GIRAFFRAME Typewriter).
**When:** Storytelling, “message being written,” mono/tech.
**Params:**
- Char mode: `msPerChar = clamp(duration/chars, 20, 45)`
- Word mode: reveal whole word on word.start
- Cursor optional: blink 530ms
- CapCut tip: keep enter ≤ ~200ms so reveal isn’t late vs speech

---

### 4.6 Fade

**Description:** Opacity only (GIRAFFRAME Fade In).
**Params:** 0→1 over **200–400 ms**, ease-out.
**When:** Minimal cinematic, documentary, photography educator calm moments.

---

### 4.7 Shake / emphasis

**Description:** Horizontal jitter on impact word (GIRAFFRAME Shake; CapCut Shake).
**Params:** amplitude ±4–8 px, frequency ~18–24 Hz, duration **120–220 ms**, decay envelope.
**When:** Surprise numbers, “WAIT”, mistakes — sparingly.

---

### 4.8 Stomp / flash scale-up (MrBeast)

**Description:** All words in page appear together (Flash) + spring scale 0.8→1.0 overshoot ([VideoCaptions.AI](https://www.videocaptions.ai/caption-styles/mrbeast-style)).
**Params:**
- Category: Flash (ignore per-word stagger)
- Effect duration: **~20 frames @30fps ≈ 667 ms** (tool default) or snappier **300–400 ms**
- `scaleFrom=0.8`, overshoot `1.05`, settle `1.0`
- Stroke **5–6 px** black
- Use on **20–30%** of runtime for emphasis only — not every line

---

### 4.9 Color swap on keyword

Independent of entrance: on keyword word.start, tween fill to accent in **80–120 ms** (or hard cut). Can combine with pop.

---

### 4.10 Box / pill highlight

Rounded rect behind active word (karaoke Background submode) or behind whole phrase.
**Params:** padding X=10–16, Y=6–10, radius=8–16, fill accent @ 0.85–1.0 or black @ 0.4.

---

### 4.11 Weight morph (Iman)

**Description:** Same glyphs; font-weight animates Light→Bold as spoken ([Submagic Iman](https://www.submagic.co/blog/how-to-make-captions-like-iman-gadzhi)).
**Params:** `restWeight=300`, `activeWeight=700`, lowercase, white, no outline. Crossfade two pre-rendered layers if variable-font weight tween unavailable.

---

### 4.12 Dim → bright (Ali)

**Params:** rest opacity **0.35–0.45**, active **1.0**, Inter Bold, no motion ([FilmScribe](https://filmscribe.ai/en/caption-styles/ali-abdaal)).

---

## 5. Element animations (non-caption)

### 5.1 Emoji / sticker pop
- Trigger: keyword start or beat
- Scale 0 → 1.2 → 1.0 in **180–250 ms**; optional rotate ±8°
- SFX: soft “pop” at peak (~80–100 ms after start)

### 5.2 Zoom punch-in (AutoZoom-style)
- On emphasis beat: scale video 1.0 → 1.08–1.15 over **200–350 ms**, ease-out; hold; optional return
- Prefer face/subject center crop; don’t drift into UI

### 5.3 Progress bars
- Full-bleed bottom **unsafe** — place as thin bar at **y ≈ 0.52–0.55** or top under safe top margin
- Fill width by `elapsed/total`; height 6–10 px; accent color
- Animate width with linear time mapping (not eased) for honesty

### 5.4 Lower thirds
- Slide from left: `x: -40% → 0` in 300 ms, ease-out
- Hold; exit fade or slide left 200 ms
- Font: Bebas/Oswald title + Inter name; bar accent 4–6 px

### 5.5 B-roll overlay cards
- Scale 0.92 → 1.0 + fade 250 ms
- Soft shadow; rounded 16–24 px
- Exit: fade 150 ms or slide opposite direction

### 5.6 Arrows / circles (callouts)
- Circle: stroke draw 0→100% path length **400–600 ms**, then pulse scale 1→1.05 loop slow
- Arrow: slide + fade toward target **250 ms**; bounce once

### 5.7 Sound-effect sync
| Event | SFX | Offset |
|-------|-----|--------|
| Word pop / bounce land | pop / tick | 0 to +40 ms from peak |
| Stomp / MrBeast flash | whoosh + hit | whoosh −80 ms, hit at land |
| Zoom punch | whoosh short | start of zoom |
| Emoji | pop | emoji peak |
Keep −12 to −18 LUFS under VO; duck if needed.

### 5.8 Transitions between caption pages
- Hard cut on word boundary (default for Hormozi)
- Crossfade 2–4 frames for Ali/Iman
- Avoid long dissolves on punch styles

---

## 6. Style presets (JSON specs)

```json
{
  "presets": [
    {
      "id": "hormozi",
      "label": "Hormozi-style",
      "font": {"family": "Anton", "weight": 400, "fallback": "Montserrat", "fallbackWeight": 900},
      "case": "upper",
      "fontSizePx": 170,
      "color": "#FFFFFF",
      "accentColor": "#FF6B00",
      "stroke": {"color": "#000000", "width": 5},
      "shadow": {"x": 0, "y": 4, "blur": 0, "opacity": 0.45},
      "background": null,
      "wordsPerPage": 2,
      "maxLines": 1,
      "animation": {"type": "word_pop", "durationMs": 150, "scaleFrom": 0.7, "overshoot": 1.08},
      "keywordMode": "color",
      "emoji": true,
      "placement": {"x": 0.5, "y": 0.62, "anchor": "center"}
    },
    {
      "id": "mrbeast",
      "label": "MrBeast-style",
      "font": {"family": "Bangers", "weight": 400, "alts": ["Bebas Neue", "Oswald"]},
      "case": "upper",
      "fontSizePx": 160,
      "color": "#FFFFFF",
      "accentColor": "#FFE600",
      "stroke": {"color": "#000000", "width": 6},
      "shadow": null,
      "wordsPerPage": 3,
      "maxLines": 1,
      "animation": {"type": "flash_scale", "durationMs": 350, "scaleFrom": 0.8, "overshoot": 1.05},
      "keywordMode": "multicolor",
      "usageHint": "emphasis_only_20_to_30_percent",
      "placement": {"x": 0.5, "y": 0.5, "anchor": "center"}
    },
    {
      "id": "karaoke_gold",
      "label": "Karaoke gold",
      "font": {"family": "Montserrat", "weight": 800},
      "case": "sentence",
      "fontSizePx": 140,
      "color": "#FFFFFF",
      "accentColor": "#FFD400",
      "stroke": {"color": "#000000", "width": 2},
      "background": {"color": "#000000", "opacity": 0.32, "radius": 16, "padding": 14},
      "wordsPerPage": 6,
      "maxLines": 2,
      "animation": {"type": "karaoke_color", "submode": "wipe_or_color"},
      "placement": {"x": 0.5, "y": 0.64, "anchor": "center"}
    },
    {
      "id": "ali_abdaal",
      "label": "Ali Abdaal-style (education)",
      "font": {"family": "Inter", "weight": 700},
      "case": "sentence",
      "fontSizePx": 78,
      "color": "#FFFFFF",
      "restOpacity": 0.4,
      "activeOpacity": 1.0,
      "stroke": null,
      "shadow": null,
      "wordsPerPage": 8,
      "wordsPerLine": 4,
      "maxLines": 2,
      "animation": {"type": "dim_to_bright"},
      "placement": {"x": 0.5, "y": 0.7, "anchor": "center"}
    },
    {
      "id": "iman_gadzhi",
      "label": "Iman Gadzhi-style (premium minimal)",
      "font": {"family": "Montserrat", "restWeight": 300, "activeWeight": 700},
      "case": "lower",
      "fontSizePx": 120,
      "color": "#FFFFFF",
      "stroke": null,
      "shadow": null,
      "wordsPerPage": 5,
      "maxLines": 2,
      "animation": {"type": "weight_morph", "durationMs": 120},
      "placement": {"x": 0.5, "y": 0.66, "anchor": "center"}
    },
    {
      "id": "minimal_cinematic",
      "label": "Minimal cinematic",
      "font": {"family": "DM Sans", "weight": 600},
      "case": "sentence",
      "fontSizePx": 110,
      "color": "#F5F5F5",
      "stroke": null,
      "shadow": {"x": 0, "y": 2, "blur": 8, "opacity": 0.5},
      "wordsPerPage": 5,
      "maxLines": 2,
      "animation": {"type": "fade", "durationMs": 300},
      "placement": {"x": 0.5, "y": 0.72, "anchor": "center"}
    },
    {
      "id": "podcast_clip",
      "label": "Podcast clip",
      "font": {"family": "Inter", "weight": 700},
      "case": "sentence",
      "fontSizePx": 130,
      "color": "#FFFFFF",
      "accentColor": "#7CFF6B",
      "stroke": {"color": "#000000", "width": 3},
      "background": {"color": "#000000", "opacity": 0.4, "radius": 20, "padding": 16},
      "wordsPerPage": 7,
      "maxLines": 2,
      "animation": {"type": "karaoke_color", "submode": "background_box"},
      "speakerColors": true,
      "placement": {"x": 0.5, "y": 0.6, "anchor": "center"}
    },
    {
      "id": "photography_educator",
      "label": "Photography educator (Glenn default candidate)",
      "font": {"family": "Montserrat", "weight": 700, "titleFamily": "Bebas Neue"},
      "case": "sentence",
      "fontSizePx": 135,
      "color": "#FFFFFF",
      "accentColor": "#FFC857",
      "stroke": {"color": "#000000", "width": 3},
      "shadow": {"x": 0, "y": 3, "blur": 6, "opacity": 0.4},
      "wordsPerPage": 4,
      "maxLines": 2,
      "animation": {"type": "bounce", "durationMs": 450, "overshootYpx": 12, "scalePeak": 1.05},
      "keywordMode": "color",
      "emoji": false,
      "elements": {
        "zoomPunchOnKeyword": {"scale": 1.1, "durationMs": 280},
        "calloutCircle": true
      },
      "placement": {"x": 0.5, "y": 0.63, "anchor": "center"},
      "safeZonePreset": "cross_post_all_three"
    }
  ]
}
```

---

## 7. CapCut / Resolve / Premiere mapping (for feature parity)

| Product | What to mirror |
|---------|----------------|
| **CapCut** | Auto Captions → In animations: Pop, Bounce, Typewriter, Slide, Fade, Shake; Apply to all; keyframe elastic bounce on desktop |
| **Submagic** | Theme library + creator styles (Hormozi, Iman, etc.); custom font upload on Pro |
| **Opus Clip** | Font/size/color/stroke/shadow/case on clip captions |
| **AutoCut Advanced** | 90+ presets in Premiere/Resolve; Elastic Punch, karaoke emphasis, sound design |
| **GIRAFFRAME Free (Resolve)** | Typewriter, Bounce, Bounce In TL, Popup Bounce, Slide In, Fade In, Shake, Stomp — free commercial use of templates |
| **Descript** | Caption styles + Brand Studio Google Fonts |

Glenn already edits Resolve + Adobe → ship presets that export as: (a) burned video, (b) SRT+style JSON, (c) optional Resolve Fusion / Premiere MOGRT later.

---

## 8. Implementation checklist for Claude

1. Bundle OFL fonts from §2.7 (`paid:false` only) into the editor asset pack.
2. Require word-level timestamps from transcription.
3. Implement caption layout engine: safe-zone clamp, words-per-page packer, meaning-aware line breaks.
4. Implement animation runtime: `word_pop`, `karaoke_*`, `bounce`, `slide_up`, `typewriter`, `fade`, `shake`, `flash_scale`, `weight_morph`, `dim_to_bright`.
5. Ship the 8 presets in §6 as first-class templates; allow user override of font/colors.
6. Add element layer: emoji pop, zoom punch, progress, lower-third, arrow/circle, SFX cues.
7. Default new projects for Glenn → `photography_educator` preset + cross-post safe zone.
8. Do **not** redistribute Impact / Proxima Nova / The Bold Font binaries; map UI names to free alts.

---

## 9. Sources

1. Submagic — 15 Best Fonts For Subtitles & Captions (2M video analysis, Apr 2025): https://www.submagic.co/blog/best-font-for-subtitle  
2. ReelWords — Best Fonts for Captions + Exact Settings: https://reelwords.ai/blog/best-fonts-for-captions  
3. Sycamore — Best Fonts for Captions on Shorts, Reels and TikTok: https://www.sycamore.to/blog/best-fonts-for-captions-on-shorts-reels-and-tiktok  
4. StoryCut — Hormozi Style Captions: https://www.storycut.com/features/hormozi-captions  
5. VideoCaptions.AI — MrBeast Style: https://www.videocaptions.ai/caption-styles/mrbeast-style  
6. VideoCaptions.AI — Animated Caption Styles (karaoke, bounce, typewriter): https://www.videocaptions.ai/caption-styles  
7. AutoCaption — Karaoke Captions: https://autocaption.app/caption-styles/karaoke-captions  
8. FilmScribe — Ali Abdaal style: https://filmscribe.ai/en/caption-styles/ali-abdaal  
9. Submagic — Iman Gadzhi captions: https://www.submagic.co/blog/how-to-make-captions-like-iman-gadzhi  
10. Solid Labs — Social Media Safe Zones 2026: https://www.solidlabs.com/social-safe-zones  
11. Meta Ads — Instagram Reels text/safe zone guidance (quoted via Solid): leave 14% top, 35% bottom, 6% sides  
12. CapCut animated captions guides: https://videowizardtools.com/add-animated-captions-in-capcut/ · https://videowizardtools.com/create-smooth-captions-in-capcut/  
13. GIRAFFRAME CapCut-style Resolve pack: https://frametoolsmith.gumroad.com/l/capcut-captions-free  
14. AutoCut Advanced AutoCaptions: https://www.autocut.com/en/advanced-captions/  
15. AutoShorts — word-level Anton example: https://www.autoshorts.app/en/features/animated-subtitles  
16. Google Fonts catalog: https://fonts.google.com/  
17. The Bold Font foundry: https://the-bold-font.com/the-bold-font/  
18. Microsoft Impact font family: https://learn.microsoft.com/en-us/typography/font-list/impact  
19. Adobe Fonts — Proxima Nova: https://fonts.adobe.com/fonts/proxima-nova  

---

*Compiled 2026-11-02 (Europe/Dublin) for Glenn Somers’ AI editor build. Stats and creator-font attributions are as reported by the linked caption-tool / design blogs — Hormozi/MrBeast/etc. teams have not always published official font files.*
