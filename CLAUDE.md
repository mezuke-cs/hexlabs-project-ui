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
