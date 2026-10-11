# SIKAD: Build Prompt Pack (apply the audit, one batch per session)

**How to use (saves tokens, which the program grades):**
1. Save **Part 0** as `CLAUDE.md` in the project root. Claude Code loads it automatically, so you never re-paste it.
2. Run **one batch per fresh session** (`/clear` between batches). Paste only that batch.
3. After each batch: open the app, run the **Accept** check yourself, then `git commit`. Don't start the next batch until it passes.
4. Resolve the **Decisions** below once. Defaults are filled in; edit if you disagree.
5. Order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9. Batches 1-6 are the minimum shippable set. 8 and 9 are the first to drop if time runs out.

Reference: `SIKAD-UIUX-AUDIT-REPORT.md` (finding IDs like F03 refer to it). Line numbers below are approximate. **grep the function name first.**

---

## Decisions (defaults assumed; change before running)

| ID | Decision | Default |
|---|---|---|
| D1 | design.md §11 says keep the 480px column above 560px. Allow desktop layout? | **Yes.** Batch 7 updates §11 first. If you answer no, skip batch 7. |
| D2 | Judge-mode trigger | `?demo=1` (persisted) **or** 5 taps on the version text in Profile |
| D3 | Import review (integrations) | Dedicated sheet right after a successful connect |
| D4 | First real integration | Google Calendar. The other three show "Coming soon" until wired. |
| D5 | "Why this?" on the Focus Card | Keep visible (not changed by these batches) |

---

## Part 0: `CLAUDE.md` (project rules, save once)

```markdown
# SIKAD build rules

Stack: vanilla HTML/CSS/JS PWA. No frameworks, libraries, build step, npm packages, or new fonts/colors outside design.md tokens.
Source of truth: `design.md` (+ `motion-spec.md` for motion). Audit: `SIKAD-UIUX-AUDIT-REPORT.md`.
Scope: UI/UX only. Never change engine.js / parser.js / store.js behavior or the JSON contracts. Keep every existing `data-action` name working.
Design rules to keep: one primary (Butter) button per view; protected items show lock + "Fixed"; AI estimates show ≈ + "AI estimate"; every replan shows before → after + Undo; the student always decides.

## How to work (token budget is limited; this is graded)
- Do ONLY the batch I paste. No refactors, renames, cleanups, or "while I'm here" changes.
- Never read whole files. `grep -n` the function/selector, then `view` a narrow line range. app.js is ~150KB.
- Edit with targeted replacements. Never rewrite a whole file.
- After editing JS run `node --check js/app.js`. Fix before reporting.
- Skills: use `frontend-design`, `make-interfaces-feel-better` for visual edits; `motion-design` only if motion is touched (native CSS/WAAPI, follow motion-spec.md); `ios-design` for safe-area/touch work. Don't use gsap-* or vercel-* skills.
- Report in ≤ 8 lines: files changed, what the user will see, how I verify it, anything you did NOT do and why.
- Append 3 lines to `process-log.md`: what changed, why (finding IDs), one test you ran and what it showed. Plain language. Students must be able to explain it.
- If something in the batch conflicts with design.md or the code, stop and ask one question instead of guessing.
```

---

## Batch 1: Gate demo UI behind judge mode (F01, S04) · P0

```markdown
Batch 1. Hide all demo UI in product mode; show it only in "judge mode" via ONE dock.

Find (grep): `demo-tag`, `demo-link`, `clock-bar`/`clockBar()` (~654, called in shell() ~640), `loadDemo`, `loadDemoConfirm` (~1213, ~1658), "Under the hood" / demo-section in profileView (~1206-1213), "Insert a sample transcript", "Use Alex's example", `obSampleCor`, "Skip ahead 5 min". Also `.demo-tag`, `.demo-link`, `.clock-bar`, `.demo-section` in css/styles.css.

Do:
1. Add `isJudge()`: true if URL has `?demo=1` (then persist in localStorage `sikad-judge=1`), false if `?demo=0` (clear it), else read localStorage. Try/catch all storage access.
2. Add a hidden toggle: a small "SIKAD v1.0" text at the bottom of Profile; 5 taps within 3 seconds flips judge mode and re-renders.
3. In product mode render NONE of: DEMO tags/badges, the clock bar, "Skip setup and load Alex's week", sample transcript, "Use Alex's example", sample COR, skip-ahead, "Under the hood", "Reset demo to the initial scenario". The real "Reset & restart setup" in Profile stays.
4. In judge mode show them in ONE collapsible dock (collapsed by default, a small "Judge tools" pill; solid border, not dashed). Dock contains: clock (current time, +15m, +1h, Next day, set time), Load Alex's week, Reset demo, View engine output (JSON), and sample-input shortcuts when on the relevant onboarding step.
5. Product mode must use the REAL clock. Check how `now()` works. If it uses a simulated offset, make sure the offset is 0 and unused when not in judge mode. Don't change engine/store behavior.
6. Onboarding Welcome in product mode: logo, name field, "Get started" only.

Don't: restyle anything else; remove the demo features themselves.

Accept: default URL shows no DEMO badges, clock bar, or sample buttons anywhere (Welcome, every onboarding step, Home, Overview, Tasks, Profile). `?demo=1` shows one dock with all of them, and the time simulator + Load Alex still work. 5 taps on the version text toggles it. Reload keeps the setting.
```

---

## Batch 2: Quick wins (F03, F06, F10) · P0/P1

```markdown
Batch 2. Three small fixes.

A. Single Undo (F03). In `updateCard()` (~709) remove the "Undo this change" button (~726). Keep the toast Undo (~286). The Plan-updated card must still show what moved (before → after) and dismiss itself after ~8s, or on ✕. Don't change the undo snapshot logic (`undoSnap`).
B. Theme toggle (F06). `themeToggle()` (~92) is called in onboarding (~323), Home (~668, ~673), Overview (~1086), Tasks (~1115), Profile (~1158). Remove it from all except Profile, and render it there as a labeled "Appearance" row (Light / Dark / System) inside "Your day" or its own small card, not a floating pill. Follow the OS setting by default. Keep the existing storage key and no-flash script in index.html.
C. Name bug (F10). At ~1681 `state.user.name = (ob.name || '').trim() || 'there'` stores the word "there". Store '' instead. Keep display fallbacks: Home greeting "Hey, there" (~675), Profile title "You" (~1158). Grep for other code that reads `state.user.name` and make sure an empty string doesn't break it.

Accept: Snooze → one Undo (toast) only; Undo restores. Toggle appears only in Profile. Skipping the name shows "Hey, there" on Home and "You" on Profile (not "there").
```

---

## Batch 3: Focus flow, less decisions (F02) · P0

```markdown
Batch 3. Simplify the Focus Card flow. Read `focusCard()` (~746), `focusPicker()` (~805), the idle actions (~777-783), and `js/focus.js` suggestion logic (read only the function that suggests a method).

Do:
1. "Start task" begins the session immediately using the already-suggested method (keep that logic and the "why" text). No picker step.
2. In the in-progress card show a small line "Method: Pomodoro · Change". "Change" opens the existing picker (4 options) as it works today, then returns to the timer.
3. Idle card actions stay: Start (the only Butter button), Done, Snooze.
4. Keep the "Why this?" panel as is.

Don't: change method suggestion rules, timers, or the session data model.

Accept: Home → Start → timer running = 1 tap (was 3). "Change" still lets me switch method mid-session. Done/Snooze unchanged. `node --check` passes.
```

---

## Batch 4: Class schedule (F05) · P1

```markdown
Batch 4. Profile → Class schedule. In `profileView()` (~1173) the classes render as a flat `ul.fixed-list` with a bare ✕ (`data-action="removeClass"`, handler ~2010 uses `baselineChange`).

Do:
1. Group classes by day (Mon→Sun, skip empty days) with a day header (e.g. "Monday · 2 classes · 8 hrs"). Sort by start time inside a day. Keep the lock icon and "Fixed" label.
2. Row = title, time range, Face-to-face/Online. Replace the ✕ icon with a text "Remove" button, 44px min target.
3. Removing must show a toast "Removed IT 302 · Undo". Check what `baselineChange` already does; reuse its undo/replan toast if it exists, don't duplicate.
4. "Add a class" stays; put it after the list.
5. Apply the same row pattern (text Remove, undo toast) to recurring and one-time commitments if trivial; skip otherwise.

Accept: Profile shows day headers; Remove → toast with Undo; Undo restores the class and the plan. Works at 360px without horizontal scroll.
```

---

## Batch 5: Limitations and guardrails (F25) · P0 (program requirement)

```markdown
Batch 5. Add a plain-language "How SIKAD plans & its limits" section in Profile (the program requires a limitations statement). In product mode it replaces "Under the hood" (JSON view stays in judge mode only, from batch 1).

Place it as a card below "Connected platforms", above Reset. Short lines, no jargon, no chips. Use this copy (verify the data line against the code before keeping it):
- "SIKAD plans your time. It doesn't do your schoolwork or write graded work for you."
- "It isn't a counselor or a health tool, and it doesn't judge your stress. If things feel like too much, talk to someone you trust or your school's guidance office."
- "Times marked ≈ are guesses. Change them anytime."
- "A plan isn't a promise. SIKAD can't guarantee grades or that everything fits. It shows you when it doesn't."
- "Your classes and fixed commitments never move unless you change them. You decide."
- "Your data stays on this device." (Only keep if the code has no server calls. grep for fetch/XMLHttpRequest; if integrations will change this, write "unless you connect an account".)

Accept: Profile (product mode) shows the section; copy matches design.md voice (§1 microcopy). No new colors.
```

---

## Batch 6: Integrations with real states (F12) · P1, required

```markdown
Batch 6. Integration rows: states + a clean seam for real wiring. Read `integrationRow()` (~452), `toggleIntegration` (~1773, currently flips a boolean in `state.integrations`), and `INTEGRATIONS` in js/data.js (~76).

Do (UI only; keep `state.integrations` boolean for persistence):
1. Add a UI-only map `ui.integrationState[id] = { status, account, lastSync, imported, error }` with status in `idle | connecting | connected | error | unavailable`. Render from `data-state` on the row.
2. Rows: idle → "Connect"; connecting → spinner + "Cancel"; connected → account label, "Synced 2:14 PM · 5 items", "Disconnect"; error → plain cause + "Try again"; unavailable → disabled, "Coming soon".
3. Seam: `window.SikadIntegrations = { gcal: { connect() {} }, ... }`. `connect(id)` returns a Promise of `{ account, items:[{title, due, source}] }` or rejects with `{ message }`. If no adapter for an id → status `unavailable`. Only `gcal` is expected to be wired by the team; leave `gcal.connect` as a clearly commented stub.
4. In judge mode only, a labeled "Simulated" adapter may return sample items. Product mode never shows `connected` without a real adapter result.
5. After a successful connect open a sheet listing imported items (source chip, checkbox, editable title/due). "Add N to plan" uses the existing add-task path. Don't invent a new scheduling path. Ask me if you can't find one.
6. Onboarding Step 3 uses the same rows; the step stays skippable. Replace emoji icons in INTEGRATIONS (data.js ~76-79) with the existing SVG icon set if they render as emoji.

Accept: product mode: gcal row → connecting → (stub) error with "Try again"; other three show "Coming soon" disabled. Judge mode: simulated connect → connected row + import sheet → items added show a source chip. No console errors.
```

---

## Batch 7: Desktop layout (R01-R06) · only if D1 = yes

```markdown
Batch 7. Responsive desktop. FIRST edit design.md §11: replace the "keep the centred 480px column" rule with: mobile single column; ≥768px left side rail replaces bottom nav; ≥1024px two-column Home and Profile; content max-width 1200px. Then implement. Prefer CSS; add DOM wrappers only where a grid needs them. Existing rule is `@media (min-width: 560px)` at css ~165.

Do:
1. ≥768px: bottom nav → fixed left rail (~200px): logo, Home, Overview, Tasks, Profile, and the Ask SIKAD button (icon + label). Remove bottom padding reserved for the bottom nav.
2. ≥1024px Home: left column = Focus Card + This week (sticky), right = Timeline. Profile: left = Class schedule, right = Your day, commitments, integrations, limits.
3. #app max-width 1200px centered; bottom sheets/modals max ~520px centered at ≥768px.
4. Fix the class-row grid (~css 306) for wide screens; stack day/time under ~500px.
5. Mobile (<768px) stays exactly as is. Keep `env(safe-area-inset-*)`.

Accept: at 360, 390, 768, 1280px: no horizontal scroll; rail visible ≥768; two columns at 1280 for Home and Profile; mobile looks unchanged; light + dark both fine.
```

---

## Batch 8: Hierarchy and copy (S01-S06, F04, F13) · skippable

```markdown
Batch 8. Visual hierarchy and copy. Don't change structure beyond what is listed.

1. F04/F13: fold `fitCard()` (~954) into `weekCard()` (~932) as one line: "6 of 9 hrs done · 3 sessions · Fits" (or "2 hrs short"). Delete the standalone Home card. Keep the full capacity bar only in Overview. Compact This week to a progress bar + that line; history behind a chevron.
2. S02: `.eyebrow` only for dates/times and the "What to do next" label. Section headings become normal headings. Remove eyebrows from Tasks, Overview, Profile headers.
3. S03: max 3 chips per card (context + priority + state). Move "Long session", "Session x/y" etc. into a plain metadata line.
4. S01: differentiate by role: Focus Card = largest radius + shadow; status cards = border only, no shadow; timeline cards = left rail. Use existing tokens only.
5. S04: no dashed borders in product UI (`.upload` ~279 → solid, hover = forest border). Dashed remains only in judge-mode dock if at all.
6. S05 copy: Sync title/body → "Bring in your due dates" / "Connect a calendar or class platform to import deadlines. Skip it if you prefer." Keep the voice in design.md §1.

Accept: Home above the fold at 390px: Focus Card + one This week line; ≤ 3 chips per card; no eyebrow on Tasks/Overview/Profile; no dashed borders in product mode.
```

---

## Batch 9: Reliability and accessibility pass (F17, F19, F23, F24, offline) · partly skippable

```markdown
Batch 9. Small fixes. Verify before changing; skip anything that already works.

1. F24: `obExtract()` (~1716) and "Extract classes"/"Extract tasks": add a loading state, disable the button while running, ignore double taps.
2. F19: in `@media (prefers-reduced-motion: reduce)` (~css 714) also set `transition-duration: .01ms` for buttons/cards. Keep the completion state change (no animation, still visible).
3. F17: tab through every screen with the keyboard; every custom control (`.chip-btn`, `.method-opt`, `.clock-step`, `.daychip`, `.tl-card`) needs a visible `:focus-visible` ring (2px, offset 2px, per design.md §11). Add only where missing.
4. F23: `html { scroll-padding-bottom: calc(104px + env(safe-area-inset-bottom)); }`. Check bottom sheets with inputs aren't covered by the keyboard.
5. Offline: listen to `online`/`offline`; when offline show a slim banner (tokens only): "You're offline. Your plan still works. Syncing resumes when you're back." Check whether a service worker exists (none was in the project listing). If missing, add a minimal `sw.js` that caches the app shell (index.html, css, js, fonts, icons, manifest), register it in index.html in try/catch. Don't cache integration API calls.
6. Touch targets: only interactive elements under 44×44 (chips that are buttons, timeline nodes if tappable). Leave display-only tags alone.

Accept: double-tapping Extract runs once; keyboard tab-through shows a ring everywhere; OS "reduce motion" removes transitions; DevTools offline → banner appears and the app still loads after one prior visit.
```

---

## Final regression (after batches, one short prompt)

```markdown
Read-only check. Don't edit. Walk these flows in the code and report pass/fail with tap counts, in a table: (a) first launch → first plan, (b) Home → Start → Done → what changed, (c) Snooze + Undo (one Undo only), (d) remove a class + Undo, (e) connect gcal / see "Coming soon" on others, (f) return visit: is the Focus Card the first thing? Also confirm: no demo UI in default mode, `?demo=1` dock works, limits section visible, `node --check js/app.js` passes, no console errors at load. List only failures in detail.
```

---

## Process log (rubric: 20% ownership; also covers "≥3 documented tests")
Each batch appends to `process-log.md`. Before submitting (Oct 14), copy at least 3 entries as your **test + correction** evidence, and add the final token usage record. Keep each entry in your own words so all three of you can explain it in Q&A.
