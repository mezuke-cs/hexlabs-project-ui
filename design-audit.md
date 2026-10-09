# SIKAD — Design Audit (Phases A & B)

> Scope: a product, branding and design-system audit of the current SIKAD prototype. Nothing has been changed in this pass. The final system is in [design.md](design.md).
>
> Inputs I read in full: [user_story.md](user_story.md), [prompt.md](prompt.md), [updated_context.md](updated_context.md), [README.md](README.md), [index.html](index.html), [css/styles.css](css/styles.css), and every file in [js/](js/). The project has no hackathon workbook, submission document, font files, image assets or prior design documentation.
>
> How to read the evidence labels:
> - **Verified** means I computed it with a script: WCAG 2.x relative-luminance contrast ratios and the rubric arithmetic.
> - **Judgment** means it's a design opinion, not a user-test result.
> - **Validate** means it needs checking before anyone relies on it.

---

## Phase A — Project audit

### A1. Confirmed requirements (from user_story.md + prompt.md)

| Area | Requirement | Source |
|---|---|---|
| Purpose | Help students see what's due, how much usable time they have, whether it fits, what to do next, and what changes when plans change | story §1, §3 |
| Audience | Persona: a 3rd-year BSIT student at a state university (FTF and online days, commute, optional work or org). updated_context.md widens this to **Filipino senior high school and college students** | story §2; updated_context §2 |
| Core differentiator | Adaptive replanning: detect the change, reassess time, reprioritise, redistribute, preserve deadlines, show what changed, give a new next action | story §13 |
| Onboarding | Welcome → Baseline (COR upload, or mock/manual entry) → structured questionnaire (a form, *not* chat) → optional platform sync → Brain Dump → review → "Generate" with a progress screen | story §6 |
| Primary UI | A dashboard, not a chat. Focus Card at the top (most prominent), then today's vertical timeline, then bottom navigation with a central Brain Dump FAB | story §15 |
| Focus Card | Shows the task, part, time range and duration, plus "Why this?", Start / Mark Done / Snooze. Snooze is a one-tap replan | story §12 |
| Interaction model | Structured input is primary, natural language is secondary, clarification happens only as an exception (one focused question) | story §16 |
| Structured outputs | Task card, schedule block, conflict alert, replanning summary, "Why this?" | story §17 |
| Protected constraints | Fixed commitments (classes, confirmed shifts, exams, student-marked) are never silently moved. Conflicts are surfaced and the student decides | story §13; prompt §3 |
| Temporary by default | New items are one-time unless the student says they recur | story §14 |
| Estimates | AI durations are always labelled and editable, and never presented as facts | story §9; prompt §5 (`is_ai_estimate`) |
| No invented facts | Missing deadline → `deadline: null` plus a clarification, and scheduling is blocked. Contradictions → `CLARIFICATION_NEEDED` | story §9, §18; prompt §5 |
| Feasibility | 15-minute buffer around flexible tasks (none between back-to-back fixed events), dependencies respected, overdue tasks kept and prioritised, long tasks split, and when time is short → `INFEASIBLE` plus `unscheduled_tasks`. The engine must never invent time | prompt §4 |
| Engine statuses | `SUCCESS`, `CONFLICT`, `INFEASIBLE`, `CLARIFICATION_NEEDED`, `ERROR`. Alert levels: `INFO`, `WARNING`, `CRITICAL`. Change actions: `SCHEDULE`, `RESCHEDULE`, `CANCEL`, `COMPLETE` | prompt §7 |
| App vs AI boundary | The app does overlap maths, validation, constraint protection, persistence and **rendering**. The AI interprets, estimates, proposes and structures | prompt §2 |
| Safety | No graded work (offer a breakdown instead), no mental-health diagnosis, no outcome guarantees, and the student stays in control | story §19; prompt §6 |
| UX principles | Show don't chat · one tap to replan · AI recommends, student controls · transparency · temporary by default · honest about constraints · fast capture, structured output · the engine is invisible | story §23 |
| Core vs optional | Core: the engine and everything it outputs. Optional: reminders, the available-vs-required *visual* dashboard, and real integrations | story §22 |

### A2. Existing implementation decisions (what the code does today)

Stack: vanilla HTML/CSS/JS with no build step and no dependencies. Scripts are plain `<script>` tags attaching to `window.Tempo*` namespaces. State lives in `localStorage` under the key `tempo-state-v1`.

| Area | Current decision | Where |
|---|---|---|
| Layout | Mobile-first single column, `max-width: 480px`, centred "phone frame" on desktop | `css/styles.css` `#app` |
| Fonts | **No web fonts.** System stack only: `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, …` | `css/styles.css` `--font` |
| Colour | Warm neutral background `#f4f2ee`, orange accent `#e2572b`, dark-teal Focus Card `#1f2a2e`, indigo for fixed items `#4b5b8a`, red/amber/green for priority, violet for AI estimate | `:root` tokens |
| Dark theme | Already implemented via `prefers-color-scheme` plus a `[data-theme]` override | `css/styles.css` |
| Icons | A mix: inline SVG for nav, close, lock and mic, but **emoji** for content (📝 🚌 🍽 ☀️ ✅ ⚠️ ❓ 💡 ⚡ 📋 🧠 ⏱) | `js/app.js` |
| Logo | Inline SVG stopwatch ("Tempo") in orange | `js/app.js` `LOGO`; `index.html` favicon |
| Screens built | Welcome · Baseline (upload simulated, paste/extract, editable class rows, "Schedule analysis") · Questionnaire with chips · Sync (mock) · Brain Dump (mic + textarea) · Task review · Generating · Home (update card, check-ins, Focus Card, attention cards, "Does it all fit?" bar, today/tomorrow timeline) · Overview (7-day strip + timeline) · Tasks · Profile/Settings · bottom sheets (Brain Dump review, task edit, fixed commitment, demo clock, engine JSON) | `js/app.js` |
| Status UI | Plan-updated card (green tint) · check-in card · conflict prompt inside the Brain Dump review (red tint) · contradiction question (amber) · "Not everything fits" card (red tint) · "needs a deadline" card (amber) | `js/app.js` |
| Focus session | Start → "In progress" with an elapsed timer (real seconds) → Mark done / Didn't finish. No Pomodoro | `js/app.js` `focusCard`; `js/store.js` |
| Demo-only chrome | Sticky "Demo clock" bar, scenario chips, "Engine output" JSON viewer | `js/app.js` |
| Engine | Deterministic rule-based stand-in for the LLM that emits the prompt.md JSON contracts | `js/parser.js`, `js/engine.js`, `js/store.js` |

### A3. Previously proposed branding (updated_context.md §3)

- Name **SIKAD**, concept "The Gentle Momentum".
- Tagline **"Make your next move count."**
- Support line "Plan thoughtfully. Focus intentionally. Adapt freely."
- Aesthetic: nature-inspired, editorial, softly kinetic, modern, with a sense of journey.
- Palette: Forest `#294B3A`, Sage `#A8B99A`, Paper `#F7F5EC`, Butter `#EBCB70`, Sky `#B9D2DF`, Ink `#26332D`.
- Type candidates: Manrope, Plus Jakarta Sans, Inter, DM Sans.

### A4. Inconsistencies and conflicts found

**Naming (product renamed to SIKAD; nothing changed yet, as instructed):**

| File | "Tempo" occurrences |
|---|---|
| `index.html` | L6 `<title>`, L7 meta description, L16 `<noscript>`. The L8 theme colour and L9 favicon are still the orange Tempo mark |
| `js/app.js` | User-facing copy at L35 (estimate tooltip), L112 (wordmark `<h1>`), L135, L298, L469, L633, L777, L963, L1009, L1024. Also the `LOGO` SVG and the file header comment at L2 |
| `js/store.js` | L2 header comment; **L12 storage key `tempo-state-v1`** (renaming it will orphan saved data unless it's migrated) |
| `js/engine.js`, `js/parser.js`, `js/time.js`, `js/data.js` | File header comments (L2) |
| All JS files | Global namespaces `TempoTime`, `TempoData`, `TempoParser`, `TempoEngine`, `TempoStore` (internal, not user-visible) |
| `css/styles.css` | L1 header comment |
| `README.md` | L1 title and body copy |

**Documentation vs documentation:**

1. **"Conflict" means two different things.** user_story §17's "Conflict Alert" describes a *time shortage* ("5 hours of tasks but only 3 hours"). prompt.md calls that `INFEASIBLE` and reserves `CONFLICT` for overlapping fixed commitments. The UI must keep these visually and verbally distinct. design.md uses "Not enough time" for `INFEASIBLE` and "Decision needed" for `CONFLICT`.
2. **"Accept the overload (not recommended)"** is offered in story §17. prompt §4 says the engine must not invent time or squeeze work in. **This is an open question** (see A6). design.md does not include an "accept overload" control until it's resolved.
3. **Groceries "No deadline".** Story §6 and §20 show a task without a deadline being scheduled. prompt §5 says a missing deadline blocks scheduling. The current implementation only schedules groceries because the input said "sometime this week" (resolved to Sunday). This needs a product decision on "no-deadline / someday" tasks; it isn't a visual issue.
4. **Audience scope.** The story's persona is a college BSIT student, with COR, commute and work shifts. updated_context targets **SHS and college**. SHS students have a "class program", not a COR, are more likely to be minors, and rarely have work shifts. This affects copy ("COR"), examples and tone, but not the visual system.
5. **The "assistant interface"** (story §8, §13) is described as "chat-like". The implementation uses a Brain Dump bottom sheet with a structured review, which fits §16 and §23 better ("Show, don't chat"). design.md keeps the sheet and doesn't add a chat screen.
6. **The story's sample timetable contradicts itself.** For example, the replanned Tuesday study block (10:30–12:30) overlaps ADET (9–11). This only matters for demo data, but the UI must never be designed around the story's literal times.

**Documentation vs implementation:**

7. The **optional** "available vs required" visual (story §22) is already built ("Does it all fit?" bar, Overview capacity card). That's fine, but design.md treats it as secondary to the Focus Card and timeline.
8. A **dark theme** exists in code but isn't requested anywhere. I evaluate it in B3.
9. `ERROR` status and `INFO`-level alerts have **no visual treatment** in the current UI. `CONFLICT` and `CLARIFICATION_NEEDED` appear only inside the Brain Dump review sheet, which is reasonable because they happen before anything is applied.
10. **Priority colours reuse status colours.** "High" priority is red, the same family as `CRITICAL` and infeasible. Priority is a *ranking*; it isn't an error. This is a semantic collision.
11. **Accessibility failures in the current palette (Verified):**
    - White on the orange accent `#e2572b` is **3.73:1**. That fails AA for the 13–15 px button labels used throughout.
    - Tertiary text `#8a857e` on `#f4f2ee` is **3.27:1**, which fails AA for body/meta text and is used heavily for timeline metadata.
12. **Emoji as functional icons** (📝 task, 🚌 commute, ⚠️, ❓) render differently on each platform, can't be recoloured to match status, and are announced inconsistently by screen readers. Story §6 and §17 use emoji in example copy, but that doesn't make them an icon system.
13. **"Generate My Schedule ✨"** and the 💡/⚡ markers lean toward "AI magic". That conflicts with story §23.8 ("The engine is invisible") and updated_context's ban on generic AI aesthetics. Keep the words, drop the sparkle.
14. **Demo chrome looks like product UI.** The demo clock bar uses the same styling as real controls and could be mistaken for a feature during judging.

### A5. My recommendations (summary; detail in Phase B and design.md)

- **Keep** the name SIKAD and the nature palette's core (Forest, Paper, Ink, Butter). Refine the tagline toward *finding* the next move rather than optimising it.
- **Recommended direction: "Grounded Path".** Nature-editorial calm with a single functional kinetic motif: the timeline drawn as a path, with the "next move" as the highlighted step on it.
- **Status taxonomy:** five visually distinct treatments mapped 1:1 to engine statuses. Priority stays neutral and never uses error colours.
- **Fonts:** Plus Jakarta Sans for headings, Inter for body and all numbers, self-hosted.
- **Dark theme:** keep, but only with the verified token set in design.md.
- **Icons:** one stroked SVG set. Emoji only inside user-written content.

### A6. Unresolved questions (need a product owner decision)

1. Is **SIKAD** an acronym (what does it stand for?) or the Filipino word *sikad*? This decides capitalisation ("SIKAD" vs "Sikad") and the logo concept. My understanding is that *sikad* means "to kick / push off" or "to pedal", and is also a Visayan term for a pedicab. **Validate** this with native Tagalog and Cebuano speakers, and do a trademark search.
2. Should time-shortage cards offer **"Accept the overload"** (story §17) or not (prompt §4)?
3. How should **no-deadline / "someday" tasks** behave (A4.3)?
4. Is **SHS** in scope for the MVP demo? If so, should the baseline step say "class program" alongside "COR"?
5. Should UI copy stay **English**, or allow light **Taglish** microcopy? The fonts below support Filipino text either way.
6. Does the team have **brand assets** (a logo or mascot)? Story §6 allows "a mascot/illustration" beside the questionnaire, but none exist.

---

## Phase B — Design evaluation

### B1. Branding decisions

| Decision | Verdict | Reasoning |
|---|---|---|
| Name **SIKAD** | **Keep** (Validate meaning and trademark) | Short, ownable and local. If it means "push off / pedal", it maps directly to the product's job: get the student moving on the next thing, even after a setback. It differentiates from generic English names like "Tempo" or "Focus". All-caps reads as an acronym, so confirm (A6.1). |
| Concept "The Gentle Momentum" | **Keep** as an internal brand idea | It captures the contrast between energetic name and calm interface. It shouldn't appear as UI copy. |
| Tagline "Make your next move count." | **Refine** → **"Find your next move."** | "Count" implies pressure to maximise output, which clashes with "honest about constraints" and the no-guaranteed-outcomes rule (story §19). The product's promise is *clarity about the next step*, including when the plan breaks. "Find" is calmer, true on bad days, and echoes the Focus Card's job. Keep "Make your next move count" as a secondary campaign line if the team likes it. |
| Support line "Plan thoughtfully. Focus intentionally. Adapt freely." | **Refine** → **"Plan realistically. Focus on one thing. Adjust when life changes."** | "Realistically" is the product's core value (story §1). "Adapt freely" overpromises, because fixed commitments are *not* free to change. Plainer verbs also work better for SHS readers. |
| "The name provides the energy; the interface provides the calm." | **Keep** | It's the right guardrail against sports or hustle branding. |
| Nature-inspired, editorial, softly kinetic, journey | **Refine** | Nature and editorial set a good tone. "Kinetic" must be *functional* (path and progress), not decorative motion. "Editorial" should mean typographic hierarchy and whitespace, not magazine layouts. The screen is a dense planner and must stay scannable. |

### B2. Typography

The current implementation uses system fonts only, so nothing needs migrating.

| Candidate | Strengths | Weaknesses for SIKAD | Verdict |
|---|---|---|---|
| **Inter** | Built for UI at small sizes, very clear numerals, tabular figures (`tnum`), large x-height, huge language coverage (Filipino needs only basic Latin + ñ) | Neutral, so it brings little personality alone | **Keep for body, UI and all numbers** |
| **Plus Jakarta Sans** | Warm, slightly rounded geometric grotesk with Southeast Asian origins (Jakarta). Distinctive at heading sizes and pairs well with the nature palette | Wide letterforms cost space in dense 12–13 px timeline metadata, and figure support is less proven | **Recommend for headings and brand moments only** |
| Manrope | Clean geometric with good numerals | Cooler, more "fintech", and its semi-condensed feel weakens the warm tone | Not chosen |
| DM Sans | Friendly, low contrast | Geometric "a"/"g" at small sizes and low stroke contrast make dense timelines harder to read | Not chosen |
| A serif (e.g. Fraunces) for the "editorial" feel | Strong editorial signal | A third style, plus a risk of looking like a reading app rather than a planner | Not chosen; the editorial feel comes from hierarchy instead |

- **Is a second font necessary?** Yes, but it's limited to headings (two weights). Personality from Plus Jakarta Sans, legibility and numbers from Inter. A single-font fallback (Inter only) is acceptable if file weight becomes a concern.
- **Validate:** confirm tabular figures (`font-feature-settings: "tnum"`) in the exact Inter build that gets self-hosted. Don't rely on `tnum` in Plus Jakarta Sans; numbers always use Inter.
- **Licensing:** both are on Google Fonts under the SIL Open Font License 1.1, which allows self-hosting and bundling. **Validate** by keeping the `OFL.txt` that ships with each download.
- **Loading:** the hackathon demo depends on venue Wi-Fi, so **self-host WOFF2** in `/fonts/` with `font-display: swap`. A Google Fonts `<link>` is simpler but breaks offline demos and adds a third-party request. Full fallback stacks are in design.md.

### B3. Colour

**The proposed palette, Verified (WCAG 2.x contrast):**

| Pair | Ratio | Result |
|---|---:|---|
| Ink `#26332D` on Paper `#F7F5EC` | 12.06:1 | Pass AA/AAA text |
| Forest `#294B3A` on Paper | 8.89:1 | Pass AA text |
| Paper on Forest | 8.89:1 | Pass. Forest works as a dark card |
| Ink on Butter `#EBCB70` | 8.35:1 | Pass. Butter can carry Ink-labelled buttons |
| Forest on Butter | 6.16:1 | Pass |
| Butter on Paper (as a boundary) | 1.44:1 | **Fail** 3:1. A Butter button needs a darker edge or must sit on Forest |
| Sage `#A8B99A` on Paper (as a boundary) | 1.91:1 | **Fail** 3:1. Sage is decoration and tint only, never meaning |
| Sky `#B9D2DF` on Paper (as a boundary) | 1.44:1 | **Fail** 3:1. Tint only |
| Sage as text on Paper | 1.91:1 | **Fail**. Never use Sage for text |
| Ink on Sage / Ink on Sky | 6.32 / 8.37:1 | Pass. Usable as filled chips with Ink text |

**Per-colour verdicts:**

| Colour | Verdict | Role in the final system |
|---|---|---|
| Forest `#294B3A` | **Keep** | Brand primary, Focus Card background, focus ring on light, progress fill, flexible-task rail |
| Ink `#26332D` | **Keep** | All primary text, and the label on Butter buttons |
| Paper `#F7F5EC` | **Keep** | App background, plus a slightly brighter surface `#FFFDF7` for cards |
| Butter `#EBCB70` | **Keep + Refine** | The *single* primary action colour (one Butter button per view), plus the "current / next" marker on the path. Needs an edge `#9A7A22` (3.71:1 on Paper, Verified) when it sits on light backgrounds |
| Sage `#A8B99A` | **Refine** | Decorative and tint only. A tinted `#E6EDDE` serves as the flexible-task surface. It **fails as a progress fill** (1.74:1 against its track, Verified), so Forest fills progress instead |
| Sky `#B9D2DF` | **Refine** | Its tint `#E3EEF3` becomes the fixed-commitment and calendar surface, paired with a new deep "Harbor" `#2F5468` for text, rails and lock icons (6.87:1 on the tint, Verified) |
| *(new)* Harbor `#2F5468` | **Add** | Fixed / protected commitments and info |
| *(new)* Violet `#5B4A86` | **Add** (it already exists in code as a concept) | AI-estimate marker. Uncertainty needs its own hue so it isn't confused with status |
| *(new)* Amber `#7A5300` / Clay `#9A3F22` / Brick `#9E2A2B` | **Add** | Clarification, conflict and infeasible/critical, which are three separate meanings (see design.md §5.4) |
| Current orange `#e2572b` | **Replace** | Fails AA with white text, and it belongs to the old Tempo identity |
| Current red/amber/green priority chips | **Replace** | Collide with status semantics (A4.10) |

**Dark theme: Keep, with conditions.** It's worth keeping for these reasons:
- the persona uses the app on the bus and before bed (story §15)
- it already exists in code
- every dark token pair in design.md has been Verified at ≥ 4.5:1 for text and ≥ 3:1 for non-text

It must not slow down MVP work. If time runs short, ship light only by deleting the dark block, which is a one-block change.

### B4. Visual directions

Five directions were scored 1–10 on each criterion. The weighted totals were computed by script. All scores are **Judgment**.

| Direction | Purpose 25% | Readability 20% | Emotion 20% | Distinct 15% | A11y 10% | Practical 10% | **Total** |
|---|---:|---:|---:|---:|---:|---:|---:|
| A. Nature-inspired editorial (original proposal) | 7 | 7 | 9 | 8 | 7 | 8 | **7.65** |
| B. Minimalist productivity | 8 | 9 | 5 | 3 | 9 | 9 | **7.05** |
| C. Soft academic journal | 6 | 6 | 7 | 7 | 6 | 6 | **6.35** |
| D. Modern digital planner | 8 | 8 | 6 | 5 | 8 | 8 | **7.15** |
| **E. Grounded Path** (A + a functional quiet-kinetic path motif) | 9 | 8 | 9 | 8 | 8 | 7 | **8.35** |

**Trade-offs:**
- **A. Nature-inspired editorial** has the right mood. However, as proposed it puts editorial whitespace ahead of the dense schedule data the product lives on, and the raw palette fails as boundaries (B3).
- **B. Minimalist productivity** is the most legible and easiest to build. It's also indistinguishable from Todoist or Google Calendar clones, and it loses the "companion" warmth needed when a plan breaks.
- **C. Soft academic journal** has paper textures and handwritten accents. It's charming, but textures hurt contrast, handwriting hurts legibility, and it reads as a study-notes app, which the product explicitly isn't (story §21).
- **D. Modern digital planner** is a solid grid calendar. It pulls the product toward "simply a calendar" (story §21) and makes the Focus Card one widget among many.
- **E. Grounded Path** keeps A's palette and calm. It adds one motif that *does work*: the day's timeline is drawn as a path, the Focus Card is "your next step on it", completed steps fill in behind you, and replanning visibly re-routes steps. Kinetic energy shows up as progression rather than animation. The cost is slightly more CSS (a timeline rail and node states). It's practical in vanilla CSS.

**Recommendation: E. Grounded Path.** This is the only direction where the brand motif and the core feature (adaptive replanning) are the same thing.

### B5. Focus-mode evaluation (Pomodoro, time blocking, Deep Work)

- **Time blocking** *is* the engine. Every scheduled session is a time block (prompt §4: buffers, splitting, a 120-min session cap in the current engine). Nothing needs adding.
- **The focus session** (start → timer → done / didn't finish) already exists and maps to story §12. **Keep it as the MVP focus mode**: a single block with an elapsed timer. It's quiet, and it never changes the plan by itself.
- **Pomodoro (25/5):** useful only as an *optional, opt-in rhythm inside a block that's already scheduled*, and only for blocks ≥ 50 min. It must never shorten a block or create extra breaks the engine doesn't know about. Breaks happen within the block, so the block's end time stays authoritative. **Not for the MVP.** It's a Phase-2 preference ("Show break reminders in long sessions").
- **Deep Work:** no separate feature. Label sessions ≥ 90 min as "Long session" in metadata so students can plan their energy. Treat Deep Work as a description, not a mode.
- **Rule:** focus methods structure *how* a student works within a block. They must not become SIKAD's identity, add gamification (streaks, scores), or compete with the Focus Card for attention.
- **Choosing a method later:**
  - < 45 min or an errand → no method, just Start/Done.
  - 45–90 min study → offer Pomodoro if the student opted in.
  - ≥ 90 min → suggest one mid-session break, again opt-in.
  - The student's preference always wins.
