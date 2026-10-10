# SIKAD — Final Implementation Brief

> **Status: Finalized for implementation.** The user journey has been approved. Keep the existing standalone HTML/CSS/JavaScript architecture, and implement the complete connected journey—including setup, Ask SIKAD, dictaphone/voice capture, adaptive replanning, Focus Mode, and progress tracking—in this implementation scope. Do not reduce the deliverable to a core-only slice or disconnected screen demos.

## Approved decisions

- **User journey:** Approved as described in Section 5. Build it as one end-to-end experience backed by shared application state.
- **Architecture:** Preserve the existing standalone HTML/CSS/JS project. Do not migrate to a framework or introduce a backend merely for convenience. Only propose a change if inspection reveals a concrete blocker, and explain it before making the change.
- **Implementation scope:** Complete connected journey in the current prototype, including Ask SIKAD, dictaphone/voice capture, Focus Mode, weekly progress tracking, and adaptive replanning. These features must affect the same underlying data and remain consistent with one another.
- **Execution approach:** Inspect first, then implement and test the full journey incrementally. Incremental work is an implementation technique—not permission to omit approved features from the final deliverable.


You are the lead product engineer, UX engineer, and implementation partner for **SIKAD**, our AI hackathon project: an adaptive time-management assistant for students.

Our team is required to use Claude to help build the product. Your responsibility is to implement the actual working prototype, preserve our established decisions, and help us validate the result. Do not stop at writing recommendations, generating isolated mockups, or proposing an architecture without implementing it.

We have already conducted an extensive product-discovery and "Grill Me" session in Antigravity. The decisions below summarize that work. You cannot access that conversation directly, so use this brief and the actual project files as your context.

---

# 1. SOURCE OF TRUTH AND DECISION HIERARCHY

Inspect the existing repository and relevant files before modifying anything.

Use this hierarchy:

1. **`user_story.md`** — primary source of truth for the original problem, personas, user journeys, core product behavior, UX requirements, constraints, and acceptance criteria.
2. **`prompt_final.md` (or `prompt.md`)** — our finalized backend system instructions. This contains the strict logic for handling edge cases (overdue tasks, dependencies, buffers) and how the engine must behave.
3. **This implementation brief** — carries forward our Grill Me decisions and approved feature direction. Where it explicitly extends the original specification, identify the change and update the relevant documentation consistently.
4. **All existing project files and frontend UI** — inspect the actual file tree, including `index.html`, JavaScript, CSS, assets, configuration, documentation, and tests that are present. Preserve and build on useful working functionality, visual direction, data structures, and interactions. The project is now named **SIKAD**.
5. **Our actual test results** — determine what can truthfully be claimed to work.

Do not silently discard or rewrite established decisions. If a conflict exists, explain it and distinguish an established requirement from a proposed change.

Before coding, inspect the available files and report a concise implementation audit. Then proceed with implementation rather than stopping at the audit.

# 2. PRODUCT PROBLEM AND CORE VALUE

## The original problem

Students have limited usable time, but their schedules, deadlines, assignments, and other responsibilities are scattered across different apps and school platforms, including their LMS.

They struggle to determine:
- What is due and when.
- How long their tasks may take.
- How much usable time they actually have.
- Whether their responsibilities realistically fit into that time.
- Which task they should start first.
- How to adjust when an unexpected commitment or deadline changes their schedule.

This can lead to missed deadlines, wasted time deciding what to do, unrealistic plans, and feeling overwhelmed by competing responsibilities.

## Our primary users

College and senior high school students juggling classes, assignments, exams, organization activities, group work, commutes, personal responsibilities, and sometimes part-time work.

## Our how-might-we question

How might we help students understand what they need to accomplish, see how much time they actually have, decide where to start, and adjust when their commitments change?

## The product definition

SIKAD is an **AI adaptive time-management assistant** powered by an adaptive time-management engine.

Its core value is:
**Help students understand their responsibilities, calculate usable time, prioritize tasks, create realistic schedules, and adapt when circumstances change.**

The central user question is:
**"What should I work on next?"**

The product must bridge planning and execution, but adaptive planning and replanning remain its defining capabilities.

SIKAD is not:
- A generic AI chatbot.
- A replacement for an LMS or calendar.
- A tutor or graded-work generator.
- A general-purpose productivity suite.
- A mental-health or burnout diagnosis tool.

Keep the scope focused on time management.

# 3. IMPORTANT ESTABLISHED PRODUCT RULES

These decisions must remain intact unless a specific approved change is documented.

## A. Adaptive replanning is the core differentiator
When a student adds a task, changes a deadline, reports an unexpected commitment, completes work, or cannot finish a planned session, SIKAD reassesses the affected plan.
It should:
1. Update the relevant task or commitment.
2. Recalculate usable time.
3. Reassess task priorities.
4. Replan flexible work around fixed commitments.
5. Explain meaningful changes.
6. Update the next-action recommendation.

The system must not merely append a task to a list and call that adaptive replanning.

## B. Fixed commitments are protected
Classes, work shifts, and other commitments designated as fixed are constraints.
The engine must never silently move, shorten, delete, or overwrite them to make a plan appear feasible.
If two fixed commitments conflict, surface the conflict and ask the student to resolve it.
If deadlines cannot realistically be met, show the overload or feasibility problem (an `INFEASIBLE` state) instead of changing deadlines or durations to pretend everything fits.

## C. Estimates must be transparent
Duration estimates are **initial AI estimates**, not verified facts.
Let students review and edit estimates. Do not invent deadlines or claim certainty when information is missing.
Ask targeted clarification questions when essential information is unavailable.

## D. Students retain control
SIKAD recommends and explains; the student reviews, corrects, overrides, confirms, or rejects changes.
Automatically recalculating a recommendation does not mean silently committing every change to the student's plan.

## E. Structured interface first
The dashboard, Focus Card, task list, timeline, and actionable recommendations are the primary experience.
Conversational interaction is a supporting input and clarification mechanism, not the entire application.
Avoid turning SIKAD into a full-screen generic chatbot.

# 4. TECHNICAL DECISION: KEEP THE PROTOTYPE SIMPLE

The approved architecture is the existing standalone HTML/CSS/JavaScript project. Preserve and extend it. Use:
- Standalone `index.html`.
- CSS and vanilla JavaScript.
- Tailwind CSS via CDN if it is already used.
- Inline SVG icons.
- Realistic sample/demo data.
- Browser localStorage where persistence is useful.
- Deterministic JavaScript behavior for the demo.

**Do not migrate to Next.js by default. Do not add a backend, database, or external AI API key just to make the prototype appear more sophisticated.**

Inspect the existing implementation first. If it is already based on standalone HTML, preserve that architecture unless a concrete limitation makes it unsuitable.

## Existing project files are the starting point
Inspect the actual linked repository and every relevant file already available in the project before deciding what to change. Reuse and extend the existing implementation wherever practical. Preserve useful components, styles, assets, data structures, application logic, and tests. Do not replace working files or rewrite the application from scratch without a concrete reason.

If a referenced document or file is not present or accessible, say so clearly and continue using the available project files and this brief. Do not invent files, claim to have inspected unavailable content, or block progress unnecessarily. Implement the required behavior in a way that fits the existing standalone HTML/CSS/JavaScript architecture.

The prototype should run as a standalone browser app and must not require a server or external service for its core demo workflow. If inspection reveals that the existing project has a concrete limitation, explain the simplest viable solution before making a major architectural change.

## AI implementation honesty
For this hackathon MVP, there is no required external LLM API.
Implement supported task-understanding and assistant scenarios using deterministic JavaScript rules and realistic demo data. This allows us to demonstrate the workflow without API costs or external service dependencies.
Do not pretend keyword matching is a real LLM or that an external model is connected.
Keep the implementation organized so a genuine AI model could be integrated in a later version.
External calendar and LMS integrations may be mocked, but must be clearly identified as demonstrations rather than real connections.

# 5. REQUIRED END-TO-END USER JOURNEY

Build and validate one coherent user journey from first launch through an unexpected schedule change. This journey is the main acceptance scenario for the MVP; individual screens do not count as complete if they do not share state and affect one another.

## Primary demo persona

Use a realistic fictional student, such as Alex, a college student balancing classes, commuting, assignments, exam preparation, and an occasional work shift. Treat sample values as demo data, not real user facts.

## Journey: first launch to adaptive replanning

### Stage 1 — First launch and setup

Alex opens SIKAD for the first time and sees a concise explanation of what it does. Alex enters or reviews recurring classes, commute time, unavailable periods, and other fixed commitments. Any import/OCR feature that is not genuinely implemented must be labeled as a demo and allow the extracted sample data to be reviewed and edited.

**Expected result:** SIKAD has a confirmed baseline of fixed commitments and usable-time constraints. It does not silently invent schedule details.

### Stage 2 — Capture responsibilities

Alex adds several tasks, for example:
- A database assignment due Friday, with an initial estimated duration of three hours.
- A quiz requiring study before Thursday.
- A group project with a dependency or milestone.

Alex can enter tasks using text. Voice capture should be available where supported, with a clearly labeled fallback if browser speech recognition is unavailable. Each captured task is converted into reviewable structured details. Missing critical information is clarified before it is treated as confirmed.

**Expected result:** Tasks, deadlines, estimates, and dependencies are stored in the same application state used by the rest of the product.

### Stage 3 — Review and generate the initial plan

SIKAD shows Alex a review summary of the baseline and captured tasks. Alex can edit incorrect details and confirm the information. The scheduling engine then calculates usable time, applies the required 15-minute transition buffer between a flexible task and another event (not between consecutive fixed classes), prioritizes tasks, and creates a realistic schedule around fixed commitments.

If the tasks cannot fit before their deadlines, SIKAD reports an `INFEASIBLE` state or clear overload warning instead of pretending the plan is possible.

**Expected result:** The dashboard displays the confirmed schedule, tasks, available time, and a clear **“What should I work on next?”** recommendation.

### Stage 4 — Understand the recommendation

Alex opens Ask SIKAD and asks why the database assignment is recommended first or how much usable time remains tomorrow. The assistant answers using current application data. It explains the relevant deadline, estimated workload, availability, or dependency. If the data is insufficient, it says what is missing rather than inventing an answer.

**Expected result:** The assistant reflects the actual plan and does not behave as a disconnected generic chatbot.

### Stage 5 — Start a task and choose a working method

Alex selects **Start Task** on the Focus Card. SIKAD recommends a suitable method—such as timeboxing for a task that fits a short available block, Pomodoro for a longer work period, or task chunking for a large assignment. It briefly explains the recommendation and lets Alex choose another method or start without one.

Alex begins a focus session, can pause/resume/end it, and can report whether the task is complete or partially complete. Timer completion alone never marks the assignment complete.

**Expected result:** The Focus Card, session record, task state, and progress indicator remain consistent.

### Stage 6 — An unexpected commitment changes the plan

Alex tells Ask SIKAD: “I have a work shift tomorrow from 6 PM to 10 PM.” SIKAD interprets this as a proposed one-time fixed commitment, shows the details for review, and asks for any essential missing information. Alex confirms the change.

The engine recalculates usable time and identifies flexible work that overlaps the shift or no longer fits. It protects all existing fixed commitments, applies transition buffers, reassesses priorities and feasibility, and proposes a revised plan. It explains what changed and why. Alex can review and accept or reject the proposed changes.

If the new shift conflicts with a class or another fixed commitment, SIKAD flags the fixed-fixed conflict and asks Alex to resolve it; it does not silently move either commitment.

**Expected result:** The change triggers real replanning, not merely a new task card or a chat message. The timeline, availability, Focus Card, task list, progress display, and next-action recommendation update consistently after confirmation.

### Stage 7 — An unfinished task returns to replanning

If Alex ends a focus session without finishing, SIKAD asks whether the task is complete and allows Alex to update the remaining work when needed. It preserves the task, recalculates the plan around the fixed schedule and deadlines, and explains any new feasibility issue or recommended next action.

**Expected result:** Remaining work is not lost, and the student is not punished for missing the original session.

### Stage 8 — Progress and persistence

As Alex completes work, SIKAD updates the weekly progress indicator using actual demo state. If the plan changes, the metric must remain understandable and must not frame a reasonable reschedule as failure. All accepted changes and progress must persist across page refreshes using the existing project’s appropriate client-side persistence mechanism (use localStorage for this standalone prototype unless the project already has an established alternative). This is a requirement, not an optional enhancement. After refresh, tasks, schedule changes, completed/partial work, focus-session history/counts, and weekly progress must be restored consistently. A demo reset must restore the initial scenario so the team can repeat the presentation.

**Expected result:** Progress is supportive, state is consistent, and the complete demo journey can be repeated reliably.

## End-to-end acceptance criteria

The journey is complete only when:
- Setup data feeds into the initial plan.
- Text/voice capture feeds into the same task-understanding flow.
- The assistant answers using the current state.
- Focus sessions update task/session state.
- A confirmed unexpected commitment triggers recalculation and replanning.
- Fixed commitments remain protected and the 15-minute buffer rule is applied correctly.
- An infeasible schedule is reported honestly.
- Accepted changes update all relevant views.
- The student can review, accept, reject, or correct proposed changes.
- The team can reset and repeat the scenario using demo data.

# 6. SETUP AND BASELINE PERSONALIZATION

The first-time setup must establish the context SIKAD needs to generate a useful plan.
Implement a connected flow that supports:
1. A concise introduction to SIKAD.
2. Adding a class schedule through manual entry or a clearly labeled demo import.
3. Reviewing and editing schedule entries.
4. Configuring relevant routine and availability information.
5. Adding recurring commitments, such as classes or regular shifts.
6. Capturing initial tasks through text or voice.
7. Reviewing task details, deadlines, and initial duration estimates.
8. Reviewing the baseline and resolving critical missing information.
9. Generating the initial plan from the confirmed data.

The student should be able to distinguish recurring commitments, one-time commitments, and flexible tasks.
Do not require a long onboarding questionnaire. Collect information that materially affects scheduling.
If document extraction is simulated, show the extracted example data for review and do not claim actual OCR occurred.
After setup, the dashboard must use the same accepted information. Reopening setup should allow the student to edit the baseline without accidentally resetting unrelated data.

# 7. DICTAPHONE / VOICE CAPTURE

The dictaphone is a voice-first way to capture responsibilities and schedule changes. It is not merely a microphone icon beside a text box.
Its responsibilities are distinct from the assistant and scheduling engine:
- **Dictaphone:** captures and transcribes speech.
- **Ask SIKAD:** interprets the input, clarifies missing details, and communicates with the student.
- **Adaptive time-management engine:** updates tasks, calculates usable time, prioritizes, schedules, and replans.

Implement a connected voice-capture flow:
1. Ready to record.
2. Recording with a visible status and Stop/Cancel controls.
3. Transcription shown in an editable field.
4. Review and correction.
5. Interpretation into structured tasks or commitments.
6. Clarification if essential details are missing.
7. Confirmation before consequential changes.
8. Update shared application state and trigger replanning where appropriate.

Use browser-supported speech recognition with feature detection and appropriate error handling where available.
If real speech recognition is unavailable, provide an honest demo fallback or text alternative. Never claim a real transcription occurred if it did not.
Do not introduce unnecessary audio uploads, external services, or persistent raw-audio storage.
Voice input must enter the same processing workflow as typed input.

# 8. ASK SIKAD — THE TASK-FOCUSED CONVERSATIONAL ASSISTANT

We need a usable conversational assistant, but not a generic chatbot application.
Provide an accessible **Ask SIKAD** panel or workspace integrated into the existing dashboard.
It should answer questions about the student's current plan, accept task updates, clarify ambiguous input, explain recommendations, and help the student request schedule changes.

Supported example scenarios include:
- "What should I work on next?"
- "Why is this assignment my highest priority?"
- "How much usable time do I have tomorrow?"
- "I have a new assignment due Friday. It may take three hours."
- "I have a work shift tomorrow from 6 PM to 10 PM."
- "I finished the first part of my project."
- "I need another hour to finish this task."
- "Can I realistically finish everything before Friday?"

The assistant must use actual current demo state rather than unrelated hardcoded responses.
For incomplete requests, ask a focused question instead of inventing missing information.
For consequential changes, display a structured preview and let the student confirm, edit, or cancel.
After confirmation, update the shared task data and invoke the appropriate scheduling or replanning workflow.
The assistant should explain recommendations using available deadlines, task estimates, available time, importance, dependencies, and fixed commitments.

Keep the interface restrained and consistent with the dashboard. Avoid a giant chat screen, AI mascot, decorative brain icon, emoji-heavy interface, or marketing-style "AI-powered" language.

# 9. PRIORITIZATION AND REALISTIC SCHEDULING

The user story establishes the relevant factors, but it does not establish scientifically validated numerical weights.
Implement a transparent, testable prioritization heuristic using available information such as:
- Deadline urgency.
- Remaining workload.
- Usable time before the deadline.
- Student-set importance.
- Dependencies and cascading impact.
- Whether a task fits into a realistic upcoming work block.
- **The 15-Minute Buffer Rule:** Always mathematically apply a 15-minute transition buffer between a flexible task and any other event (but not between consecutive fixed classes).

Do not claim arbitrary weights are scientifically validated.
Separate two decisions:
1. **Priority:** Which task deserves attention first?
2. **Scheduling:** When can that task realistically be completed?

A high-priority task cannot be scheduled during a fixed class. A task that cannot realistically fit before its deadline must produce a feasibility warning rather than an impossible schedule. Keep the calculation explainable enough for students and judges to understand.

# 10. NEW FEATURE: SUPPORTIVE GAMIFICATION AND PROGRESS TRACKING

Our instructor recommended gamification to improve engagement. We reconsidered the original "no streaks, no mascot, no generic chat" decision.
The direction is to **evaluate and implement supportive progress tracking without sacrificing guilt-free adaptive replanning**.

## Preferred MVP features
### Weekly progress indicator
Show completed work relative to planned work for the current week.
For example, a demo could display completed planned hours against total planned hours.
The metric must be calculated from actual demo state, not fabricated.
Define how the indicator responds when:
- Tasks are completed.
- Tasks are partially completed.
- Tasks are rescheduled.
- The weekly plan changes.
- The week changes.

Avoid misleading comparisons. If the plan is revised, make the basis of the metric clear rather than treating every change as failure.

### Meaningful completion feedback
Use subtle animations when a task is completed or a meaningful milestone is reached.
Avoid excessive confetti, mascot-based rewards, and distracting animation.

### Focus-session tracking
Track completed focus sessions from real session events and retain the session count/history across refreshes. Start, pause, resume, end, and reset controls must update actual application state; do not increment the completed-session count merely because a timer reaches zero. A finished timer must never be confused with a completed assignment.

### Streaks: separate decision
Traditional daily streaks were originally excluded because they may create pressure when students have unpredictable schedules.
Do not automatically add streaks, XP, leaderboards, badges, or punitive resets.
If evaluating streaks, recommend whether a flexible participation indicator is useful and explain the trade-offs. It must never shame students, punish missed tasks, or override realistic planning.

### Claims about time saved
Do not display "time saved from manual replanning" unless the implementation measures it against a defined baseline.
If a value is illustrative, clearly label it as demo data. Prefer a reliable, directly measured metric where practical.

# 11. NEW FEATURE: ADAPTIVE FOCUS MODE

Our goal is to bridge planning and execution.
When the student clicks **Start Task** on the existing Focus Card, SIKAD should recommend a suitable working method instead of assuming Pomodoro is always best.
Focus Mode should remain embedded in the existing workspace rather than taking over the whole application.

## Candidate methods
Evaluate and implement a small, practical selection:
- **Pomodoro:** focused intervals separated by breaks.
- **Timeboxing:** work within a bounded period.
- **Task chunking:** break a large task into manageable steps.
- **Spaced study sessions:** distribute exam preparation over multiple sessions where appropriate.

Do not attempt to implement every productivity technique. Choose the methods that offer meaningful value and are feasible for the MVP.

## Recommendation context
Use relevant available information:
- Task type and complexity.
- Initial estimated duration and remaining work.
- Usable time before the next fixed commitment.
- Deadline and competing tasks.
- Student preferences.
- Whether the task should be split across multiple sessions.

Examples:
- A large assignment may benefit from task chunking and several scheduled work blocks.
- A manageable task that fits into a short available period may suit timeboxing.
- A longer session may suit Pomodoro if sufficient usable time exists for work and breaks.

These are examples, not rigid rules.
For every recommendation, show:
1. The suggested method.
2. A short explanation of why it fits.
3. The relevant duration or session structure.
4. An option to choose another method or start without one.

Do not claim that the system knows the universally best method for a student.

## Focus-session controls
The Focus Card should transition into an active session interface containing:
- Current task and objective.
- Selected or recommended working method.
- Timer when the selected method uses one.
- Start, Pause, Resume, and End Session controls.
- Session completion and interruption handling.

Make the controls functional. Preserve the dashboard and timeline.

## Replanning after a focus session
When the timer finishes or the student ends the session early, ask whether the task is complete.

If complete:
- Update task status.
- Record the completed session.
- Recalculate the affected plan.
- Update progress and next-action recommendations.

If partially complete or unfinished:
- Preserve the task.
- Let the student report remaining work when necessary.
- Feed the remaining work back into adaptive replanning.
- Explain any meaningful changes.

Never mark a task complete simply because the timer reached zero.
Do not silently reschedule fixed commitments.

# 12. CONNECT EVERYTHING THROUGH SHARED STATE

The product must not consist of disconnected demonstrations.
Setup, task capture, dictaphone, Ask SIKAD, task list, timeline, Focus Card, Focus Mode, weekly progress, and replanning must operate on the same application data.

The intended flow is:
**PERSONALIZE → CAPTURE → UNDERSTAND → CLARIFY → CONFIRM → PRIORITIZE → SCHEDULE → RECOMMEND A WORK METHOD → EXECUTE → TRACK PROGRESS → REPLAN → SHOW THE NEXT ACTION**

The system must consistently reflect accepted changes across all relevant views.
Use stable task identifiers and structured data models where practical.
Persistence is mandatory for this standalone prototype. Persist accepted task and schedule changes, task completion and partial-progress updates, focus-session state/history and completed-session counts, and the data used to calculate weekly progress. Use localStorage unless the existing project already has an established client-side persistence mechanism. Restore state on page load, keep every view synchronized after mutations, and handle missing, invalid, or outdated stored data gracefully. Do not persist transient secrets or raw audio. Provide a clearly available demo reset that restores the initial scenario so the presentation can be repeated reliably.

# 13. DESIGN DIRECTION

Preserve the existing Notion-inspired desktop workspace.
Use:
- Warm off-white surfaces.
- Charcoal text and restrained blue accents.
- Clear typography and spacing hierarchy.
- Minimal borders and shadows.
- Inline SVG icons instead of emoji as primary icons.
- Subtle, purposeful transitions.
- Responsive layouts.
- Accessible keyboard controls and reduced-motion support.

The dashboard must immediately answer "What should I work on next?"

Avoid:
- Generic AI dashboard styling.
- Giant gradient hero sections.
- Glassmorphism.
- Excessive rounded cards and pills.
- Giant circular progress meters.
- Full-screen generic chatbot layouts.
- Mascots, XP systems, competitive leaderboards, and distracting reward mechanics.
- Excessive animation that adds no functional value.

Do not redesign the interface from scratch merely because a different style is possible. Improve the existing implementation while preserving useful functionality.

# 14. IMPLEMENTATION AND VALIDATION WORKFLOW

Work incrementally.

## Phase A — Inspect
Inspect:
- `user_story.md` and `prompt_final.md` (or `prompt.md`) if they are actually available.
- The linked GitHub repository's real file tree and all existing project files, including frontend files, styles, assets, application logic, documentation, and tests that are actually present.
- Existing data structures and interactions.
- Current implementation of setup, dictaphone, Ask SIKAD, task scheduling, and replanning.

Report what works, what is simulated, what is missing, and what is broken.

## Phase B — Plan
Create a concise implementation checklist and identify dependencies, but keep the approved architecture and scope fixed unless inspection finds a concrete blocker.
Prioritize implementation in an order that makes the journey testable early; the final deliverable must still include every approved part of the connected journey.
Do not spend excessive time discussing architecture that the existing implementation already supports.

## Phase C — Implement the complete approved scope
Modify the actual existing project files. Preserve working features and avoid unnecessary rewrites.

Implement the full connected experience—not just the dashboard or a narrow core-only prototype—including:
- Setup and baseline personalization.
- Task capture and review, including dictaphone/voice capture with honest browser-support fallback.
- Ask SIKAD, connected to actual current application state.
- Priority assessment, realistic scheduling, protected fixed commitments, buffer handling, and infeasibility reporting.
- Focus Card and embedded Focus Mode with work-method recommendations and functional session controls.
- Completion/partial-progress handling, weekly progress tracking, persistence where appropriate, and repeatable demo reset.
- Confirmed-change previews and adaptive replanning that update all affected views consistently.

Implement in small, testable increments, but do not treat those increments as separate disconnected demos. Do not settle for static cards or buttons that only display alerts. If a major architectural change appears necessary, explain the concrete reason and trade-offs before undertaking it; the default remains the existing standalone HTML/CSS/JS project.

## Phase D — Test
Verify these scenarios:
1. A first-time student completes setup and receives a plan.
2. The student adds tasks with complete and incomplete information.
3. SIKAD asks for missing critical information instead of inventing deadlines.
4. The student asks questions about the current plan.
5. Voice input works where supported, with a clearly labeled fallback otherwise.
6. An unexpected work shift overlaps a flexible study session.
7. Fixed commitments remain protected.
8. The student starts, pauses, resumes, and ends a focus session.
9. The student completes a task or reports partial progress.
10. An unfinished task is returned to the adaptive replanning workflow.
11. The selected working method is reasonable for the available time.
12. Weekly progress is calculated from actual task/plan data and changes after task completion, partial progress, rescheduling, or plan changes according to the documented metric.
13. Completed focus sessions are counted only from actual session events; timer expiry alone does not complete a task or falsely increment the completed-session count.
14. Refreshing the page restores accepted tasks, schedule changes, completion/partial progress, focus-session history/counts, and weekly progress without inconsistency.
15. Resetting the demo restores the initial scenario and resets the demo’s persisted state.
16. Existing views and interactions still work.

Check for JavaScript errors, inconsistent state, invalid schedules, and broken controls. Run the tests and validation tools that already exist in the accessible project. Clearly report anything that could not be tested.

## Phase E — Report
Report honestly:
- Files changed.
- Features implemented.
- End-to-end workflows verified.
- Tests run and results.
- Behaviors simulated rather than AI-powered.
- Unsupported browser capabilities.
- Known limitations and unresolved decisions.

Never claim a test passed if it was not run.

# 15. SUCCESS CRITERION

The final prototype must implement and demonstrate this complete connected journey (not merely describe it):
A student configures their schedule, captures responsibilities through text or voice, receives a realistic prioritized plan, sees what to work on next, receives a context-aware recommendation for how to approach the task, starts a focus session, records progress, and receives a sensible updated plan when circumstances change.

The product should demonstrate **intelligent assistance without loss of user control**.

Start by inspecting the actual project files. Then implement the complete approved scope incrementally and validate the end-to-end journey.
Do not stop after the audit, a product proposal, a design mockup, or a core-only slice. Build the working prototype with Ask SIKAD, dictaphone/voice capture, Focus Mode, progress tracking, and adaptive replanning connected to the same application state.