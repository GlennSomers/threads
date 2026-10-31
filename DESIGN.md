---
name: Reel Drafts
description: A drafts app for reel scripts that looks like it shipped with the iPhone, in Graphite.
colors:
  graphite-tint: "#1c1c1e"
  on-tint: "#ffffff"
  grouped-background: "#f2f2f7"
  cell: "#ffffff"
  label: "#000000"
  label-secondary: "rgba(60, 60, 67, 0.75)"
  label-tertiary: "rgba(60, 60, 67, 0.3)"
  placeholder: "rgba(60, 60, 67, 0.72)"
  separator: "rgba(60, 60, 67, 0.29)"
  fill: "rgba(118, 118, 128, 0.12)"
  chip-grey: "#e5e5ea"
  chip-text: "#1c1c1e"
  selected-row: "#e5e5ea"
  segment-on: "#ffffff"
  bar-material: "rgba(242, 242, 247, 0.94)"
  selection: "rgba(0, 0, 0, 0.14)"
  scrim: "rgba(0, 0, 0, 0.35)"
  system-red: "#ff3b30"
  read-ground: "#ffffff"
  read-ink: "#000000"
  read-cue: "#6d6d72"
  read-sub: "rgba(0, 0, 0, 0.6)"
  read-knob: "rgba(0, 0, 0, 0.07)"
  graphite-tint-dark: "#f2f2f7"
  on-tint-dark: "#000000"
  grouped-background-dark: "#000000"
  cell-dark: "#1c1c1e"
  label-dark: "#ffffff"
  label-secondary-dark: "rgba(235, 235, 245, 0.66)"
  label-tertiary-dark: "rgba(235, 235, 245, 0.3)"
  placeholder-dark: "rgba(235, 235, 245, 0.55)"
  separator-dark: "rgba(84, 84, 88, 0.65)"
  fill-dark: "rgba(118, 118, 128, 0.24)"
  chip-grey-dark: "#2c2c2e"
  chip-text-dark: "#f2f2f7"
  selected-row-dark: "#2c2c2e"
  segment-on-dark: "#636366"
  bar-material-dark: "rgba(18, 18, 20, 0.94)"
  selection-dark: "rgba(255, 255, 255, 0.25)"
  scrim-dark: "rgba(0, 0, 0, 0.55)"
  system-red-dark: "#ff453a"
  read-ground-dark: "#000000"
  read-ink-dark: "#ffffff"
  read-cue-dark: "#a1a1a8"
  read-sub-dark: "rgba(255, 255, 255, 0.65)"
  read-knob-dark: "rgba(255, 255, 255, 0.14)"
typography:
  large-title:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, system-ui, Segoe UI, Roboto, sans-serif"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.011em"
  title1:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, system-ui, Segoe UI, Roboto, sans-serif"
    fontSize: "1.647rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.01em"
  title3:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, system-ui, Segoe UI, Roboto, sans-serif"
    fontSize: "1.176rem"
    fontWeight: 600
    letterSpacing: "0.01em"
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, system-ui, Segoe UI, Roboto, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, system-ui, Segoe UI, Roboto, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.4
  script:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, system-ui, Segoe UI, Roboto, sans-serif"
    fontSize: "1.06rem"
    fontWeight: 400
    lineHeight: 1.5
  subheadline:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, system-ui, Segoe UI, Roboto, sans-serif"
    fontSize: "0.882rem"
    fontWeight: 400
    lineHeight: 1.4
  footnote:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, system-ui, Segoe UI, Roboto, sans-serif"
    fontSize: "0.765rem"
    fontWeight: 400
    lineHeight: 1.35
    fontFeature: "tnum"
  read-line:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, system-ui, Segoe UI, Roboto, sans-serif"
    fontSize: "34px"
    fontWeight: 700
    lineHeight: 1.22
    letterSpacing: "0.005em"
  read-cue:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, system-ui, Segoe UI, Roboto, sans-serif"
    fontSize: "20.4px"
    fontWeight: 600
rounded:
  chip: "6px"
  segment-inner: "7px"
  segment: "9px"
  cell: "12px"
  sheet: "14px"
  pill: "999px"
spacing:
  hairline: "0.5px"
  gutter: "16px"
  group-gap: "18px"
  row-gap: "12px"
  bar: "44px"
  touch: "44px"
components:
  button-prominent:
    backgroundColor: "{colors.graphite-tint}"
    textColor: "{colors.on-tint}"
    typography: "{typography.subheadline}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "34px"
  button-text:
    textColor: "{colors.graphite-tint}"
    typography: "{typography.body}"
    height: "44px"
  button-icon:
    textColor: "{colors.graphite-tint}"
    size: "44px"
  segmented-control:
    backgroundColor: "{colors.fill}"
    rounded: "{rounded.segment}"
    padding: "2px"
  segmented-control-selected:
    backgroundColor: "{colors.segment-on}"
    typography: "{typography.footnote}"
    rounded: "{rounded.segment-inner}"
    height: "28px"
  inset-group:
    backgroundColor: "{colors.cell}"
    rounded: "{rounded.cell}"
    padding: "11px 16px"
  list-row:
    backgroundColor: "{colors.cell}"
    typography: "{typography.headline}"
    padding: "9px 16px"
    height: "60px"
  list-row-selected:
    backgroundColor: "{colors.selected-row}"
  length-chip:
    backgroundColor: "{colors.chip-grey}"
    textColor: "{colors.chip-text}"
    typography: "{typography.footnote}"
    rounded: "{rounded.chip}"
    padding: "2px 8px"
  length-chip-read:
    textColor: "{colors.read-ink}"
    rounded: "{rounded.segment-inner}"
    padding: "4px 10px 3px"
  text-field-filled:
    backgroundColor: "{colors.cell}"
    textColor: "{colors.label}"
    typography: "{typography.body}"
    rounded: "{rounded.cell}"
    padding: "13px 16px"
  sheet:
    backgroundColor: "{colors.grouped-background}"
    rounded: "{rounded.sheet}"
    width: "560px"
  read-close:
    backgroundColor: "{colors.read-knob}"
    textColor: "{colors.read-ink}"
    rounded: "{rounded.pill}"
    size: "44px"
---

# Design System: Reel Drafts

## Overview

**Creative North Star: "The Contact Print"**

Reel Drafts is a native Apple shell in the Graphite scheme: the grouped inset lists, hairline separators, blurred bars and large titles of Notes and Reminders, with every trace of colour taken out. Controls are near-black in light mode and near-white in dark, the way a contact print is all tone and no hue. The app should feel like it shipped with the iPhone, so the system's job is fidelity to Apple's own conventions, not invention on top of them.

Density follows the platform. On iPhone the root size follows the Dynamic Type setting and every target is at least 44px. On a Mac with a fine pointer the root drops to 15px and the list sits beside the open draft, Notes style. Both appearances are first-class; every colour token has a light and a dark value and they are switched only by `prefers-color-scheme`.

The one place the system raises its voice is Read mode: a full-screen sheet of bold script on plain white (or black), sized by a single slider, for reading at arm's length while filming. Everything else stays quiet so that screen can be loud.

**Key Characteristics:**
- Monochrome Graphite tint; system red is the only hue, and only for errors.
- Apple grouped-list anatomy: grey grouped background, white inset cells, 12px corners, hairline separators inset by the gutter.
- System font with the iOS text-style ramp, scaled from a 17px body.
- Translucent blurred bars at top (once scrolled) and bottom.
- Read mode as the signature: bold, big, plain, adjustable.

## Colors

All tone, no hue: Apple's system greys and labels, with the tint itself set to graphite.

### Primary
- **Graphite** (`graphite-tint` / `graphite-tint-dark`): the tint. Text buttons, icon buttons, the back link, the prominent Refine pill, the caret, and the base of the focus ring. Near-black on light, near-white on dark, so tinted controls always read as the strongest ink on screen.
- **On Graphite** (`on-tint`): label colour on the prominent pill, inverted with the tint per appearance.

### Neutral
- **Grouped Background** (`grouped-background`): the page and sheet ground (Apple systemGroupedBackground). Also the browser theme colour.
- **Cell** (`cell`): inset groups, list rows, filled fields, callouts.
- **Label / Secondary / Tertiary** (`label`, `label-secondary`, `label-tertiary`): primary text; previews, footers and status text; scrollbars. Secondary is raised above Apple's stock alpha for legibility.
- **Placeholder** (`placeholder`): field placeholders, also raised above stock for legibility.
- **Separator** (`separator`): 0.5px hairlines between rows, under the condensed nav bar, above the toolbar, between split panes.
- **Fill** (`fill`): segmented-control track, row press state, and (at 60%) row hover.
- **Chip Grey** (`chip-grey`, `chip-text`): the spoken-length chip. `selected-row` shares the same grey for the open draft in the sidebar.
- **Segment On** (`segment-on`): the raised selected segment.
- **Bar Material** (`bar-material`): translucent ground for blurred bars.
- **Selection / Scrim** (`selection`, `scrim`): text selection and the sheet backdrop.

### Tertiary
- **System Red** (`system-red`): error marks, error callout icons, inline error text. Nothing else.

### Read Mode
- **Read Ground / Read Ink** (`read-ground`, `read-ink`): pure white and pure black in light, swapped in dark. Maximum contrast for distance reading.
- **Read Cue** (`read-cue`): bracketed b-roll cues, grey so they recede behind spoken lines.
- **Read Sub / Read Knob** (`read-sub`, `read-knob`): the title strip and wake-lock note; the faint round fill behind the close button.

### Named Rules
**The Graphite Rule.** There is no accent colour. Interactive emphasis comes from the graphite tint, weight and position, never from a hue.

**The Red Means Broken Rule.** System red appears only where something failed. It is never decoration, status for success, or emphasis.

**The Paired Appearance Rule.** Every new colour token ships with both a light and a dark value, switched by `prefers-color-scheme`.

## Typography

**Display Font:** the Apple system font (SF Pro via `-apple-system`), with BlinkMacSystemFont, system-ui, Segoe UI and Roboto as fallbacks
**Body Font:** the same
**Label/Mono Font:** none distinct; numerals in status text, timestamps, chips and footers use tabular figures

**Character:** one family, carried by weight and size the way iOS does it. In this world the system face is the native material, not a default left in place.

### Hierarchy
- **Large Title** (700, 2rem / 34pt, 1.2, +0.011em): the "Drafts" screen title and the login title. Collapses into a centred 600 body-size title in the bar once it scrolls away.
- **Title 1** (700, 1.647rem / 28pt, 1.2): the editable draft title, balanced wrap.
- **Title 3** (600, 1.176rem / 20pt): group headers (Ready to Film, Idea, Script), empty-state titles.
- **Headline** (600, 1rem): row titles, sheet title, callout title, inline nav title, strong text buttons.
- **Body** (400, 1rem / 17pt, 1.4 in fields, 1.3 base): field text, text buttons.
- **Script** (400, 1.06rem, 1.5): the script field on the draft page, slightly larger and looser than body.
- **Subheadline** (400, 0.882rem / 15pt): row previews, notes, callout text, prominent button label (at 600).
- **Footnote** (400, 0.765rem / 13pt, tabular): group footers, toolbar status, segment labels (500, 600 selected), length chip (700).
- **Read Line** (700, user-set 22 to 96px, default 34px on phone and 56px on Mac, 1.22, max 30ch): spoken lines in Read mode.
- **Read Cue** (600, 0.6x the read size, max 40ch): b-roll cues in Read mode.

### Named Rules
**The Dynamic Type Rule.** Sizes are rem off a 17px root, and on iPhone the root follows the system Dynamic Type setting. Don't set app text in fixed px; Read mode's slider-driven size is the one deliberate exception.

**The One Family Rule.** No second typeface. Hierarchy is weight (400, 600, 700) and the iOS size ramp.

## Layout

A split view. On iPhone (below 900px) one pane shows at a time: the list, or the open draft with a back link. At 900px and up the list is a sidebar (300 to 340px) with a hairline right edge and the draft fills the rest, each pane scrolling on its own with its own toolbar. On a Mac with a fine pointer the root font drops from 17px to 15px for macOS density.

Each screen stacks: a 44px nav bar (transparent until content scrolls under it), a large title or title field, then grouped sections. Groups sit 18px apart with a 16px side gutter; headers sit above their cell with a small inset. The draft body caps at 760px and centres. A bottom toolbar holds three slots: a leading button, a centred status line, and a trailing action. Safe-area insets pad every bar and Read mode.

The new-idea sheet rises from the bottom edge on phones and becomes a centred 560px panel at 700px and up.

## Elevation & Depth

Depth is tonal and material, Apple style. Cells sit as white on grey; bars are translucent with a saturate-and-blur backdrop and a hairline edge. Shadows appear in only two places, both native: the raised selected segment of the segmented control, and the centred sheet on wide screens. Focus is shown with a soft graphite ring, not a shadow.

### Shadow Vocabulary
- **Segment lift** (`box-shadow: 0 3px 8px rgba(0, 0, 0, 0.12), 0 3px 1px rgba(0, 0, 0, 0.04)`): the selected segment only.
- **Floating sheet** (`box-shadow: 0 24px 60px rgba(0, 0, 0, 0.25)`): the compose sheet when centred at 700px and up.
- **Focus ring** (`box-shadow: 0 0 0 2px` graphite at 45%): focused cell or filled field. Global keyboard focus uses a 3px graphite outline at 55% with 2px offset.

### Named Rules
**The Material Not Shadow Rule.** Bars get blur and a hairline, cells get tone. A new surface earns a shadow only if Apple would float it (sheet, popover, selected segment).

## Shapes

Continuous, moderate rounding with no outlines. Cells, callouts and filled fields share the 12px cell corner; sheets use 14px (top corners only when docked to the bottom). The segmented control nests 7px inside 9px. Chips are a tight 6px. The prominent button and the Read mode close button are full pills/circles. Borders are reserved for 0.5px separators; the one stroked shape is the length chip inside Read mode, drawn as a 1.5px inset ring in read ink.

## Components

### Buttons
Plain and native: most actions are tinted text, not boxes.
- **Shape:** text and icon buttons are frameless; the prominent button is a pill (999px).
- **Text button:** graphite text at body size, 44px minimum height, optional leading 16px icon. The strong variant (600) marks the confirming action in a bar (Save, Done).
- **Icon button:** a 44px square target with a 22 to 24px stroked icon, pulled 10px into the gutter so the glyph aligns with the edge.
- **Prominent:** graphite pill with on-tint label, 34px tall (48px full-width on login), subheadline 600. One per screen, for the main forward action (Refine).
- **Hover / Press:** on hover-capable devices the pill brightens slightly; on press it scales to 0.96 and dims, in 0.12s. Disabled is 40% opacity.

### Chips
- **Length chip:** grey fill, footnote 700, tabular figures, 6px corners, showing spoken length ("21s"). Trails refined rows in the list.
- **In Read mode:** larger (1.1rem, 1.6rem on Mac), transparent with a 1.5px inset ring in read ink.

### Cards / Containers
- **Corner Style:** 12px.
- **Background:** cell on grouped background.
- **Shadow Strategy:** none (see Elevation & Depth).
- **Border:** none; rows inside are divided by hairlines starting at the gutter.
- **Internal Padding:** 11px vertical, 16px horizontal for content cards; callouts 12px by 16px with an icon, text and trailing action in three columns.

### Inputs / Fields
- **In-card fields:** borderless, transparent textareas that grow with their content, sitting inside an inset card. The card shows the focus ring.
- **Filled fields:** cell fill, 12px corners, 13px by 16px padding (login, compose direction).
- **Focus:** 2px graphite ring at 45%, no outline.
- **Read-only:** secondary label colour while a refine is running.

### Navigation
- **Nav bar:** three-column grid (back, centred title, trailing actions). Transparent at rest; once the large title scrolls off it gains bar material, blur and a hairline, and the inline title fades in over 0.2s.
- **Segmented control:** two equal segments on a fill track; the selected one is raised and bolder.
- **Toolbar:** bottom bar material with blur and a top hairline; fixed on phone, sticky per pane on Mac.

### List Rows
60px minimum, title in headline weight, a second line of tabular timestamp plus a one-line preview in secondary label, and a trailing slot for the length chip, the turning refining ring, or the red alert mark. Press fills with `fill`; the open draft takes `selected-row` and hides its neighbouring hairlines.

### Status Marks
- **Refining ring:** an open 18px stroked ring in secondary label, turning linearly every 1.1s.
- **Activity spinner:** iOS eight-spoke indicator stepping round in 0.8s, for loading.

### Read Mode (signature)
A full-screen layer over everything: read ground, read ink, 10px plus safe-area padding. Top strip: the large length chip, the draft title in read-sub, and a 44px round close button on a faint knob (52px on Mac). The script fills the middle: spoken lines in Read Line, bracketed cues in Read Cue. At the bottom, a small "A", a range slider in read ink, and a big "A"; the size persists between sessions. A footnote confirms when the screen is being kept awake. Opens with a 0.2s fade; Escape closes it.

## Do's and Don'ts

### Do:
- **Do** use the graphite tint for every interactive control and nothing else for emphasis.
- **Do** build new screens from grouped inset sections: Title 3 header, 12px cell, optional footnote footer.
- **Do** keep touch targets at 44px minimum and pad bars with safe-area insets.
- **Do** give every new colour a dark value and check both appearances.
- **Do** use tabular figures for counts, durations and times.
- **Do** keep motion short and native (0.12 to 0.25s fades and presses, a 0.42s sheet rise on `cubic-bezier(0.2, 0.9, 0.25, 1)`), and collapse it under reduced motion.
- **Do** keep Read mode pure ground and ink with one size control.

### Don't:
- **Don't** introduce an accent hue. System red for errors is the only colour.
- **Don't** bring back the dropped Irish road-sign theme or its sign-green tint (tried and dropped by Glenn, 31 Oct 2026). Class names such as `.sign`, `.sign-line` and `.route-chip` are leftovers from it and now style plain Read mode and the length chip; they are not a cue to restyle anything as signage.
- **Don't** add borders or drop shadows to cells; depth comes from tone and bar material.
- **Don't** add a second typeface or set app text in fixed px outside Read mode.
- **Don't** use cream grounds or warm tinted neutrals; neutrals are Apple's cool system greys.
