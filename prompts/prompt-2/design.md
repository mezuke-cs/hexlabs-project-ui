# SIKAD — Design System & UI Specification

> **Status:** Final for implementation review. The rationale, evaluations and open questions are in [design-audit.md](design-audit.md).
> **Sources of truth:** [user_story.md](user_story.md) (product and UX), [prompt.md](prompt.md) (engine behaviour and output contracts), and the existing vanilla implementation in [js/](js/) and [css/](css/).
> **Stack constraint:** vanilla HTML, CSS and JS. All tokens are plain CSS custom properties in one `:root` block, plus one dark override. No frameworks, no build step, no npm packages.
> **Evidence labels:**
> - **Verified** means a WCAG 2.x contrast ratio I computed with a script.
> - **Judgment** means a design decision.
> - **Validate** means it must be checked during implementation.

---

## 1. Brand positioning

| | |
|---|---|
| **Name** | **SIKAD** (keep the all-caps form until the team confirms whether it's an acronym; see audit A6.1) |
| **Concept (internal)** | *The Gentle Momentum.* The name provides the energy; the interface provides the calm. |
| **Tagline** | **Find your next move.** (Alternative campaign line: "Make your next move count.") |
| **Support line** | Plan realistically. Focus on one thing. Adjust when life changes. |
| **Audience** | Filipino senior high school and college students juggling classes (FTF and online), commutes, and sometimes work or org duties. |
| **Promise** | At any moment you can see what's due, how much real time you have, whether it fits, and the one thing to do next, even after your plan breaks. |
| **Personality** | Grounded, honest, encouraging, quietly energetic. A thoughtful companion, not a coach, cheerleader or chatbot. |
| **It is not** | A chatbot, a tutor, an LMS, a wellness app, a gamified habit tracker, or a sports/hustle brand. |

### Voice and microcopy

- **Plain, specific and time-based.** Write "You have 3 hrs before your 2 PM class", not "Let's crush it!".
- **Honest about limits.** Write "This doesn't fit before Friday", not "Almost there!".
- **No judgment after a miss.** Write "Moved to Tue 9:30 AM", not "You missed this".
- **No diagnosis and no promised outcomes** (story §19).
- **The engine stays invisible** (story §23.8). Prefer "SIKAD moved…" or a passive "Moved to…" over "The AI decided…". Use the label **"AI estimate"** only where prompt.md sets `is_ai_estimate: true`.
- **No sparkle.** Drop ✨ and "magic" wording. "Generate my schedule" stays as the button label without the emoji.
- **Keep sentences ≤ 20 words** on cards. Body text is English. Taglish microcopy is a pending decision (audit A6.5).

---

## 2. Design principles

1. **The next move first.** On any screen with a plan, the Focus Card or the current step is the most prominent element.
2. **Show the plan, not a conversation** (story §23.1). Use cards, timelines and chips. Paragraphs appear only in "Why this?" and clarifications.
3. **Protected looks protected.** Fixed commitments always carry a lock icon, a Harbor rail and a "Fixed" text label. Flexible tasks never use those.
4. **Uncertainty is visible.** Every AI estimate gets an "≈" prefix, a violet dashed underline and the text "AI estimate". Never colour alone.
5. **Each engine status has its own look.** `SUCCESS`, `CLARIFICATION_NEEDED`, `CONFLICT`, `INFEASIBLE` and `ERROR` each have a distinct icon, title, colour and primary action (§8).
6. **Changes are shown, not implied.** After a replan, every moved item states its before → after, and **Undo** is always offered.
7. **The student decides.** Anything that would touch a fixed commitment or a deadline is a choice the student makes, never a default.
8. **Calm density.** The design is information-dense where the student scans (timeline, tasks) and spacious where they decide (Focus Card, status cards).
9. **One primary action per view.** Only one Butter button is visible at a time.

---

## 3. Visual direction: "Grounded Path"

The nature-editorial palette and typographic hierarchy, plus **one functional motif: the path.**

- **The day is a path.** The timeline rail is a continuous vertical line with nodes. Completed steps are filled. The current or next step is a Butter ring. Upcoming steps are hollow. Fixed commitments are square "posts" on the path (they don't move); flexible tasks are round "steps" (they can move).
- **The Focus Card is "your next step"** on that path. A small path glyph in its label ties the two together.
- **Replanning re-routes the path.** Moved steps briefly show a "moved" marker and their old time struck through. No decorative animation.
- **Editorial means hierarchy, not decoration:**
  - generous margins
  - a confident heading face
  - small-caps eyebrows
  - generous line height in reading text
  - no textures, gradients, glassmorphism or stock illustration
- **Nature means palette and restraint:** greens, paper, a single warm Butter accent, and no leaf clip-art.

---

## 4. Typography

### 4.1 Families and loading

| Role | Family | Weights | Why |
|---|---|---|---|
| Headings, wordmark, Focus Card title | **Plus Jakarta Sans** | 600, 700 (800 only for the wordmark) | Warm, distinctive, Southeast Asian origin; pairs with the nature palette |
| Body, UI, labels, **all numbers** (times, durations, dates, timers) | **Inter** | 400, 500, 600 | Best small-size legibility, clear numerals, tabular figures |

Both fonts are under the SIL OFL 1.1. **Validate:** keep `OFL.txt` from each download in `/fonts/`.

**Self-host** variable or static WOFF2 files in `/fonts/`. This keeps the demo working offline, which matters on venue Wi-Fi, and avoids a third-party request. The trade-off is a one-time download and about 150–300 KB of files. A Google Fonts `<link>` is acceptable only as a temporary fallback during development.

```css
@font-face { font-family: "Inter"; src: url("../fonts/Inter-Variable.woff2") format("woff2"); font-weight: 400 700; font-display: swap; }
@font-face { font-family: "Plus Jakarta Sans"; src: url("../fonts/PlusJakartaSans-Variable.woff2") format("woff2"); font-weight: 600 800; font-display: swap; }

:root {
  --font-body: "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --font-display: "Plus Jakarta Sans", "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; /* COR paste box and engine JSON only */
}
```

- Preload only the body font: `<link rel="preload" href="fonts/Inter-Variable.woff2" as="font" type="font/woff2" crossorigin>`.
- **Validate:** confirm the self-hosted Inter build supports `tnum`. Numbers are always set in Inter; never rely on `tnum` in Plus Jakarta Sans.

### 4.2 Type scale (mobile base, 16 px root)

| Token | Size / line height | Family · weight · tracking | Use |
|---|---|---|---|
| `--type-display` | 36 / 40 | Display · 800 · −0.03em | Welcome wordmark only |
| `--type-h1` | 26 / 32 | Display · 700 · −0.02em | Screen titles ("Hey, Alex", "Tasks") |
| `--type-h2` | 20 / 26 | Display · 700 · −0.01em | Focus Card title, sheet titles, status card titles |
| `--type-h3` | 16 / 22 | Display · 600 · 0 | Section heads, task card titles |
| `--type-body` | 15 / 22 | Body · 400 · 0 | Default text, "Why this?" |
| `--type-body-strong` | 15 / 22 | Body · 600 | Inline emphasis, button labels |
| `--type-small` | 13 / 18 | Body · 400–500 | Metadata, helper text |
| `--type-caption` | 12 / 16 | Body · 600 · +0.02em | Chips, timeline times, nav labels |
| `--type-eyebrow` | 12 / 16 | Body · 700 · +0.08em · UPPERCASE | "WHAT TO DO NEXT", "CHECK-IN", dates above titles |

- **Minimum text size is 12 px.** Never use 11 px; the current build has 11–11.5 px chips, so raise them.
- Body text inputs are 16 px to stop iOS zooming on focus.

### 4.3 Numeric and time styles

All of these use Inter with `font-variant-numeric: tabular-nums`:

| Style | Spec | Example |
|---|---|---|
| Time range | 15/22 · 600 | `10:15 AM – 12:15 PM`. Use an en dash with thin spaces, and always show AM/PM (12-hour time is the PH norm) |
| Timeline time label | 12/16 · 600 · `--ink-3` · right-aligned | `2 PM`, `10:15 AM` (drop `:00`) |
| Duration | 13/18 · 600 | `1.5 hrs`, `45 min`. An AI estimate is `≈ 2 hrs` plus the "AI estimate" label |
| Date | 13/18 · 500 | `Mon, Oct 12`. In headers, the eyebrow is `MONDAY, OCTOBER 12` |
| Relative day | Same as Date | `Today`, `Tomorrow`, then the weekday name within 6 days, then `Mon, Oct 19` |
| Focus timer | 32/36 · 600 · tabular | `24:05` |
| Capacity numbers | 15/22 · 700 | `6 hrs` of work · `53 hrs` free |

---

## 5. Colour

### 5.1 Brand palette

| Name | HEX | Role |
|---|---|---|
| Forest | `#294B3A` | Brand, Focus Card, progress fill, flexible rail, light focus ring |
| Ink | `#26332D` | Text, and labels on Butter |
| Paper | `#F7F5EC` | App background |
| Butter | `#EBCB70` | The one primary action, plus the "next step" node |
| Sage | `#A8B99A` | Decorative tint only (light). Rails and progress on dark |
| Sky | `#B9D2DF` | Tint source for fixed and calendar surfaces |
| Harbor *(new)* | `#2F5468` | Fixed / protected and info: text, icons, rails |

### 5.2 Semantic tokens

This block replaces the `:root` block in [css/styles.css](css/styles.css). It keeps the current token names where they exist, and the mapping is in §15.3.

```css
:root {
  /* surfaces */
  --bg: #F7F5EC;            /* Paper */
  --surface: #FFFDF7;       /* cards, sheets */
  --surface-2: #EFECE0;     /* sunken: segmented controls, inputs on cards, chips */
  --line: #DDD8C8;          /* decorative dividers only (not a component boundary) */
  --line-strong: #7F8A80;   /* input/checkbox borders, component boundaries */

  /* text */
  --ink: #26332D;
  --ink-2: #4A5750;         /* secondary text; REQUIRED for secondary text on any status tint */
  --ink-3: #5F6B64;         /* metadata on bg/surface/surface-2/sky/sage/warn/conflict tints only */
  --ink-disabled: #8B938D;  /* disabled controls (WCAG-exempt); always paired with not-allowed cursor + aria-disabled */

  /* brand & actions */
  --forest: #294B3A;
  --forest-hover: #22402F;
  --forest-pressed: #1B3428;
  --butter: #EBCB70;
  --butter-hover: #E0BC55;
  --butter-pressed: #CFA944;
  --butter-edge: #9A7A22;   /* 1px border on Butter buttons over light backgrounds */
  --on-butter: #26332D;
  --sage: #A8B99A;
  --sage-tint: #E6EDDE;     /* flexible-task surface, progress track */
  --sky: #B9D2DF;
  --sky-tint: #E3EEF3;      /* fixed-commitment surface, info surface */
  --harbor: #2F5468;        /* fixed/protected + info foreground */

  /* meaning */
  --estimate: #5B4A86;       --estimate-tint: #ECE8F4;   /* AI estimate (uncertain) */
  --warn: #7A5300;           --warn-tint: #FBF1D3;       /* CLARIFICATION_NEEDED, WARNING, needs-deadline, check-in */
  --conflict: #9A3F22;       --conflict-tint: #F8E5DC;   /* CONFLICT: decision needed */
  --critical: #9E2A2B;       --critical-tint: #F7E0DE;   /* INFEASIBLE, CRITICAL, ERROR, overdue */
  --success: #2E6B47;        --success-tint: #E2EFE0;    /* SUCCESS, done */
  --info: #2F5468;           --info-tint: #E3EEF3;       /* INFO */

  /* Focus Card (dark island on light theme) */
  --focus-bg: #294B3A;
  --focus-ink: #F7F5EC;
  --focus-muted: #C8D5C9;
  --focus-panel: #33594A;   /* "Why this?" panel inside the card */
  --focus-edge: #90A093;    /* on-dark button border (= Paper at 50% over Forest) */

  /* interaction */
  --ring: #294B3A;          /* focus ring on light */
  --ring-on-dark: #EBCB70;  /* focus ring on Forest/dark */
  --progress: #294B3A;
  --progress-track: #E6EDDE;
  color-scheme: light;
}

@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { /* same values as [data-theme="dark"] below */ } }
:root[data-theme="dark"] {
  --bg: #131917; --surface: #1B2320; --surface-2: #24302B; --line: #34413A; --line-strong: #6E7D74;
  --ink: #EDEBE1; --ink-2: #C2C8BE; --ink-3: #9BA59D; --ink-disabled: #6E7D74;
  --forest: #A8B99A; --forest-hover: #B7C6AA; --forest-pressed: #98AA8A;   /* brand accent becomes Sage on dark */
  --butter: #EBCB70; --butter-hover: #F0D486; --butter-pressed: #E0BC55; --butter-edge: #EBCB70; --on-butter: #26332D;
  --sage-tint: #22302A; --sky-tint: #1E2B32; --harbor: #A9CBDD;
  --estimate: #C9BDEB; --estimate-tint: #29253A;
  --warn: #F0C766;     --warn-tint: #2E2714;
  --conflict: #F2A98A; --conflict-tint: #33231C;
  --critical: #F4A3A0; --critical-tint: #36201F;
  --success: #A6D3A8;  --success-tint: #1D2E23;
  --info: #A9CBDD;     --info-tint: #1E2B32;
  --focus-bg: #22392D; --focus-ink: #F7F5EC; --focus-muted: #B9C9BC; --focus-panel: #2C4638; --focus-edge: #8C978C;
  --ring: #EBCB70; --ring-on-dark: #EBCB70;
  --progress: #A8B99A; --progress-track: #24302B;
  color-scheme: dark;
}
```

The dark block appears twice, once in the media query and once under `[data-theme="dark"]`, so a forced theme and the OS theme behave the same. The existing CSS already uses this pattern.

### 5.3 Verified contrast (computed with a script, WCAG 2.x)

Text needs ≥ 4.5:1. Non-text (borders, rails, icons, progress, focus rings) needs ≥ 3:1.

**Light theme**

| Pair | Ratio | Need | |
|---|---:|---:|---|
| `--ink` on `--bg` / `--surface` / `--surface-2` | 12.06 / 12.95 / 11.13 | 4.5 | Pass |
| `--ink-2` on `--bg` / `--surface` / `--surface-2` | 6.94 / 7.45 / 6.41 | 4.5 | Pass |
| `--ink-3` on `--bg` / `--surface` / `--surface-2` | 5.10 / 5.47 / 4.70 | 4.5 | Pass |
| `--ink-3` on `--sky-tint` / `--sage-tint` / `--warn-tint` / `--conflict-tint` | 4.71 / 4.65 / 4.94 / 4.57 | 4.5 | Pass (narrow margin) |
| `--ink-3` on `--critical-tint` | **4.42** | 4.5 | **Fail → use `--ink-2` (6.02)** |
| `--ink-2` on `--sky-tint` / `--sage-tint` / `--warn-tint` / `--conflict-tint` | 6.42 / 6.33 / 6.72 / 6.22 | 4.5 | Pass |
| `--on-butter` on `--butter` / hover / pressed | 8.35 / 7.21 / 5.91 | 4.5 | Pass |
| `--butter-edge` on `--bg` | 3.71 | 3 | Pass |
| `--focus-ink` on `--focus-bg` / on `--focus-panel` | 8.89 / 7.20 | 4.5 | Pass |
| `--focus-muted` on `--focus-bg` | 6.39 | 4.5 | Pass |
| `--butter` on `--focus-bg` (button and ring) | 6.16 | 3 | Pass |
| `--focus-edge` on `--focus-bg` (on-dark button border) | 3.53 | 3 | Pass (a 35 % translucent border measured 2.49, **Fail**, so it was rejected) |
| `--ring` (Forest) on `--bg` | 8.89 | 3 | Pass |
| `--line-strong` on `--surface` / `--bg` | 3.53 / 3.29 | 3 | Pass |
| `--harbor` on `--sky-tint` (fixed text) / rail on `--surface` | 6.87 / 7.97 | 4.5 / 3 | Pass |
| `--forest` on `--sage-tint` (text) / rail on `--surface` | 8.11 / 9.55 | 4.5 / 3 | Pass |
| `--estimate` on `--estimate-tint` / on `--surface` / on `--sage-tint` | 6.29 / 7.46 / 6.33 | 4.5 | Pass |
| `--warn` on `--warn-tint` | 6.08 | 4.5 | Pass |
| `--conflict` on `--conflict-tint` | 5.54 | 4.5 | Pass |
| `--critical` on `--critical-tint` / on `--surface` | 5.91 / 7.32 | 4.5 | Pass |
| `--success` on `--success-tint` | 5.33 | 4.5 | Pass |
| `--progress` on `--progress-track`; `--critical` fill on track | 8.11 / 6.22 | 3 | Pass |
| Paper on Harbor (selected chip) / on Forest-hover / Forest-pressed | 7.43 / 10.44 / 12.26 | 4.5 | Pass |
| Sage as a progress fill on its track (rejected) | 1.74 | 3 | **Fail → not used** |

**Dark theme**

| Pair | Ratio | |
|---|---:|---|
| `--ink` on `--bg` / `--surface` | 14.90 / 13.44 | Pass |
| `--ink-2` on `--surface`; `--ink-3` on `--surface` / `--surface-2` | 9.40; 6.32 / 5.39 | Pass |
| `--ink-3` on `--sky-tint`; `--ink-2` on critical / conflict / warn tints | 5.71; 8.89 / 8.80 / 8.68 | Pass |
| `--line-strong` on `--surface` | 3.71 | Pass (3:1) |
| `--on-butter` on `--butter`; `--butter` on `--surface` / `--bg` | 8.35; 10.18 / 11.29 | Pass |
| `--focus-ink` on `--focus-bg` / `--focus-panel`; `--focus-muted` on `--focus-bg` | 11.37 / 9.42; 7.18 | Pass |
| `--focus-edge` on `--focus-bg` | 4.09 | Pass (3:1) |
| `--harbor` (fixed) on `--sky-tint`; fixed rail on `--surface` | 8.48; 9.38 | Pass |
| Sage rail and progress on `--surface` / track | 7.70 / 6.57 | Pass |
| estimate / warn / conflict / critical / success on their tints | 8.42 / 9.22 / 7.74 / 7.66 / 8.52 | Pass |
| `--ink` on dark `--sage-tint` | 11.53 | Pass |

**Validate (not computed):**
- Butter and Ink focus rings over photos (none exist yet).
- Any colour pair not listed above.
- The real rendered result in browsers that apply forced colours (Windows High Contrast). Test with `@media (forced-colors: active)`; see §11.

### 5.4 Meaning map (never by colour alone)

| Meaning | Colour | Required non-colour cue |
|---|---|---|
| Fixed / protected commitment | Harbor on Sky tint, Harbor rail | 🔒 lock icon, plus a "Fixed" or "Class · Face-to-face" label, plus a **square** path node |
| Flexible task | Forest rail on surface (Sage on dark) | **Round** path node, task icon, duration |
| One-time vs weekly | Inherits fixed styling | The text "One-time" or "Weekly" |
| AI estimate | Violet | "≈" prefix, a dashed underline on the duration, and the "AI estimate" text chip |
| Next / current step | Butter ring node, Focus Card | "Now" chip, the "WHAT TO DO NEXT" eyebrow |
| Done | Success (green) | ✓ icon, strikethrough title, filled node |
| Missed / check-in | Warn | ↺ icon, "Not marked done" text |
| Moved by a replan | Butter wash (transient) | "Moved" chip, old time struck through, before → after line |
| Clarification needed | Warn | ? icon, a question as the title |
| Conflict (two fixed items overlap) | Conflict / Clay | Overlap icon, "Decision needed" title, both items shown with locks |
| Infeasible / unscheduled | Critical / Brick | Hourglass icon, "Not enough time" title, required-vs-available numbers |
| Error | Critical | ⚠ icon, "Couldn't update your plan", plus "Your plan hasn't changed" |
| Priority (High / Med / Low) | **Neutral** (Ink on surface-2) | A three-bar glyph (▮▮▮ / ▮▮▯ / ▮▯▯) plus the word. **Never** red, amber or green |

---

## 6. Space, shape and depth

| Token | Value | Use |
|---|---|---|
| `--space-1…8` | 4, 8, 12, 16, 20, 24, 32, 40 px | 4-px base. 16 px is the screen gutter (required at phone width) |
| Card padding | 16 px (Focus Card 20 px) | |
| Stack gap | 12 px between cards, 24 px between sections | |
| `--radius-sm` | 8 px | Inputs, chips inside cards, small buttons |
| `--radius-md` | 12 px | Timeline blocks, list rows |
| `--radius-lg` | 16 px | Cards, status cards |
| `--radius-xl` | 24 px | Focus Card, bottom sheet top corners |
| `--radius-pill` | 999 px | Buttons, chips, segmented controls |
| Borders | 1 px `--line` (decorative); 1 px `--line-strong` (interactive boundaries); 4 px left rail on timeline blocks | |
| `--shadow-1` | `0 1px 2px rgb(38 51 45 / .06)` | Cards (optional; the border is primary) |
| `--shadow-2` | `0 8px 24px rgb(38 51 45 / .10)` | Focus Card, sheets, FAB, toast |

Depth comes mainly from the border plus a tint. Shadows are reserved for the Focus Card and overlays. No glassmorphism: the existing `backdrop-filter` blur on the clock bar and nav becomes a solid `--surface`.

---

## 7. Components

### 7.1 Buttons

| Variant | Light | Dark | Use |
|---|---|---|---|
| **Primary** | `--butter` bg, `--on-butter` text, 1 px `--butter-edge` border | Same, without the edge | The single most important action: "Start task", "Apply to my plan", "Continue", "Generate my schedule" |
| **Secondary** | `--surface` bg, `--ink` text, 1 px `--line-strong` | Same | Alternatives: "Edit text", "Not yet" |
| **On-dark** (inside the Focus Card) | Transparent, `--focus-ink` text, 1 px `--focus-edge` border | Same | "Done", "Snooze" |
| **Ghost / link** | No border, `--forest` text, underline on hover | Sage text | Low-emphasis: "Undo", "Adjust" |
| **Destructive** | Secondary style with `--critical` text | Same | "Remove task", "Reset". Always confirm or offer undo |

- **States:**
  - Hover: `-hover` token.
  - Pressed: `-pressed` token plus `transform: scale(.98)`.
  - Focus: 2 px `--ring` outline, 2 px offset (`--ring-on-dark` inside the Focus Card).
  - Disabled: `--surface-2` bg, `--ink-disabled` text, no border colour change, `aria-disabled="true"`, plus a visible reason next to it ("Choose how to handle the conflict first.").
- **Size:** minimum 44 × 44 px hit area (WCAG 2.2's 2.5.8 needs 24 px; this is a deliberate stricter target). Use 15 px / 600 labels, and put verbs first.

### 7.2 Inputs, chips and toggles

- **Inputs:** `--surface` bg, 1 px `--line-strong`, `--radius-sm`, 44 px tall, 16 px text. The label always sits visibly above the field (no placeholder-only labels).
- **Choice chips** (questionnaire, conflict options, ambiguous dates) are radio-style pills:
  - Unselected: surface with `--line-strong`.
  - **Selected:** `--harbor` bg with Paper text (7.43:1) plus a ✓ icon.
  - Use `role="radio"` / `aria-checked` inside a `role="radiogroup"` with the question as its label.
- **Info chips:**
  - Context (course code): `--surface-2`, Ink.
  - Priority: neutral, with the bar glyph.
  - Estimate: `--estimate` on `--estimate-tint`.
  - "Now": Butter bg with Ink.
  - "Moved": `--warn-tint` with Ink.
- **Checkbox and toggle:** 20 px, `accent-color: var(--forest)`, label clickable, 44 px row height.

### 7.3 Focus Card (the most important component)

```
┌ --focus-bg (Forest) · radius-xl · shadow-2 · 20px padding ┐
│ ◦—● WHAT TO DO NEXT            (eyebrow, Butter, path glyph) │
│ Right now: IT 306D until 5 PM   (13px, --focus-muted)        │
│ Start Database Proposal         (h2, Display 700, --focus-ink)│
│ — Methodology                   (17px, Body 500)             │
│ Today · 10:15 AM – 11:45 AM · 1.5 hrs  (time style, tnum)     │
│ [IT 306D] [▮▮▮ High] [≈ AI estimate?] [Session 1/2]           │
│ Before that: 🔒 Work shift 6:30–10:30 PM  (if applicable)     │
│ ┌ --focus-panel · radius-md ┐                                │
│ │ Why this?  (600)  explanation, ≤ 3 sentences              │
│ └───────────────────────────┘                                │
│ [▶ Start task (Butter)] [✓ Done] [Snooze]                     │
└──────────────────────────────────────────────────────────────┘
```

- **Hierarchy:** task title → time → why → actions. The "Why this?" panel is always visible, not collapsed. Transparency is a core principle (story §23.4).
- **In progress:**
  - eyebrow "IN PROGRESS" with a static Butter dot (no pulsing under reduced motion)
  - timer at 32 px tabular
  - actions: **Mark done** (Butter) and **Didn't finish** (on-dark)
- **Empty states:**
  - "You're all clear." with the secondary line "Tap Brain Dump when something new comes up."
  - "Nothing fits right now", which links to the Not-enough-time card. It must never look celebratory when work is unscheduled.
- **Focus-only mode** (from the stress response) shows only this card plus "Show my full plan".
- **Accessibility:** a `<section aria-labelledby>` pointing at the title. Buttons say what they do ("Snooze: move to next open block" as `aria-label`). The Butter focus ring is used inside the card.

### 7.4 Timeline ("the path")

- **Layout:** a 56 px time column (right-aligned, tabular), a 2 px path rail (`--line-strong` light / `--line-strong` dark) with 12 px nodes, then the block card.
- **Nodes:**

  | Node | Meaning |
  |---|---|
  | ■ Harbor square | Fixed |
  | ● Forest/Sage circle | Flexible, filled once done |
  | ◎ Butter ring | Current or next |
  | ○ hollow | Upcoming flexible |
  | dashed ○ | Free time |

- **Block styles:**

  | Kind | Surface | Rail | Title | Meta line |
  |---|---|---|---|---|
  | Class / work / org / one-time event (fixed) | `--sky-tint` | 4 px `--harbor` | 🔒 + Ink 600 | `7:00 – 10:00 AM · Class · Face-to-face` or `· One-time` / `· Weekly` |
  | Flexible task session | `--surface` | 4 px `--forest` | Task icon + title + priority chip | `10:15 – 11:45 AM · 1.5 hrs · part 1/2` |
  | Commute / routine / lunch (soft buffers) | Transparent, dashed `--line` | None | `--ink-2` 500 | Time range |
  | Open time | Transparent, dashed `--forest` (Sage on dark) | None | "Open time" in `--forest` | `2 hrs free` |
  | Done | `--surface-2` | 4 px `--success` | ✓, struck through in `--ink-3` | `Done` |
  | Missed (check-in) | Transparent, dashed `--warn` | None | ↺, struck through | `Not marked done — moved to Tue 9:30 AM` |
  | Past (not done) | 55 % opacity is **not allowed** (it breaks contrast) → `--ink-3` text on `--surface-2` | | | |

- **The "Now" line** is a 2 px Butter line across the rail with a "Now · 4:45 PM" pill (Butter bg, Ink text).
- **The current block** gets a 2 px Butter outline.
- Fixed blocks open the commitment sheet; task blocks open task details. All blocks are `<button>`s with an accessible name made from title, time and type ("IT 302, class, fixed, 7 to 10 AM").

### 7.5 Task card (Tasks tab)

- **Fields:**
  - Title (h3)
  - Course context (small, `--ink-3`)
  - Neutral priority chip
  - **Due** (an exam shows "Exam: Wed, Oct 14")
  - **Est** with an "≈" prefix and estimate chip when estimated, plus "(45 min left)"
  - **Status** in words: Scheduled / In progress / Needs a deadline / Doesn't fit yet / Done
  - **Next** session time
  - Subtasks as a ✓ / ○ list
- **Overdue:** a `--critical` "Overdue" word next to the date, plus a ⚠ icon.
- **Groups:** "Needs attention", "Up next", and a collapsed "Completed".

### 7.6 Status cards (one per engine status; see §8)

Shared anatomy: a 16 px radius, the tint background, a 1 px border in the status colour at 40 % mixed with `--line`, then:
- an icon (20 px, status colour)
- a title (h3, Ink)
- 1–2 lines of body (`--ink-2`)
- structured content: change list, options or numbers
- a primary action (Butter) and a secondary action

### 7.7 Capacity bar ("Does it all fit?")

- Track `--progress-track`, fill `--progress`. When over capacity, the fill is `--critical` and gets a ⚠ plus the text "2 hrs short".
- A verdict pill shows **"Fits"** (success) or **"X hrs short"** (critical). The numbers are always written out: "6 hrs of work due by Sun · 53 hrs open".
- This is optional (story §22). It sits **below** the Focus Card and status cards.

### 7.8 Replan summary ("Plan updated")

- **Title:** "Plan updated". **Trigger:** "Because: Added work shift (Mon 6:30–10:30 PM, one-time)".
- **Change list**, one row per item:
  - `Database Proposal — Methodology   Mon 6:15 PM → Wed 10:15 AM   [Moved]`
  - Use `<s>` for the old time with visually hidden "was" text.
  - Actions render as words: Moved / Added / Completed / Removed / Couldn't fit.
- **Fixed line:** "🔒 Fixed commitments unchanged", or "except IT 306D on Mon, Oct 12, which you chose to skip".
- **Next line:** "Next: Buy Groceries · Tomorrow 11:15 AM".
- **Actions:** **Undo** (secondary) and **Dismiss** (icon).
- Changed timeline blocks get a 1.2 s Butter wash (§9) and keep a "Moved" chip until the card is dismissed.

### 7.9 Brain Dump capture

- Opened from the **FAB**: 64 px circle, Butter, with a "brain-dump" glyph (a stroked SVG speech-to-list mark; the 🧠 emoji is replaced), and the visible label "Brain dump" under it in the nav.
- **Mic button:** 88 px Forest circle with a Paper mic icon. While listening it shows a Butter ring and the text "Listening… tap to stop" (the text matters, not just the animation).
- **Textarea** is labelled "Or type it out". Tabs read "Speak or type" and "Form".
- **Demo scenario chips** live in the demo section (§7.12), not mixed into product controls.

### 7.10 Extracted-item review cards (Phase 2 → student confirmation)

- **Header:** an editable title, and an "Include" checkbox (label "Add to plan").
- **Fields:** Due, Time needed (≈ and estimate chip if estimated), Priority.
- **Clarification block** (warn tint): ? icon, the engine's `clarification_needed` text verbatim, then the answer control (date picker, or date chips for ambiguity). Below it: "SIKAD won't guess a deadline. Without one, this is saved but not scheduled."
- **Event cards:** "🔒 New fixed commitment", the date and time, and "One-time — only affects Mon, Oct 12" with a link "This happens every week".
- **Guardrail and stress responses** are neutral surface cards (`--surface-2`) with no status colour. They aren't errors.

### 7.11 Bottom navigation and sheets

- **Nav:** solid `--surface`, 1 px top `--line`, five slots (Home, Overview, Brain Dump FAB, Tasks, Profile). The selected item uses a `--forest` icon and label, a 3 px top indicator bar and `aria-current="page"`. Labels are 12 px and always visible.
- **Sheets:** `--bg`, radius-xl top corners, a grip, a close button (44 px), a focus trap, Esc to close, and focus returned to the opener. Max height 92 dvh. Sticky footer actions.
- **Toast:** Ink bg, Paper text, ≤ 1 line plus an optional Undo. Duration ≥ 5 s, paused on hover or focus. Hidden while a sheet is open. It's an `aria-live="polite"` region.

### 7.12 Demo-only chrome (judging aids)

These must look unmistakably *not* like product UI:
- the demo clock
- the scenario chips
- the engine JSON viewer

Style them with a dashed `--line-strong` border, a `--surface-2` background, a mono "DEMO" tag, and the font-mono label `Demo clock`. Group the scenario chips under a "Demo scenarios" disclosure. Keep the JSON viewer in Profile → "Under the hood".

---

## 8. Status and error states (engine → UI)

| Engine signal (prompt.md) | Title | Icon | Colour | Where | Primary action | Secondary |
|---|---|---|---|---|---|---|
| `status: SUCCESS` after a change | **Plan updated** | ✓ on path | Success | Top of Home (Plan-updated card) | Dismiss | **Undo** |
| `CLARIFICATION_NEEDED` / `clarification_needed` (missing deadline, ambiguous date, contradiction, vague input) | The question itself, e.g. **"When is the physics test?"** | ? | Warn | Inline in the review card that needs it; Home shows "Needs a deadline" | Answer control (date or chips) | "Keep as is" where it applies |
| `CONFLICT` (overlaps a fixed commitment) | **Decision needed** | Two overlapping squares | Conflict / Clay | Inline in the review sheet, blocking Apply | Radio group: "Keep IT 306D" / "Go to Group study instead" / "Keep both" | Explanation: "SIKAD never skips a class or shift on its own." |
| `INFEASIBLE` + `unscheduled_tasks` | **Not enough time** | Hourglass | Critical / Brick | Home, below the Focus Card | "Review options", which expands the triage list | Per task: "Adjust" |
| `ERROR` | **Couldn't update your plan** | ⚠ | Critical | Toast plus inline at the trigger | "Try again" | Body text: "Your plan hasn't changed." |
| Alert `INFO` | — (inline note) | ⓘ | Info | Within the Plan-updated card | — | — |
| Alert `WARNING` (overdue, pinned time unavailable) | Short sentence | ⚠ | Warn | Attention stack on Home | "Adjust" | — |
| Alert `CRITICAL` | Inside the Not-enough-time card | Hourglass | Critical | — | — | — |
| Check-in (session passed without Done) | **Did you finish …?** | ↺ | Warn | Above the Focus Card | "Yes, done" | "Not yet" |

**The "Not enough time" card must show:**
1. The numbers: "About 1 hr 15 min usable before Wed, Oct 14 · tasks due by then need 2 hrs".
2. A list of unscheduled tasks, each with duration, due date and reason ("No open block before the deadline" or "Waiting on: Plan & set up").
3. Options as text: shorten scope, check whether the deadline can move, defer low-priority work, free up time you control.
4. The sentence "SIKAD won't squeeze work into time you don't have." No "accept overload" control until audit A6.2 is resolved.

**Loading:** the Generate screen keeps the five-step progress list from story §6, with the active step marked by an inline spinner (static ● under reduced motion) and done steps by ✓. Replans finish in milliseconds in the current build, so no spinner is needed. If a real LLM is added later, show a 1-line skeleton in the Plan-updated slot.

**Empty states:**
- Timeline: "Nothing on this day."
- Tasks: "No open tasks. Tap Brain dump to add one."

They're plain text in `--ink-3`, without illustration.

---

## 9. Motion and interaction

- **Durations:** 120 ms for micro interactions (press, toggle), 200 ms for entrances (sheet, card), and 1,200 ms for the "moved" highlight fade. Easing: `cubic-bezier(.2,.7,.2,1)` (ease-out) for entering and `ease-in` for leaving.
- **Allowed motion:**
  - sheet rises 24 px
  - Plan-updated card fades and slides 8 px
  - changed timeline blocks get a Butter wash fading to transparent
  - the Now line moves when the clock changes
  - mic ring while listening
- **Not allowed:** looping decorative animation, parallax, confetti, streak bursts, or animated gradients.
- **Reduced motion:** `@media (prefers-reduced-motion: reduce)` removes all transforms and animations. The Butter wash becomes a static "Moved" chip; nothing is lost.
- **Feedback for every one-tap action** (Start, Done, Snooze, Undo): an immediate visual state change plus a toast with the result and Undo where it can be reversed.

---

## 10. Iconography and illustration

- **One icon set:** 24 px grid, 1.75 px stroke, round caps and joins, `currentColor`, inline SVG. This matches the existing nav icons, so extend that set.
- **Required icons:** home, overview (calendar), tasks, profile, brain-dump, mic, lock (fixed), path-step (next), check, undo/return (↺), clock, hourglass (infeasible), overlap (conflict), question (clarification), alert (warning/error), info, estimate (≈ glyph, which can be text), commute (bus), meal, sunrise (routine), close, chevron, plus.
- **Emoji:** none in system UI. They may appear only inside user-typed text. Replace 📝 🚌 🍽 ☀️ ✅ ⚠️ ❓ 💡 ⚡ 📋 🧠 ⏱ ✨ with the SVG set.
- **Logo:** an abstract mark showing a short curved path with a dot ahead of it (the "next move"), in Forest with a Butter dot. Use the wordmark "SIKAD" in Plus Jakarta Sans 800 at −0.02em. Avoid a literal bicycle or pedicab unless the team chooses it after A6.1. The favicon is the mark only.
- **Illustration:** optional, one per onboarding step at most (story §6 allows a mascot beside the questionnaire). Use flat Forest, Sage and Butter shapes and no characters, unless the team commissions a mascot. Decorative images use `alt=""`.

---

## 11. Responsive and accessibility guidance

**Layout:**
- **Phones are primary:** 320–480 px, single column, 16 px gutters, no horizontal scroll at 320 px, and safe-area insets on the nav and sheet.
- **Above 560 px**, keep the centred 480 px column (it already exists) for the hackathon demo.
- A two-column tablet or desktop layout (Focus Card and timeline on the left, Overview on the right) is **future work**, not part of this spec.

**Accessibility (WCAG 2.2 AA):**
- Text contrast follows §5.3. Use only the verified pairs, and use `--ink-2` for secondary text on any status tint.
- Never rely on colour alone (§5.4).
- **Focus visible:** a 2 px ring with 2 px offset on every interactive element.
- **Focus not obscured (2.4.11):** set `scroll-padding-top: 64px; scroll-padding-bottom: 104px` on `html` so sticky bars never cover focused fields.
- **Target size:** 44 px for primary targets, ≥ 24 px absolute minimum.
- **Dragging alternatives (2.5.7):** if drag-to-move is ever added, keep "Schedule at" (pin time) as the non-drag alternative. It already exists.
- **Structure:**
  - Real `<button>`s for every action.
  - One `<h1>` per view.
  - Sheets use `role="dialog"`, `aria-modal`, a labelled title and focus trap and return.
  - Status cards use `role="status"` for SUCCESS and `role="alert"` only for ERROR. Conflict and clarification aren't alerts; they're questions in context.
  - Timeline blocks need readable names: lock and path nodes are `aria-hidden`, and the type ("fixed", "AI estimate") is spoken in text.
  - Times are written out for screen readers via `aria-label`, e.g. "10:15 AM to 11:45 AM".
- **Language:** `lang="en"`. Mark any Filipino phrases with `lang="fil"`.
- **Forced colours:** in `@media (forced-colors: active)`, keep borders on cards, rails and chips (use `border-color: CanvasText`), and keep the lock and status icons visible.
- **Zoom:** test at 200 % text size. Chips wrap; time ranges never truncate.

---

## 12. Screen specifications

> These cover only the screens that exist in the current build. For each: goal · hierarchy (top → bottom) · type · colour · primary action · states · accessibility.

1. **Welcome**
   - **Goal:** set expectations and capture a name.
   - **Hierarchy:** logo mark → wordmark (display) → tagline "Find your next move." (h2, `--ink-2`) → the line "See what you can realistically get done with the time you actually have." → name field → **Get started** (Butter) → demo link (§7.12 style).
   - **States:** an empty name is allowed (fallback "there").
   - **Accessibility:** the field has a visible label.
2. **Baseline setup**
   - **Goal:** an accurate weekly class baseline.
   - **Hierarchy:** step progress (4 segments, Forest fill, plus "Step 1 of 4" text) → h1 "Set your baseline" → upload tile (dashed `--line-strong`, Forest icon) → the "simulated in demo" note (§7.12) → paste disclosure (mono text) → **schedule analysis** card (`--sky-tint`, ⓘ, plain-language summary) → class rows (fixed styling: lock and Harbor rail) → "+ Add a class" → **Continue**.
   - **States:**
     - extraction failure → the Phase 1 `clarification_needed` text shown in the warn style
     - zero classes → Continue disabled with the reason shown
   - **Accessibility:** each row's fields are labelled.
3. **Personalisation questions**
   - **Goal:** commute, day bounds, work and org.
   - **Hierarchy:** one question per card (h3 question, radio chips, optional custom input) → follow-ups expand inline under the answer → **Continue** is disabled until the required questions are answered, with the text "Answer the work and org questions to continue".
   - **Rule:** a form, not chat (story §6). The optional illustration appears beside the title only.
4. **Platform sync (optional)**
   - **Goal:** an optional connection.
   - **Hierarchy:** rows (icon, name, description, Connect). Connected shows `--success` text "✓ Connected" (text plus icon). The "Demo: simulated" tag uses §7.12 style. **Continue** is always enabled, with "You can connect more later in Settings".
5. **Brain Dump**
   - **Goal:** fast messy capture.
   - **Hierarchy:** h1 "Brain dump" → one-line instruction → mic (88 px) with "Tap to speak" → divider "or type it out" → textarea → **Extract tasks** / **Update my plan**.
   - **States:**
     - listening: text plus ring
     - voice unsupported: an inline note, not just a toast
     - empty submit: an inline error under the textarea in `--critical` with ⚠
6. **Extracted task review and clarification**
   - **Goal:** confirm before anything changes.
   - **Hierarchy:** h1 "Here's what I caught" → legend line explaining "≈ AI estimate" → review cards (§7.10), sorted so any card needing an answer comes first → **Apply** or **Generate my schedule** (Butter, disabled while a CONFLICT or contradiction is unanswered, with the reason shown).
   - **Accessibility:** when a clarification appears, move focus to the first unanswered question.
7. **Schedule generation**
   - **Goal:** convey the work being done.
   - **Hierarchy:** mark → h1 "Building your plan" → the five steps from story §6 (✓ done in `--success`, the active one bold).
   - **Accessibility:** `aria-live="polite"` announces each step. Total time stays under 3 s.
8. **Dashboard and Focus Card (Home)**
   - **Goal:** answer "what now?" at a glance.
   - **Hierarchy (fixed order):**
     1. eyebrow date plus h1 greeting
     2. **Plan updated** (if any)
     3. **check-ins**
     4. **Focus Card**
     5. blocking status (Not enough time / Needs a deadline / warnings)
     6. "Does it all fit?"
     7. timeline (Today / Tomorrow segmented control)
   - **Primary action:** the Focus Card's Butter button (the only Butter on screen).
9. **Daily timeline and task list**
   - **Timeline:** §7.4 (Home and Overview).
   - **Tasks tab:** h1 "Tasks" with an eyebrow count → secondary "+ Add a task manually" → groups (§7.5).
   - **Goal:** scan everything, edit anything (student control).
10. **Overview (schedule and workload)**
    - **Goal:** "does the week fit?"
    - **Hierarchy:** capacity card (§7.7 numbers) → 7-day strip (weekday, date, a mini load bar in Forest, planned hours as text; the selected day is Ink bg with Paper text plus `aria-selected`) → the selected day's path timeline.
11. **Adaptive replanning and change summaries**
    - **Where:** the Plan-updated card (§7.8), plus moved markers on the timeline, plus the toast for one-tap actions.
    - **Must state:** the trigger, every change as before → after, that fixed commitments were unchanged, the new next action, and Undo.
12. **Conflict and infeasible states**
    - Follow §8 exactly. Conflict is resolved **inside** the review sheet before anything is applied.
    - Infeasible lives on Home with the triage options. Unscheduled tasks also appear in Tasks → "Needs attention" with the status text "Doesn't fit yet".
13. **Focus session** (in scope as the minimal version)
    - The Focus Card's in-progress state (§7.3): timer, Mark done, Didn't finish.
    - **Amended by the final implementation brief (§11):** Start task now opens a working-method suggestion inside the Focus Card: task chunking, Pomodoro, timeboxing, or no method. The suggestion states its reason and the student can pick any option. Methods never change block times. A finished timer never completes a task; the student is asked.
14. **Settings and baseline editing**
    - **Goal:** an editable baseline.
    - **Hierarchy:** h1 name → cards: "Your day" (selects) → "Class schedule (fixed)" (rows with lock and remove; add form in a disclosure) → "Recurring commitments" → "One-time commitments" → "Cancelled sessions" (Restore) → "Connected platforms" → "Under the hood" (demo style, §7.12) → destructive "Reset" last.
    - **States:** every change triggers a replan, a toast and Undo.
    - **Accessibility:** remove buttons say what they remove ("Remove IT 302").

**Sheets:**
- **Fixed commitment:** a lock in the title, the time, "Weekly" or "One-time", the protection explanation, and an explicit "It's cancelled on Mon, Oct 12" action (secondary).
- **Task edit:** form fields; Save (Butter) and Remove (destructive).
- **Demo clock:** §7.12 style.

---

## 13. Rules for preserving existing UX and AI behaviour

The redesign is **visual and copy only.** The implementation pass must not:

1. Change any prompt.md contract (Phase 1/2/3 JSON fields, enums, ISO 8601 with offset) or the engine's logic in `js/engine.js`, `js/parser.js` or `js/store.js`.
2. Move, merge or remove the engine-driven states: check-ins, Needs a deadline, the conflict choice, contradiction questions, Not enough time, Plan updated with Undo.
3. Add any control that lets the engine change a fixed commitment without an explicit student choice, or that schedules a task without a deadline.
4. Hide "Why this?", AI-estimate labels, or the before → after change list behind extra taps.
5. Turn Brain Dump into a chat transcript (story §16, §23).
6. Remove one-tap Snooze or Done.
7. Promote optional features (capacity visuals, integrations, focus methods) above the Focus Card.
8. Add streaks, points, badges, leaderboards or "magic" AI styling. **Amended by the final implementation brief (§10):** a supportive weekly progress indicator, a count of focus sessions, and a subtle completion animation are allowed and built. They must be computed from real state and must never frame a reschedule as failure.

**Copy may change** (tone, the SIKAD name) as long as the meaning of every engine message is preserved.

---

## 14. Copy changes required by this spec

| Current | New |
|---|---|
| "Tempo" (all user-facing strings) | "SIKAD" |
| "Figure out what you can realistically accomplish…" | Tagline "Find your next move." plus "See what you can realistically get done with the time you actually have." |
| "Generate my schedule ✨" | "Generate my schedule" |
| "⚡ What to do next" | "WHAT TO DO NEXT" (path glyph) |
| "💡 Why this?" | "Why this?" |
| "📋 Plan updated" | "Plan updated" (check icon) |
| "⚠️ Not everything fits" | "Not enough time" |
| Conflict text "Which one takes priority?" | Title "Decision needed" + the same question |
| "Demo time · …" | "DEMO · Clock …" (§7.12) |

---

## 15. Phase D — Implementation handoff

### 15.1 Files to update

| File | Changes |
|---|---|
| `css/styles.css` | Replace the `:root` and dark token blocks with §5.2. Add the type, space, radius and shadow tokens (§4, §6). Add `@font-face` (§4.1). Restyle buttons, chips, Focus Card, timeline path, status cards, nav, sheets, toast and demo chrome per §7–§9. Remove `backdrop-filter`. Raise the 11 px chips to 12 px. Add `scroll-padding` and forced-colours rules (§11). Remove the `opacity: .55` past-item rule. |
| `index.html` | `<title>SIKAD — Find your next move</title>`, meta description, `theme-color` `#294B3A`, new SVG favicon (§10), font preload, `<noscript>` copy. |
| `js/app.js` (rendering only) | Rename all user-facing "Tempo" strings (lines in audit A4). Replace the `LOGO` and emoji with SVG icons (§10). Make priority chips neutral with the bar glyph. Add the "≈" prefix to estimates. Add per-status card variants and titles (§8), including the missing `ERROR` and `INFO` treatments. Add square/round path nodes to the timeline. Give the demo chrome distinct markup (§7.12). Add a11y attributes (radio groups, `aria-current`, focus trap and return, live regions). Apply the copy changes in §14. **No changes to the action handlers' logic.** |
| `README.md` | Rename to SIKAD and add the tagline. |
| `fonts/` (new) | `Inter-Variable.woff2`, `PlusJakartaSans-Variable.woff2`, `OFL.txt` for each. |

### 15.2 Files to leave unchanged (behaviour)

| File | Allowed edits |
|---|---|
| `js/engine.js`, `js/parser.js`, `js/time.js` | Header comment rename only. User-facing strings inside them (alerts, explanations, clarifications) may get tone edits **only if** their meaning is unchanged. |
| `js/store.js` | Header comment only. **Keep the storage key `tempo-state-v1`**, or add a one-time migration that copies it to `sikad-state-v1`. A plain rename silently wipes demo state. |
| `js/data.js` | Header comment. Demo data stays as is. |
| `prompt.md`, `user_story.md` | No changes. Conflicts are logged in the audit for the product owner. |
| Global namespaces `window.Tempo*` | Leave as they are for now (internal). Renaming is a separate mechanical refactor across all JS files, done after the visual pass. |

### 15.3 Token mapping (old → new)

| Old token | New token |
|---|---|
| `--bg` | `--bg` |
| `--surface` | `--surface` |
| `--surface-2` | `--surface-2` |
| `--ink`, `--ink-2`, `--ink-3` | Same names, new values |
| `--line` | `--line` (decorative), plus `--line-strong` for inputs |
| `--accent` | `--butter` (primary action) / `--forest` (brand, links, ring) |
| `--accent-soft` | `--sage-tint` or `--warn-tint` by meaning |
| `--fixed`, `--fixed-soft` | `--harbor`, `--sky-tint` |
| `--ok`, `--ok-soft` | `--success`, `--success-tint` |
| `--warn`, `--warn-soft` | `--warn`, `--warn-tint` |
| `--bad`, `--bad-soft` | `--critical`, `--critical-tint`; **new** `--conflict`, `--conflict-tint` |
| `--est`, `--est-soft` | `--estimate`, `--estimate-tint` |
| `--focus-bg`, `--focus-ink`, `--focus-muted` | Same names, new values, plus `--focus-panel` |
| `--radius`, `--radius-sm` | `--radius-lg`, `--radius-sm` (plus md, xl, pill) |
| `--shadow` | `--shadow-1` / `--shadow-2` |
| `--font` | `--font-body`, plus `--font-display` and `--font-mono` |

### 15.4 Acceptance checks for the implementation pass

- [ ] No "Tempo" in any user-visible string; the storage key is kept or migrated.
- [ ] Every colour pair used is in §5.3 (or newly computed and added there).
- [ ] Each of SUCCESS, CLARIFICATION_NEEDED, CONFLICT, INFEASIBLE, ERROR and the check-in renders with its own title and icon. Check this in both light and dark themes.
- [ ] Fixed vs flexible, estimate vs given, and done / missed / moved are distinguishable in greyscale (take a screenshot and desaturate it).
- [ ] Only one Butter button per view.
- [ ] Keyboard-only run of onboarding → Brain Dump → conflict choice → Apply → Undo, with a visible focus ring throughout and focus returned after sheets close.
- [ ] Usable at 320 px width and at 200 % text zoom.
- [ ] The existing demo scenarios (the 10 chips) and the Monday story still produce the same engine outputs (compare the engine JSON viewer before and after).

---

## 16. Amendments from the final implementation brief

`prompts/prompt-5/sikad_final_implementation.md` extends this spec. Where they differ, the brief wins. Nothing in the colour, type or spacing system changed.

| Area | Was | Now |
|---|---|---|
| Capture panel name | "Brain dump" sheet (changes only) | **Ask SIKAD** panel: answers questions about the plan and accepts changes. The setup step keeps the name "Brain dump". |
| Voice | Mic toggle | **Dictaphone** states: ready → recording (Stop / Cancel) → editable transcript. A labelled demo fallback appears when the browser has no speech recognition. |
| Applying a change from Ask SIKAD | Applied at once, with Undo | Two confirmations: review the interpretation, then **Accept or Reject the proposed plan**. One-tap Done and Snooze on the Focus Card still apply at once with Undo. |
| Focus session | Elapsed timer only | Working-method suggestion, Pause / Resume / End, then "Is this piece of work complete?" |
| Progress | Not allowed ("gamification") | **This week** card: a horizontal bar and plain numbers. No streaks, points, badges or circular meters. |
| Brief §13 "Notion-inspired desktop workspace, blue accents" | n/a | **Not applied.** The existing phone-first Forest / Paper / Butter design in this document was kept, because the brief also says not to redesign the existing interface. |

New components reuse existing tokens: Ask answers use the card style with a Forest rail (Amber when information is missing); Focus Mode panels use `--focus-panel` and `--focus-edge`; the progress bar uses `--progress` on `--progress-track`.
