# SIKAD — Project-Wide Product, Branding & Design System Audit

## Role

Act as a senior product designer, brand strategist, UI/UX architect, design systems specialist, and frontend design critic.

You have access to the SIKAD project files. Before recommending or implementing any design changes, inspect the project and understand how its product requirements, AI behavior, existing implementation, and visual identity fit together.

Your immediate task is to **evaluate the existing project and produce a finalized `design.md`**. Do not implement the redesign yet.

## Environment and working rules (Claude Code)

- **Stack:** the project is vanilla HTML, CSS, and JavaScript. Do not introduce React, Tailwind, a bundler, a build step, or any npm dependency. All design tokens must be plain CSS custom properties defined in one place (`:root`, plus a theme override block only if a dark theme is justified).
- **Fonts:** check how fonts are currently loaded. Recommend either a Google Fonts `<link>` or self-hosted files, and state the trade-off (offline demo reliability versus simplicity). Specify fallback font stacks.
- **Product name:** the product is **SIKAD**. `prompt.md` has been renamed from "Tempo" to SIKAD. If any code, comment, or UI copy still says "Tempo", list it in the audit. Do not change it yet.
- **Locate the inputs yourself:** find `user_story.md` and `prompt.md` anywhere in the project (likely the root or a docs folder). Read them in full.
- **Plan before acting:** inspect first, then write. Prefer targeted search and reading over dumping large files into context.
- **Write access in this run is limited to two new files:** `design-audit.md` (Phases A and B) and `design.md` (Phase C, plus the Phase D handoff list as its final section), both in the project root. Do not modify, rename, or delete any existing file in this run.
- **Stop after delivering those two files.** Give a short summary in chat (key decisions, conflicts found, open questions) and wait for review.

## 1. Mandatory project inspection

Read both of these files first:

- `user_story.md`
- `prompt.md` — the master system prompt for the adaptive time-management engine.

Then inspect any hackathon workbook or submission documents (only if they exist in the project; do not stop or ask if they are missing), README files, existing design documentation, source code, UI components, theme configurations, fonts, icons, images, and other relevant project files.

Search the entire available project instead of assuming a specific directory structure.

Do not rely on filenames alone. Read the actual contents.

### Understand both documents together

**From `user_story.md`, establish:**
- The target audience, user problems, and user goals.
- The onboarding and baseline personalization flow.
- Task capture and AI extraction.
- The dashboard and Focus Card.
- Scheduling, task prioritization, and workload visibility.
- Adaptive replanning and protected commitments.
- The interaction model and structured visual outputs.
- Core versus optional features.
- UX principles, edge cases, and safety boundaries.

**From `prompt.md`, establish:**
- The AI engine's responsibilities versus the application's responsibilities.
- Protected constraints and conflict handling.
- Scheduling feasibility and the 15-minute buffer rule.
- Task splitting, dependencies, and overdue-task behavior.
- How missing deadlines and estimated durations are handled.
- The engine's status values and structured output contracts.
- How next actions, schedule changes, alerts, and unscheduled tasks are represented.

Do not redesign the AI logic or change its output contracts as part of a visual branding task. Identify any issues that affect the interface, but keep the design audit separate from backend behavior changes.

Inspect other files to determine how these requirements are currently implemented, which components already exist, and which decisions have already been made.

If files conflict, identify the conflict and explain it instead of silently choosing one interpretation.

## 2. Establish the actual product identity

The product is an adaptive time-management assistant for Filipino senior high school and college students.

Its core function is to help students understand their responsibilities, calculate usable time, prioritize tasks, generate realistic schedules, and replan when circumstances change.

The product should answer:

- What do I need to accomplish?
- How much usable time do I have?
- Does everything realistically fit?
- What should I work on next?
- What changes when my schedule changes?

The main interface should present structured information, schedules, timelines, and actionable recommendations. Conversation is primarily an input and clarification mechanism, not the application's main experience.

Preserve the distinction between:
- Fixed commitments and flexible tasks.
- User-provided information and AI estimates.
- Confirmed facts and uncertain information.
- AI recommendations and student decisions.
- Successfully scheduled tasks and tasks that cannot currently fit.

Use the project files as the source of truth. Do not invent product capabilities or assume proposed features are already implemented.

## 3. Branding direction to evaluate

The current proposed identity is:

**SIKAD — The Gentle Momentum**

Primary tagline: **“Make your next move count.”**

Supporting message: “Plan thoughtfully. Focus intentionally. Adapt freely.”

The brand should feel purposeful, grounded, adaptive, encouraging, and quietly energetic.

The intended contrast is:

**The name provides the energy; the interface provides the calm.**

The initial aesthetic is nature-inspired, editorial, softly kinetic, and modern, with a subtle sense of progression or a journey.

The initial color palette is:

| Color | HEX | Intended role |
|---|---|---|
| Forest | `#294B3A` | Primary brand and strong emphasis |
| Sage | `#A8B99A` | Secondary surfaces and progress |
| Paper | `#F7F5EC` | Main background |
| Butter | `#EBCB70` | Primary actions and highlights |
| Sky | `#B9D2DF` | Calendar and informational elements |
| Ink | `#26332D` | Primary text and headings |

Potential typography:
- Manrope.
- Plus Jakarta Sans.
- Inter.
- DM Sans.

These are starting proposals, not mandatory choices.

Critically evaluate whether the name, tagline, typography, palette, and aesthetic fit the actual product. Retain strong decisions, refine weak ones, and recommend alternatives only when justified.

## 4. Evaluate the typography

Compare the existing font candidates and other appropriate options.

Evaluate readability, personality, numerical clarity, calendar labels, task titles, durations, mobile responsiveness, Filipino and English text, licensing, availability, and compatibility with the existing codebase.

Recommend:
- Primary font family.
- Whether a second font is necessary.
- Heading and body hierarchy.
- Font sizes, weights, line heights, and letter spacing.
- Styles for dates, timers, task durations, metadata, and compact schedule labels.

Choose typography for the complete application, not just a marketing page.

## 5. Evaluate the color system

Evaluate the initial palette and determine the best colors for:

- Application backgrounds and surfaces.
- Primary and secondary text.
- Navigation and selected states.
- Primary and secondary buttons.
- The recommended next-action card.
- Fixed commitments and flexible tasks.
- Calendar events and time blocks.
- AI-generated estimates.
- Focus-session controls.
- Task completion and progress.
- Informational messages, warnings, and conflicts.
- Infeasible schedules and unscheduled tasks.
- Hover, pressed, focus, selected, and disabled states.
- Charts and workload visualizations.

Create a consistent semantic token system. Do not communicate important status through color alone.

Use exact HEX values and explain why each color serves its purpose. Evaluate contrast against WCAG 2.2 AA where applicable, distinguishing verified results from untested recommendations. Compute contrast ratios with a small Node or Python script instead of estimating. Mark a color pair as verified only if you calculated it.

Consider whether a dark theme is worthwhile for the project rather than adding one automatically.

## 6. Evaluate the aesthetic and visual language

Compare at least three coherent visual directions, including the original proposal.

Potential directions include:
- Nature-inspired editorial.
- Minimalist productivity interface.
- Soft academic journal.
- Modern digital planner.
- Quietly kinetic, path-inspired interface.

Evaluate each against product alignment, readability, emotional tone, brand distinctiveness, accessibility, and implementation practicality.

Recommend one dominant visual direction.

Define appropriate:
- Spacing and information density.
- Corner radii, borders, and shadows.
- Iconography and illustrations.
- Progress indicators and decorative motifs.
- Motion and transitions.
- Responsive behavior.
- Empty, loading, error, conflict, and success states.

Avoid generic AI gradients, aggressive sports branding, excessive gamification, childish illustrations, unnecessary glassmorphism, and decorative elements that compete with the actual work.

## 7. Apply the system to the real user journey

Use the actual user stories and existing components to evaluate the relevant screens:

1. Welcome and onboarding.
2. Baseline schedule setup.
3. Structured personalization questions.
4. Optional platform connection.
5. Brain Dump and task capture.
6. Extracted task review and clarification.
7. Schedule generation.
8. Dashboard and Focus Card.
9. Daily timeline and task list.
10. Schedule and workload overview.
11. Adaptive replanning and change summaries.
12. Conflict and infeasible-schedule states.
13. Focus sessions, if included in the product scope.
14. Settings and baseline editing.

For each relevant screen, specify its primary goal, visual hierarchy, typography, colors, primary action, interaction states, and accessibility requirements.

Pay particular attention to how the design communicates:

- Why a task is recommended.
- Which commitments are protected.
- Which durations are estimates.
- What changed during replanning.
- Why a task could not be scheduled.
- Which tasks remain unscheduled.
- What decisions require the student's approval.

A successful schedule, a conflict, a clarification request, and an infeasible schedule must not all look like the same generic notification. The interface should reflect the actual engine status and provide the appropriate next action.

Do not invent additional screens or features merely to make the design system feel comprehensive.

## 8. Evaluate the focus-mode idea

I previously considered adding Pomodoro, time blocking, Deep Work, and other focus methods.

Determine how these could complement SIKAD's adaptive planning engine.

Time blocking determines when work is scheduled. Focus methods structure how a student works during that period.

Recommend which methods are appropriate for the intended product and MVP. Consider available time, task duration, task type, and user preference. Do not assume that every task needs Pomodoro or that focus sessions should become the application's main identity.

## 9. Required process and deliverables

### Phase A — Project audit

Summarize the findings from `user_story.md`, `prompt.md`, the hackathon workbook (if present), and the existing implementation.

Separate:
- Confirmed requirements.
- Existing implementation decisions.
- Previously proposed branding.
- Your recommendations.
- Unresolved questions.

Identify inconsistencies between documentation and implementation.

### Phase B — Design evaluation

Evaluate the existing branding, typography, color palette, and aesthetic.

Classify each decision as Keep, Refine, Replace, or Validate.

Compare at least three visual directions using this weighted rubric:

| Criterion | Weight |
|---|---:|
| Product-purpose alignment | 25% |
| Readability and usability | 20% |
| Emotional positioning | 20% |
| Brand distinctiveness | 15% |
| Accessibility | 10% |
| Implementation practicality | 10% |

Score each direction from 1–10, calculate weighted totals, explain the trade-offs, and recommend one direction. These are design judgments, not user-test results.

### Phase C — Final `design.md`

Produce a complete, implementation-ready `design.md` containing:

- Brand positioning and tagline.
- Design principles and visual direction.
- Typography and type scale.
- Color palette and semantic tokens.
- Component-specific styling.
- Spacing, borders, radii, and shadows.
- Iconography and illustration rules.
- Motion and interaction principles.
- Responsive and accessibility guidance.
- Screen-specific visual hierarchy.
- Status and error-state styling.
- Rules for preserving the product's existing UX and AI behavior.

Use tokens and conventions compatible with the existing project wherever possible.

### Phase D — Implementation handoff

Identify which existing files and components should be updated and which should remain unchanged.

Do not implement the redesign yet. The immediate deliverable is the audit, recommendation, and finalized `design.md` for a separate, later implementation pass.

## Final rule

Do not optimize SIKAD for appearance alone.

The final design should communicate **clarity, realistic planning, forward momentum, transparency, and student control**.

It should feel like a thoughtful companion that helps students find their next move, even when their original plan no longer works.