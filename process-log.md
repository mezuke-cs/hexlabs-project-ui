# SIKAD Process Log

Documenting fixes, test evidence, and UX adjustments per batch.

## Batch 1: Split demo and product mode (F01)
- Context & Fix: Gated simulated demo clock, sample input buttons, demo tags, and Under the Hood JSON behind isJudge() (?demo=1 or 5 taps on SIKAD v1.0 in Profile); unified demo tools into a solid-bordered collapsible judge dock.
- Test Evidence: Tested default launch without flags — verified zero DEMO badges/sample buttons rendered; verified ?demo=1 opened judge dock with clock controls (+15m, +1h, Next day, set time) and Alex's week loader; tested 5 taps on version text to toggle mode.
- Corrections & Decision: Kept now() using Date.now() in product mode and state.now in judge mode; ensured mobile viewport (360px-390px) retains clean spacing without dock overflow.
## Batch 2: Quick wins (F03, F06, F10)
- Context & Fix: Removed secondary Undo button from updateCard() to keep a single Toast Undo with 8s auto-dismiss; removed floating theme pill from Onboarding/Home/Overview/Tasks/Profile and added a labeled "Appearance" segmented control (Light / Dark / System) in Profile; fixed name storage to save '' instead of 'there' on skip.
- Test Evidence: Tested Snooze/Replan — verified Plan Updated card shows diff without secondary button, and toast contains the single working Undo; verified Appearance in Profile switches Light/Dark/System with theme-fade; verified skipping name displays 'Hey, there' on Home and 'You' on Profile.
- Corrections & Decision: Cleared updateDismissTimer during manual dismissal and undo to avoid stale timers; maintained index.html pre-paint localStorage key compatibility.
## Batch 3: Focus flow, less decisions (F02)
- Context & Fix: Streamlined Focus Card start action to 1 tap by directly launching the recommended working method without an intermediate picker; added inline "Method: [Name] · Change" control to active sessions allowing mid-session method switching.
- Test Evidence: Tested Home → Start task — verified timer began running on first tap (1 tap vs former 3); tested tapping "Change" during active session — verified 4-method picker opened, selecting alternate method and tapping Apply updated active session structure and resumed timer cleanly.
- Corrections & Decision: Kept recommendation algorithm and "Why this?" explanation untouched; ensured focusCancel returns to running timer smoothly without resetting elapsed duration.
## Batch 4: Class schedule (F05)
- Context & Fix: Grouped classes in Profile by day (Mon→Sun, skipping empty days) with summarized day headers (day, count, duration); replaced the small ✕ icon with a text "Remove" button with 44px touch target; wired baselineChange to display toast "Removed [Class] · Undo".
- Test Evidence: Tested Profile Class Schedule — verified Monday/Tuesday day headers rendered correctly with total class counts and hours; tested tapping "Remove" on a class — verified toast appeared with working "Undo" button; tapping "Undo" successfully restored class and replanned.
- Corrections & Decision: Extended the text "Remove" button and undo toast pattern to weekly recurring and one-time commitments; verified 360px mobile viewport fits without horizontal scrolling.
## Batch 5: Limitations and guardrails (F25)
- Context & Fix: Added plain-language "How SIKAD plans & its limits" card in Profile positioned below Connected platforms and above Reset; replaces Under the Hood in product mode; audited codebase for network calls (0 fetch / 0 XMLHttpRequest calls found).
- Test Evidence: Tested Profile in product mode — verified presence of limitations card containing exact required statement lines; tested in judge mode — verified Under the Hood JSON section renders cleanly alongside it.
- Corrections & Decision: Kept copy aligned with design.md §1 voice without technical jargon, chips, or extraneous decorative elements; retained device data privacy statement.
## Batch 6: Integrations with real states (F12)
- Context & Fix: Implemented window.SikadIntegrations seam with stub error in product mode and sample items in judge mode; added UI integrationState with 5 states (idle, connecting, connected, error, unavailable); built import sheet to review and add tasks with .src-chip.
- Test Evidence: In product mode, tested gcal row — verified it switches to connecting with spinner, then renders clean error state with "Try again" button while other 3 show disabled "Coming soon"; in judge mode (?demo=1), verified gcal connects, opens import sheet with source chips and checkboxes, and added tasks populate the plan with Google Calendar source chips.
- Corrections & Decision: Replaced emoji icons with SVG icons from TempoData; ensured product mode never falsely marks external services as connected without adapter results; maintained zero network dependencies and offline-first design.
## Batch 7: Desktop layout (R01-R06)
- Context & Fix: Updated design.md §11 responsive guidance; replaced bottom navigation at ≥768px with a 220px fixed left side rail including branding, navigation tabs, and Ask SIKAD button; implemented two-column layouts at ≥1024px for Home (left: Focus Card + This week sticky; right: Timeline) and Profile (left: Class schedule sticky; right: Your day, commitments, integrations, limits); centered modal dialogs at max 520px.
- Test Evidence: Tested viewports across 360px, 390px, 768px, 1024px, and 1280px — verified zero horizontal scrolling; verified mobile (<768px) retains bottom bar and single column order; verified class rows stack on mobile (<500px) and align in single rows on desktop.
- Corrections & Decision: Kept CSS-first approach using minimal DOM wrappers (.home-cols, .profile-cols); preserved display: contents and explicit flex/grid ordering to prevent order regression on mobile screens; maintained complete light and dark theme compatibility.
## Batch 8: Hierarchy and copy (S01-S06, F04, F13)
- Context & Fix: Folded fitCard into weekCard as a compact single summary line ("X of Y hrs done · Z sessions · Fits") and progress bar; removed standalone Home capacity card (retained full capacity bar in Overview); removed eyebrows from Tasks, Overview, and Profile headers; moved "Long session" and "Session x/y" to metadata lines while capping card chips to max 3; removed dashed borders in product UI (.upload, .follow, is-est input).
- Test Evidence: Verified Home above the fold at 390px shows Focus Card and compact single This week line; verified Tasks, Overview, and Profile show clean headings without eyebrow labels; verified product UI has solid borders on upload and cards.
- Corrections & Decision: Updated Onboarding sync copy to verbatim required text ("Bring in your due dates" / "Connect a calendar or class platform to import deadlines. Skip it if you prefer."); kept role differentiation sharp (Focus Card: largest radius + shadow, status cards: border only, timeline: left rail).
## Batch 9: Reliability and accessibility pass (F17, F19, F23, F24, offline)
- Context & Fix: Added loading state and double-tap debounce to obExtract and obParseDump; added transition-duration: .01ms in prefers-reduced-motion media query; added visible 2px focus-visible rings with 2px offset on all custom interactive controls (.chip-btn, .method-opt, .clock-step, .daychip, .tl-card, .task-card, .nav-btn, .fab, .remove-btn); set html scroll-padding-bottom for mobile keyboard clearance; created and registered sw.js service worker app shell cache and added online/offline listener with offline alert banner.
- Test Evidence: Verified double-tapping extraction buttons only triggers single parse execution; verified Tab keyboard navigation highlights custom controls with accessible rings; verified prefers-reduced-motion suppresses transition durations; verified offline toggle displays status banner and loads app shell reliably from cache.
- Corrections & Decision: Limited service worker caching strictly to GET requests for local static assets (index, CSS, JS, manifest, fonts, icons) while excluding any integration or dynamic calls; maintained minimum 44px touch target guidelines for interactive elements while preserving compact display chips.

