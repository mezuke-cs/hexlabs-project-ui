# SIKAD — Find your next move

AI adaptive time-management engine for students (hackathon MVP).

SIKAD is a working, clickable prototype of the product in [user_story.md](user_story.md). It's plain HTML, CSS and JavaScript, with no build step and no network calls.

**Run it:** open `index.html` in a browser. To serve it locally instead, run `python3 -m http.server` and visit http://localhost:8000.

## Demo script (≈3 minutes)

1. On the welcome screen, either do the full setup (name → **Use sample COR** → questionnaire → sync → **Use Alex's example** → *Generate*) or tap **Skip setup and load a demo week**.
2. The Home screen shows the **Focus Card** ("What to do next" plus *Why this?*), a "Does it all fit?" bar, and today's timeline.
3. Tap the demo clock (top bar) → **Mon 10:00 AM** → **Start task** → **+1h** → **Done**. The next task moves up to the Focus Card.
4. Clock → **Mon 4:45 PM (the boss texts)** → **Brain dump** → **Extra work shift tonight** → *Update my plan* → *Apply*. Only the flexible tasks move, and the *Plan updated* card lists what changed (with Undo).
5. Tap **Snooze** on the Focus Card. This is a one-tap replan with no typing.
6. Try the other Brain dump demo scenarios:
   - a class clash asks you which commitment wins
   - a missing deadline gets a question, not a guess
   - "write my essay" is refused and turned into study steps
   - stress gets a neutral reply that points to your schedule
   - vague input gets a clarifying question
   - a recurring org meeting is added to your weekly baseline
7. **Profile → View engine output** shows the Phase 1/2/3 JSON from [prompt.md](prompt.md) for every request.

## How it maps to the spec

| Pipeline stage | Where |
|---|---|
| PERSONALIZE (baseline, COR extraction → Phase 1) | `js/parser.js` `parseSchedule`, onboarding in `js/app.js` |
| CAPTURE / UNDERSTAND (brain dump → Phase 2) | `js/parser.js` `parse` (rule-based stand-in for the LLM) |
| PRIORITIZE / BREAK DOWN / SCHEDULE | `js/engine.js` `rank`, `suggestParts`, `schedule` |
| NEXT ACTION + "Why this?" | `js/engine.js` `nextSession`, `explain` |
| REPLAN (→ Phase 3) | `js/store.js` `replan`; stable replans keep still-valid sessions in place |

Rules the engine enforces:
- Fixed commitments are never moved by the engine. A class is only skipped when the student chooses that in a conflict prompt.
- Every task gets a 15-minute buffer.
- Tasks never land after their deadline. When there isn't enough time, the status is `INFEASIBLE`, with honest triage.
- Overdue tasks are kept and scheduled first.
- Task parts and dependencies stay in order.
- New commitments are one-time unless the input says they recur.
- AI-estimated durations are labelled as estimates.
- Deadlines are never invented.

## Design

The visual system follows [design.md](design.md) (rationale in [design-audit.md](design-audit.md)): Forest/Paper/Butter palette with verified-contrast tokens in `css/styles.css`, Plus Jakarta Sans + Inter self-hosted in `fonts/` (SIL OFL 1.1), and the "Grounded Path" timeline.

## Demo-build limitations
- **No LLM is called.** `parser.js` is a deterministic, rule-based stand-in that returns the same JSON contracts. To use a real model, call it with `prompt.md` as the system prompt from inside `TempoParser.parse`, and keep `engine.js` as the deterministic validator described in prompt.md §2.
- COR photo/PDF upload is simulated: it loads the sample COR text.
- Platform connections (Google Calendar, Canvas, and others) are mock toggles.
- Voice input uses the browser's Web Speech API where it's available (Chrome/Edge).
- Time comes from a simulated demo clock fixed at UTC+08:00, starting Sun Oct 11, 2026, 9:30 PM.
- Data is saved in `localStorage`. Use **Profile → Reset** to start over.
