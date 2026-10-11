# SIKAD UI/UX Audit Report (v2, consolidated)

> Read-only audit. Nothing in the project was changed. Rubric weights (35/35/20/10) are confirmed against the hackathon program PDF.
> Freeze: **Oct 14, 2026**. (The PDF says the final showcase is Oct 16 in the schedule table but Oct 18 in §8. Confirm with organizers.)

**Evidence labels:** **Verified** = cited code/CSS checked. **Judgment** = design opinion. **Validate** = needs a check before relying on it. **Agent render** = taken from the agent's Playwright captures, not independently re-checked.

**What changed from v1 (reviewer pass):**
- Removed F08/F09 and the old Batch 7. The onboarding step counter is correct: Baseline(1) → Lifestyle(2) → Sync(3) → Brain dump(4), with progress hidden on Welcome and Plan.
- **F15 rewritten.** v1 and the first patch had wrong contrast numbers. Recomputed from `css/styles.css` tokens (see F15): secondary text passes AA, so there is no P0 contrast issue.
- F10 root cause corrected. It is where the name is *stored*, not where it is displayed.
- Added desktop/responsive (R), AI-slop (S), rubric mapping, and guardrail findings (F25, F26).
- Found a **conflict with design.md §11** (see D1). Desktop findings depend on it.
- Re-checked by the reviewer: F03, F06, F10, F11, F15, F25, and the CSS refs in S02/S04. Other findings carry the agent's refs.

---

## 1. Verdict

SIKAD reads as a **working prototype**, not a product. Four things drive that:
1. **Demo chrome is exposed in product mode:** DEMO badges, time-sim bar, "Skip setup / load Alex's week", sample transcript, "Use Alex's example", skip-ahead, "Under the hood", reset-demo. There is no `?demo=1` gate.
2. **Flat hierarchy and repeated patterns:** Home shows Focus Card, This week, Does it all fit?, and Timeline at equal weight. Cards, eyebrows, chips, and dashed borders repeat uniformly (S01-S04).
3. **Heavy interaction on the Focus Card:** Start → method picker (4 options + paragraph + Start + Back) → in-progress, plus two Undo surfaces after a replan.
4. **Phone column on a laptop:** a 480px column with large dead margins on desktop, which is how judges will likely see it.

**Top 3 changes for rubric impact:**
1. Gate all demo UI behind `?demo=1` plus one dock (P0, S)
2. Focus flow progressive disclosure and a single Undo (P0, M)
3. Class schedule grouped by day with undo, plus the limitations/guardrails statement (P1, S)

---

## 2. Journey Table

Tap counts are agent estimates (Judgment). Re-count when building.

| Flow | Taps now (necessary / removable) | Main friction | Proposed fix | Target |
|---|---|---|---|---|
| (a) First launch → first plan | ~7 / ~2 (demo links) | Many decisions across Baseline → Lifestyle → Sync → Brain dump → Review. **Validate** how many questions Lifestyle (`app.js:395`) asks. | Keep the 4-step flow. Pre-fill Lifestyle defaults; hide demo links in product mode. | ≤ 6 |
| (b) Focus → Start → Done → see change | 4 / 1 | Method picker forces a choice before the timer starts | Default to Start; disclose "How to work?"; auto-open only for long sessions | 2 |
| (c) Snooze / replan with Undo | 1 + Undo on toast / 1 duplicate | Two Undo surfaces: Plan-updated card AND toast | One Undo (toast); card dismisses itself | 1 |
| (d) Fix a wrong class | 3 / 0 | Bare ✕ with no confirm/undo; flat list | Group by day; Remove + undo toast | 3 |
| (e) Connect integration → review imported | 2 / 1 | Only idle/connected states | Add connecting/error/unavailable and an import review | 2 |
| (f) Return visit: "what now?" in 2s | 0 / 0 | Attention cards can push the Focus Card down | Keep Focus Card first; collapse attention cards | 0 |

---

## 3. Findings

| ID | Screen | Issue | Evidence | Impact | Effort | Fix |
|---|---|---|---|---|---|---|
| F01 | All | Demo UI exposed in product mode | Verified: `css/styles.css:235` `.demo-tag`; `js/app.js` ~338, 444, 467, 565, 653, 715, 872, 1206-1213 | P0 | S | `?demo=1` flag at bootstrap, persisted in localStorage; wrap demo chrome in one collapsible dock |
| F02 | Home | Focus flow too heavy | Verified: `js/app.js:804-828` `focusPicker()`, `777-783` idle actions | P0 | M | Default Start/Done/Snooze; "How to work?" opens picker; auto-open only for long sessions |
| F03 | Home | Duplicate Undo: Plan-updated card AND toast | **Verified (reviewer):** card `app.js:726`, toast `app.js:286` | P0 | S | Keep Undo in toast only; auto-dismiss card |
| F04 | Home | Flat hierarchy; "Does it all fit?" duplicates Overview's capacity bar | Verified: `app.js:672-692` order; `954-967` vs `1087-1091` | P1 | S | **Fold into This week as one line** ("Xh done of Yh planned · Z sessions · Fits / N short"). Keep the full bar only in Overview. Don't delete: it is feasibility transparency. |
| F05 | Profile | Class schedule: flat rows, no day grouping, bare ✕ delete | Verified: `app.js:1173` | P1 | S | Day headers, Remove + undo toast, inline edit |
| F06 | All | Theme toggle repeated on every screen | **Verified (reviewer):** `app.js:323, 668, 673, 1086, 1115, 1158` | P1 | S | Move to Profile ("Appearance"); follow OS by default |
| F07 | All | Identical outline pills for Back/Edit/Connect/Pause | Verified: `css/styles.css:185-187` `.btn.ghost` | P1 | S | Distinct roles: Back = ghost, Edit = small text button, Connect = state-driven, Pause = on-dark |
| F10 | Welcome → Profile | Profile title shows "there". The name is **stored** as `'there'` when the field is empty. | **Verified (reviewer):** `app.js:1681` `state.user.name = (ob.name\|\|'').trim() \|\| 'there'`; Profile already falls back to "You" at `app.js:1158` | P2 | S | Store `''` at line 1681; keep display fallbacks (Home "there", Profile "You") |
| F11 | Nav | FAB label "Ask SIKAD" vs design.md "Brain Dump FAB" | **Verified (reviewer):** `app.js:645` | P2 | S | Decide: "Ask SIKAD" fits what it does (ask, add, report change). Update design.md instead of the label (Judgment). |
| F12 | Profile/Onboarding | Integration rows only idle/connected | Verified: `app.js:452-456` | P1 | M | `data-state`: idle / connecting / connected (account, last-synced, imported count, Disconnect) / error (cause + Retry) / unavailable ("Coming soon"). Required: integrations will be real. |
| F13 | Home | This week is paragraph-heavy (3-4 text lines) | Verified: `app.js:939-949` | P2 | S | Progress bar + one line; history behind a chevron |
| F14 | All | Token drift | Verified: tokens match design.md (`css:24-91`); demo chrome hardcodes dashed borders (`css:235, 410`) | P2 | S | Replace with tokens; disappears once demo UI is gated |
| F15 | All | **Contrast (corrected).** Real text pairs pass. See table below. | Computed from `css:24-60` tokens | P2 | S | No P0. Only fix is non-text boundaries (use `--butter-edge`, already defined). |
| F16 | All | Touch targets possibly <44px (chips, timeline nodes) | **Validate:** `--target: 44px` exists; `.chip` may be display-only | P2 | S | Check interactive elements only; leave non-interactive tags alone |
| F17 | All | Custom controls may lack visible focus | **Validate:** global `:focus-visible` at `css:161` | P1 | S | Keyboard-tab through all custom controls |
| F18 | All | Dark-mode gaps in demo chrome | Verified: hardcoded demo styles | P2 | S | Resolved by gating demo UI |
| F19 | All | Reduced motion may leave button transitions | **Validate:** `css:714-717` | P1 | S | Test with OS setting; extend rule if needed |
| F20 | Sync | INTEGRATIONS use emoji icons in data | Verified: `js/data.js:76-79`. **Validate** whether they render (screenshots show SVG glyphs). | P2 | S | Remove if unused |
| F21 | Home | Motion vs motion-spec.md | Source-only: tokens match; `motion.js` not traced | P2 | S | Check against spec §10 acceptance criteria |
| F22 | All | State coverage gaps (see §4) | Judgment | P1 | M | Per table |
| F23 | Mobile | Keyboard may cover inputs in sheets | **Validate:** `css:138` `scroll-padding-bottom: 104px` | P1 | S | Add safe-area to padding; test on a real phone |
| F24 | Onboarding | "Extract tasks" wait not double-tap safe | Verified: `app.js:1716-1726` | P1 | S | Loading state, disabled while running |
| F25 | Profile | **No visible guardrails/limitations statement.** The program requires one. | **Verified (reviewer):** grep for graded/diagnos/guarantee finds only a code comment, `parser.js:358`. No user-facing copy. | P0 | S | Profile section "How SIKAD plans & its limits": never does graded work, never diagnoses stress/burnout, never guarantees outcomes, AI estimates are editable, you decide. |
| F26 | Demo | Demo path may exceed the 3-5 min slot | **Validate:** README demo script not in the zip I received | P1 | S | Time a run; script it as Load week → Focus Start → Done → Replan → Overview |

### F15: contrast, recomputed from tokens (WCAG 2.x)

| Pair | Ratio | Result |
|---|---|---|
| Ink `#26332D` on bg `#F7F5EC` | 12.06 | Pass |
| Forest `#294B3A` on bg | 8.89 | Pass |
| Ink on Butter `#EBCB70` | 8.35 | Pass |
| Forest on Butter (same pair as Butter on Forest) | 6.16 | Pass AA |
| **Ink-2 `#4A5750` on bg (secondary text)** | **6.94** | **Pass** |
| **Ink-3 `#5F6B64` on bg (metadata)** | **5.10** | **Pass** |
| Ink-3 on surface-2 / sage-tint | 4.70 / 4.65 | Pass |
| Harbor on Sky-tint | 6.87 | Pass |
| Butter on bg (as boundary) | 1.44 | Fails 3:1 non-text; use `--butter-edge` (3.71, passes) |
| Sage / Sky on bg | 1.91 / 1.44 | Fail as text. **No `color: var(--sage\|sky)` found in CSS.** |
| Ink-disabled on bg | 2.89 | Below AA, but disabled controls are exempt |

Light-mode tokens only; dark mode not computed.

---

## 4. Desktop / Responsive Findings (**Agent render**; layout details not independently re-checked)

> **Blocker: D1.** design.md §11 says above 560px keep the centred 480px column ("Do not attempt a massive full-screen layout for this MVP"). `css/styles.css:165` implements that. These findings **contradict design.md**, so decide D1 first (see §9).

| ID | Screen | Breakpoint | Issue | Fix |
|---|---|---|---|---|
| R01 | Home | 1280 | 480px column with ~400px dead space each side | Two columns: Focus + This week left, Timeline right |
| R02 | Home | 768 | Bottom nav still used; chips wrap | Side rail ≥768px; icon-only FAB |
| R03 | Profile | 1280 | 13-row list stretched in a narrow column | Two columns: schedule left, commitments + integrations right |
| R04 | Profile | 768 | Class-row inputs cramped; ✕ targets close together | Stack day/time below ~500px; 44px hit area |
| R05 | Welcome | 1280 | Mobile layout blown up, large dead space | Slightly wider container, content above the fold |
| R06 | Baseline | 1280 | `.class-row` grid (`css:306`) cramped | Wider columns at ≥768px |

---

## 5. AI-Slop Findings

| ID | Signal | Evidence | Rule |
|---|---|---|---|
| S01 | Uniform rounded cards with identical radius/shadow/padding | **Validate** (line refs unchecked) | Vary by role: Focus Card = largest radius + shadow; status cards = border only; timeline = rail |
| S02 | Caps `.eyebrow` used for dates, section heads, and labels | **Verified:** `css:162`; uses at `app.js:668, 674, 1086, 1115, 1158` | Eyebrows for date/time only; sentence-case section heads |
| S03 | Chip overuse (priority, AI estimate, session, long, moved, now) | **Validate:** `css:215-233` | ≤ 3 chips per card; move the rest to a metadata line |
| S04 | Dashed borders as decoration | **Verified:** `.demo-tag` `css:235`, `.upload` `css:279`, `.clock-bar` `css:410` | Dashed = demo only; solid for product UI |
| S05 | Generic copy ("Sync your world", "Bring deadlines in from where they already live") | Verified: `app.js:441-444` | Specific copy: "Import due dates from Canvas" |
| S06 | Dead vertical space on Welcome/Baseline | Agent render | Content above the fold; Baseline: upload or paste as tabs |

---

## 6. Rubric Mapping (weights confirmed from program PDF)

| Area | Weight | What judges check | Linked findings |
|---|---|---|---|
| Problem understanding & solution design | 35% | User, root need, features that serve it | F04, F25 (limitations), S01-S06, F01 |
| System & functionality | 35% | Main journey works, complete, usable | F02, F03, F05, F12, F24, R01-R06, F17, F19 |
| Student ownership & process | 20% | Students explain prompts, decisions, tests, limits | Not a UI-polish category. Supported by F25 plus a plain-language process log and a documented test list. |
| Presentation & demo | 10% | 3-5 min live demo, Q&A | F01, F03, F26, R01-R02 |

Judges are told not to reward visual polish by itself. Journey clarity (F01-F05, F26) outranks styling (S01-S06).

---

## 7. State Coverage (agent code-trace; ✓ not independently re-checked)

| Screen | Empty | Loading | Error | Offline | Treatment needed |
|---|---|---|---|---|---|
| Welcome | ✓ | n/a | n/a | n/a | n/a |
| Baseline | ✓ | ✓ | ✓ | missing | Offline banner |
| Lifestyle | ✓ | n/a | n/a | n/a | n/a |
| Sync | ✓ | **missing** | **missing** | n/a | connecting/error/unavailable (F12) |
| Brain dump | ✓ | ✓ | ✓ | n/a | n/a |
| Review | ✓ | ✓ | ✓ | n/a | n/a |
| Home | ✓ | **missing** | ✓ | **missing** | Offline banner; timeline skeleton |
| Overview | ✓ | **missing** | ✓ | **missing** | Offline banner |
| Tasks | ✓ | **missing** | ✓ | **missing** | Offline banner |
| Profile | ✓ | **missing** | **missing** (integrations) | **missing** | Integration errors; offline banner |
| Focus Mode | n/a | n/a | ✓ | n/a | n/a |
| Ask SIKAD | ✓ | ✓ | ✓ | **missing** | Offline banner |

---

## 8. Proposed Structure per Tab

| Tab | Primary | Secondary | Disclosed | Move / remove |
|---|---|---|---|---|
| Home | Focus Card | This week (bar + one line incl. fit status), Timeline | "Needs attention" group | Remove standalone "Does it all fit?" card |
| Overview | 7-day strip + day timeline | Capacity bar (single source) | Day detail on tap | n/a |
| Tasks | Needs attention (unscheduled / no deadline / overdue) | Upcoming | Completed | **Keep "Add a task manually"** as a secondary button. It's a core user-control action. |
| Profile | Class schedule (by day), commitments | Your day, Appearance (theme), Integrations (full states), "How SIKAD plans & its limits" | Engine JSON (judge mode only) | Remove demo section from product mode |
| Onboarding | One step per screen | Progress (correct as is) | Samples/demo scenarios (judge mode) | Keep Sync skippable. Merge Baseline + Lifestyle only if testing shows drop-off. |

**Class schedule (3 lines):** group by day with a day total; each row has lock, title, time, mode, and Remove; Remove shows "Removed IT 302 · Undo" for 5s; add-class is available per day.

---

## 9. Build Backlog for Claude Code (9 batches, recommended order)

| # | Goal | Files likely touched | Acceptance check | Risk | Skip? |
|---|---|---|---|---|---|
| 1 | **Gate demo UI** behind `?demo=1` + one dock; persist; hidden gesture | `js/app.js` (bootstrap), `css/styles.css` | Default: no DEMO badges, clock bar, Skip setup, sample buttons, Under the hood. `?demo=1`: all in one dock. Time sim still works. | Low | **No** |
| 2 | **Quick wins:** single Undo, theme toggle → Profile only, store `''` not `'there'` (F10) | `app.js` (`updateCard`, `themeToggle` calls, `:1681`) | Snooze shows toast Undo only; toggle only in Profile; empty name shows "You" | Low | No |
| 3 | **Focus flow disclosure** | `app.js` (`focusPicker`), `css` | Fresh Home shows Start/Done/Snooze; picker behind "How to work?" | Medium | No |
| 4 | **Class schedule:** by day, Remove + undo | `app.js` (`profileView`), `css` | Day headers; Remove → Undo toast restores the row | Medium | No |
| 5 | **Guardrails + limitations** in Profile | `app.js` (Profile), `css` | "How SIKAD plans & its limits" visible in product mode; JSON view judge-only | Low | **No** (program requirement) |
| 6 | **Integration states** + import review | `app.js`, `data.js`, `css` | Connect → connecting → connected (account, last-synced, imported items with source chip) or error + Retry; unwired = "Coming soon" | Medium | **No** (integrations will be real); wire Google Calendar first |
| 7 | **Desktop layout** (after D1) | `css` media queries, `app.js` shell | ≥768px: side rail; ≥1024px: two-column Home/Profile; no horizontal scroll at 360/390/768/1280 | Medium | Only if D1 = keep 480px column |
| 8 | **Visual hierarchy + copy** (S01-S06, F04, F13) | `css`, `app.js` copy | ≤ 3 chips/card; eyebrows only for dates; no dashed in product UI; specific copy; fit status in This week | Low | Yes, if short on time |
| 9 | **Verification pass:** focus rings (F17), touch targets (F16), reduced motion (F19), mobile keyboard (F23), offline banner (§7), double-tap on Extract (F24) | `css`, `app.js` | Keyboard tab-through; OS reduce-motion; DevTools offline; no horizontal scroll | Medium | Partly: F24 and offline banner first |

**Shippable minimum by Oct 14:** batches 1-6. Batch 7 matters for the live demo if judges use a laptop or projector. Time estimates in v1 were unsupported and have been removed.

---

## 10. Coverage Note

| Section | Status | Notes |
|---|---|---|
| Journey walk | Agent code-trace + renders | Tap counts are estimates |
| Suspects B1-B12 | Mostly confirmed | F08/F09 were false and are removed |
| Rendering | Agent: 6 PNGs (1280/768) | Desktop findings not independently re-checked |
| Mobile screenshots | Not individually viewed by agent | Reviewer saw the 13 mobile screens in chat |
| Hackathon PDF | Not read by agent | Reviewer read it; rubric weights and required deliverables confirmed |
| Contrast | **Computed by reviewer** from tokens | Light mode only; supersedes v1 numbers |
| Token drift | Tokens match design.md | Hardcoded demo chrome only |
| Motion | Source-only | `motion.js` not traced |
| Reviewer spot-checks | F03, F06, F10, F11, F15, F25, S02, S04 | Others carry the agent's refs |
| Not verified | S01, S03, F16, F17, F19, F23, F26, state table ✓ marks | Marked **Validate** |

---

## 11. Decisions Needed (before building)

1. **D1: design.md §11 vs desktop layout.** design.md says keep the 480px column above 560px. Judges likely see a laptop or projector. Recommended: update §11 to allow a side rail and two columns ≥768px, then do batch 7. Otherwise drop R01-R06 and batch 7.
2. **D2: Judge-mode gesture.** Recommended: `?demo=1` plus 5 taps on the version text in Profile (no Konami code).
3. **D3: Integration import review.** Dedicated review sheet right after sync (recommended) vs inline in Tasks with source chips.
4. **D4: Which integration is wired first?** Recommended: Google Calendar (client-side sign-in is the most feasible without a backend); the rest show "Coming soon".
5. **D5: "Why this?" panel on Focus Card.** Collapsed by default on mobile to reduce load (Judgment), or always visible?
