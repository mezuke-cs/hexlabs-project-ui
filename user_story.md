# User Story: AI Adaptive Time-Management Engine

> **Document Purpose:** Internal product/UX reference. This document describes, in concrete detail, how a real student uses the application from first launch through daily use and through unexpected schedule changes. It is intended to be consumed by other LLMs and team members as the canonical source of truth for design, development, and prompt engineering decisions.
>
> **This document is NOT the final hackathon workbook answer.** It is the detailed product specification that informs all downstream work.

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [User Persona](#2-user-persona)
3. [User Goals](#3-user-goals)
4. [User Pain Points](#4-user-pain-points)
5. [Core Engine Flow](#5-core-engine-flow)
6. [First-Time User Journey](#6-first-time-user-journey)
7. [Baseline Personalization Flow](#7-baseline-personalization-flow)
8. [Task Capture Flow](#8-task-capture-flow)
9. [AI Understanding](#9-ai-understanding)
10. [Prioritization Logic](#10-prioritization-logic)
11. [Scheduling](#11-scheduling)
12. [What Should I Work On Next?](#12-what-should-i-work-on-next)
13. [Adaptive Replanning (Core Feature)](#13-adaptive-replanning-core-feature)
14. [Temporary vs Recurring Commitments](#14-temporary-vs-recurring-commitments)
15. [Normal Daily Use](#15-normal-daily-use)
16. [Interaction Model](#16-interaction-model)
17. [Structured Outputs](#17-structured-outputs)
18. [Error and Edge Cases](#18-error-and-edge-cases)
19. [Safety and Guardrails](#19-safety-and-guardrails)
20. [Complete End-to-End Example](#20-complete-end-to-end-example)
21. [What the Product Is NOT](#21-what-the-product-is-not)
22. [Core vs Optional Features](#22-core-vs-optional-features)
23. [Key UX Principles](#23-key-ux-principles)
24. [Consistency Check](#24-consistency-check)

---

## 1. Product Overview

### What It Is

An **AI adaptive time-management assistant** that helps students understand their responsibilities, fit them into their available time, prioritize what to do, and replan when circumstances change.

### The Problem It Solves

Students have a limited number of usable hours each day. Their schedules, deadlines, assignments, and other important information can be scattered across different apps and school platforms, including their LMS. They may know they have several things to accomplish, but they cannot easily see:

- What is due and when
- How much time tasks may require
- How much time they actually have available
- Whether everything realistically fits into that time
- What to do first
- Where to start

The problem becomes worse when something unexpectedly changes their schedule. A sudden meeting, new deadline, additional work shift, organization activity, missed task, or other commitment can make an existing plan unrealistic. The student then has to figure out what should move, what should remain, and what should be done next — often without help.

### The Core Differentiator

This product does not just create a static plan. Its most important capability is **adaptive replanning**: when circumstances change, the system reassesses available time, reprioritizes tasks, redistributes work, and gives the student a new clear next action — without the student having to manually rebuild the entire plan.

### How Might We (HMW)

> "How might we help students understand what they need to accomplish, see how much time they actually have, decide where to start, and adjust when their commitments change?"

---

## 2. User Persona

### Representative User: A College Student

**Name (for reference):** Alex

**Profile:**
- 3rd-year BSIT student at a state university
- Class schedule varies day to day (some days have Face-to-Face classes, other days are fully online)
- Commutes to campus on FTF days; commute time varies due to rush hour
- Active in one student organization
- Occasionally takes part-time work shifts on weekends
- Manages assignments, exams, group projects, and personal errands

**Important Note:** Not every student has a part-time job, a long commute, or organization commitments. These are examples of circumstances that *some* users may have. The system should accommodate varying levels of complexity in a student's life without requiring any of these to be present.

### What Makes This User Representative

Alex's situation captures the core challenge: **multiple competing commitments with limited usable time, spread across different sources of information, with schedules that can change unexpectedly.**

---

## 3. User Goals

The student wants to:

1. **See everything in one place.** Know what is due, what commitments exist, and what tasks are pending — without checking 5 different apps.
2. **Understand their available time.** Know how much usable time they actually have after classes, commutes, work, and other fixed commitments.
3. **Know what to do next.** Get a clear, actionable recommendation rather than staring at a long unstructured list.
4. **Know if everything fits.** Understand whether their current workload is realistically achievable within their available time.
5. **Adjust without rebuilding.** The system automatically recalculates the plan when circumstances change, while keeping the student in control of the resulting recommendations. The student does not have to manually figure out the ripple effects, but they retain the power to review, override, reject, or modify the AI's suggestions.
6. **Stay in control.** The system should not silently make consequential changes to protected/fixed commitments. AI recommendations are proposals, not absolute commands.

---

## 4. User Pain Points

| Pain Point | Description |
|---|---|
| **Scattered information** | Deadlines live in the LMS, class schedule is a separate document, work shifts are in a messaging app, org activities are in a group chat. The student has no unified view. |
| **Invisible available time** | The student knows they are "busy" but cannot quantify how many usable hours they actually have on a given day. |
| **Decision paralysis** | When 4 assignments compete for the same evening, the student wastes time deciding what to start instead of starting. |
| **Static plans break** | A carefully written to-do list becomes useless the moment the student gets called into an extra work shift or learns about a rescheduled exam. |
| **Manual replanning burden** | After a change, the student has to mentally re-evaluate every remaining task, deadline, and time block to figure out what still works. This is exhausting and error-prone. |
| **Duration blindness** | The student knows they "have homework" but cannot estimate whether it will take 30 minutes or 3 hours, making planning nearly impossible. |
| **Underestimating commitments** | Commute time, transition time between tasks, and energy levels are rarely factored into plans. |

---

## 5. Core Engine Flow

The adaptive time-management engine follows this pipeline:

```
PERSONALIZE → CAPTURE → UNDERSTAND → PRIORITIZE → BREAK DOWN → SCHEDULE → NEXT ACTION → REPLAN
```

Each stage is described in detail in the sections below. The critical point is that **REPLAN feeds back into the pipeline**: when new information arrives, the engine re-executes the relevant stages (UNDERSTAND → PRIORITIZE → SCHEDULE → NEXT ACTION) to produce an updated plan.

```
┌──────────────────────────────────────────────────────────┐
│                    BASELINE                              │
│  Classes · Commute · Work · Orgs · Available Hours       │
└──────────────┬───────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────┐
│                    CAPTURE                               │
│  Voice / Text / Manual Input                             │
│  "I have a database proposal due Friday, ~3 hours"       │
└──────────────┬───────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────┐
│                   UNDERSTAND                             │
│  Extract: task, deadline, duration, type, dependencies   │
│  Clarify if information is missing                       │
└──────────────┬───────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────┐
│                   PRIORITIZE                             │
│  Deadline urgency · Duration vs available time ·         │
│  Task importance · Competing tasks                       │
└──────────────┬───────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────┐
│                  BREAK DOWN                              │
│  Large tasks → manageable subtasks                       │
│  "Database Proposal" → Methodology + Results + Review    │
└──────────────┬───────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────┐
│                   SCHEDULE                               │
│  Fit tasks into available time blocks around             │
│  fixed commitments. Answer: "Does it all fit?"           │
└──────────────┬───────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────┐
│                  NEXT ACTION                             │
│  "Start Database Proposal — Methodology section          │
│   Today, 10:30 AM – 12:00 PM (1.5 hrs)"                 │
└──────────────┬───────────────────────────────────────────┘
               │
               │  ← NEW INFORMATION (e.g., extra work shift)
               ▼
┌──────────────────────────────────────────────────────────┐
│                    REPLAN                                 │
│  Detect conflict · Reassess available time ·             │
│  Reprioritize · Redistribute tasks · New next action     │
└──────────────────────────────────────────────────────────┘
```

---

## 6. First-Time User Journey

The first launch should **not** immediately dump the student into a giant task list or an open-ended chat. Instead, it guides the student through establishing their baseline, step by step.

### Step 1 — Welcome

**What the student sees:**

A clean welcome screen with the app's name/logo and a simple, direct explanation:

> "This app helps you figure out what you can realistically accomplish with the time you actually have."

**Key design rule:** Avoid generic AI-assistant language like "I'm your AI helper, ask me anything!" The messaging should communicate *time management*, not *general AI chat*.

The student is asked:

> "What should we call you?"

They type their preferred name (e.g., "Alex") and tap "Get Started."

### Step 2 — Upload/Enter Class Schedule

**What the student sees:**

A screen titled "Set Your Baseline" with the instruction:

> "Upload your COR or a photo of your class schedule. The AI will extract your weekly class blocks."

**Intended Product Experience:**
The student can upload a PDF or image of their Certificate of Registration (COR) or class schedule, and the AI extracts the data automatically. 

**Hackathon MVP Implementation:**
While image/document extraction is the intended experience, it is not a required dependency for proving the core adaptive planning engine. Depending on platform capabilities, the prototype may use:
- A simplified/mock schedule that is pre-loaded
- Manual class entry via a simple form
- Or actual document/image extraction if reliably supported by the tools

The critical requirement is simply that the system establishes the student's baseline schedule, regardless of the input method used for the demo.

**What the system does:**

The system extracts structured class information: day, time, subject, mode (FTF vs Online), and room/location if available.

**What the student sees next:**

The system shows what it extracted:

> **AI Analysis:** "I see you have Face-to-Face classes on Monday and Tuesday, and Online classes on Wednesday through Friday. You also have large gaps, like Monday 10 AM – 2 PM. Let's figure out how to use those."

A preview of the extracted schedule is shown in a simple table format. The student can correct any errors before proceeding.

### Step 3 — Lifestyle Questionnaire

**What the student sees:**

A short structured questionnaire (NOT an open-ended chat). The questions are contextual — they reference information already extracted from the class schedule:

1. **"What time does your day usually start?"**
   Options: 5:00 AM / 6:00 AM / 7:00 AM / 8:00 AM (or custom input)

2. **"I see you have FTF classes on Monday & Tuesday. How long is your commute to campus during rush hour?"**
   Options: 30 min / 1 hour / 1.5 hours (or custom input)

3. **"Are you a working student?"**
   Options: Yes, part-time / No

4. **"Are you in a school organization?"**
   Options: Yes / No

If the student answers "Yes" to work or org, the system may ask one follow-up (e.g., "What days/times do you usually work?" or "How often does your org meet?").

**Key design rule:** This is a form/wizard, NOT a chatbot conversation. A mascot/illustration can appear beside the questions for personality, but the interaction is structured input, not open-ended chat.

### Step 4 — Connect Platforms (Optional)

**What the student sees:**

A screen titled "Sync Your World" showing integration options:

- 🗓️ Google Calendar — "Sync events & deadlines"
- 🎓 Canvas LMS — "Auto-import assignment dues"
- 💬 MS Teams — "Sync class channels & posts"
- 📚 Google Classroom — "Pull classwork & announcements"

Each has a "Connect" button. The student can connect any, all, or none.

A note at the bottom: *"You can always connect more platforms later in Settings."*

**For hackathon:** These buttons simulate a connection (mock "Connected" status). The real integration is an optional feature.

### Step 5 — Initial Brain Dump

**What the student sees:**

A screen titled "Brain Dump 🧠" with the instruction:

> "What is on your plate right now? Don't worry about formatting — just dump it."

A large microphone button is centered on screen with the label "Tap to speak." Below it, a divider reads "or type it out" with a text area underneath.

**Example voice/text input:**

> "I have a database proposal due Friday, it'll take about 3 hours. Also need to buy groceries and study for my Math test on Wednesday."

**What the system does:**

The AI extracts structured task data:

| Task | Deadline | Est. Duration | Priority |
|---|---|---|---|
| Database Proposal | Friday | 3 hours | High |
| Buy Groceries | No deadline | 1 hour (AI estimate) | Low |
| Study for Math Test | Wednesday | 2 hours (AI estimate) | Medium |

The system shows these extracted tasks to the student for review. Where the AI estimated a duration (because the student didn't specify one), it is clearly labeled as "AI estimate" so the student can adjust it.

### Step 6 — Generate First Plan

The student taps "Generate My Schedule ✨."

A loading screen shows progress:
1. ✓ Analyzing your class schedule...
2. ✓ Calculating commute buffers...
3. ✓ Finding your best time gaps...
4. ✓ Prioritizing tasks by deadline & difficulty...
5. Building your plan...

After processing, the student lands on the **Dashboard** (see Section 15).

---

## 7. Baseline Personalization Flow

### What Constitutes the Baseline

The baseline is the set of **regular, recurring commitments** that define the student's normal weekly structure. These include:

| Category | Examples |
|---|---|
| **Classes** | IT 302 Mon 7–10 AM (FTF), ADET Thu 7–10 AM (Online) |
| **Commute** | 1 hour rush-hour commute on FTF days (Mon, Tue) |
| **Work** | Part-time shifts: Sat 9 AM – 2 PM |
| **Organization** | Org meeting every Thursday 5–7 PM |
| **Personal** | Prefer not to schedule tasks before 6 AM or after 10 PM |

### How the Baseline Is Used

The system uses the baseline to calculate **available time blocks** — the windows where the student is free to work on tasks. Example:

**Monday:**
- 6:00 AM – 6:30 AM: Morning routine (buffer)
- 6:30 AM – 7:00 AM: Commute to campus
- 7:00 AM – 10:00 AM: IT 302 (FTF) ← Fixed
- **10:00 AM – 1:00 PM: AVAILABLE (3 hours)** ← Usable gap
- 1:00 PM – 2:00 PM: Commute buffer / lunch
- 2:00 PM – 5:00 PM: IT 306D (FTF) ← Fixed
- 5:00 PM – 6:00 PM: Commute home
- **6:00 PM – 10:00 PM: AVAILABLE (4 hours)** ← Usable block

### Editing the Baseline

The student can always go to Settings to modify their baseline. Changes to the baseline propagate automatically: if the student adds a new recurring commitment, the system recalculates available time for future planning.

---

## 8. Task Capture Flow

### Methods of Input

The student can add new tasks, deadlines, or temporary commitments through three methods:

#### 1. Voice Input ("Brain Dump")

The student taps a microphone button and speaks naturally:

> "I just found out I have a group presentation for ENTREP next Tuesday. I need to prepare slides and it'll probably take two hours."

The system converts speech to text and extracts structured data.

#### 2. Text Input

The student types into a text field:

> "Math homework due tomorrow, about 45 minutes"

Same extraction process as voice.

#### 3. Manual/Structured Input

For students who prefer precision, a form allows direct entry:
- Task name: ___
- Deadline (date/time): ___
- Estimated duration: ___
- Priority (optional): ___
- Notes (optional): ___

### Where Capture Happens

- **During onboarding:** The initial Brain Dump (Step 5)
- **From the dashboard:** A prominent "Brain Dump" button (floating action button in the bottom navigation)
- **From the assistant interface:** The student can type/speak a new task in the chat-like assistant view, which is accessible but not the primary interface

### What Happens After Capture

1. The AI extracts structured data from the input
2. If information is missing, the system uses interactive clarification (see Section 16)
3. The extracted task is shown to the student for confirmation
4. The task is integrated into the existing plan
5. The plan is recalculated if necessary
6. The dashboard updates

---

## 9. AI Understanding

### What the AI Extracts

When the student provides input, the AI identifies:

| Field | Example | Required? |
|---|---|---|
| **Task name** | "Database Proposal" | Yes |
| **Deadline** | "Friday" → resolved to actual date | Preferred |
| **Estimated duration** | "about 3 hours" | Preferred |
| **Type** | Assignment / Exam / Errand / Meeting | Inferred |
| **Recurring vs Temporary** | One-time unless stated otherwise | Inferred |
| **Subtasks / Components** | "methodology and results sections" | If mentioned |
| **Dependencies** | "after I get the data from Sarah" | If mentioned |
| **Context** | Subject/class association | If mentioned |

### Duration Estimation

When the student does not specify a duration, the system provides an **initial AI estimate** as a starting point, based on the type of task:

| Task Type | Initial AI Estimate |
|---|---|
| Short homework / worksheet | 30–45 minutes |
| Essay / paper section | 1–2 hours |
| Full proposal / report | 2–4 hours |
| Exam study session | 1.5–2 hours |
| Errand (groceries, etc.) | 45 min – 1 hour |
| Group meeting | 1–1.5 hours |

**Critical rules for estimates:**
- These estimates are inherently uncertain starting points, not objective or guaranteed facts.
- The prototype may use simple heuristics or AI-generated guesses to create them; do not imply the system has a sophisticated, scientifically validated duration-prediction model.
- AI-estimated durations must always be **clearly labeled** as estimates in the UI.
- The student can always edit or override them.
- The system should never treat an estimate as a guaranteed fact, and it must never invent critical information like deadlines.

### What the AI Must NOT Do

- **Do not invent deadlines.** If the student says "I have a math test" without a date, the system must ask when the test is. It should not guess "probably next week."
- **Do not invent task details.** If the student says "I have homework," the system should not assume it's a 500-word essay.
- **Do not assume recurring.** Unless the student explicitly says "every week" or "recurring," treat new information as temporary.

---

## 10. Prioritization Logic

### Factors the Engine Considers

The system does not simply sort by due date. It considers multiple factors:

| Factor | Weight | Reasoning |
|---|---|---|
| **Deadline proximity** | High | Tasks due sooner need attention sooner |
| **Estimated duration vs remaining time** | High | A 5-hour task due tomorrow is more urgent than a 30-minute task due tomorrow |
| **Available time blocks** | High | Can this task realistically fit into today's gaps? |
| **Task dependencies** | Medium | If Task B depends on Task A, Task A must be scheduled first |
| **Student-set priority** | Medium | If the student manually marks something as high priority, respect it |
| **Cascading impact** | Medium | Delaying this task — does it cause a chain reaction of missed deadlines? |
| **Task type** | Low | Exams may warrant more buffer time than errands |

### Prioritization Is Not Absolute

The AI recommends priorities. The student can always override them. If the student says "I want to do groceries first even though the proposal is more urgent," the system respects that choice and adjusts accordingly.

### Transparency: "Why This?"

Every priority recommendation includes a brief explanation:

> **💡 Why this?** "Your Database Proposal is due Friday and requires 3 hours. You have a 3-hour gap right now before your 2 PM class. Starting now means you can finish it in one sitting instead of splitting it across two days."

This transparency is critical for student trust and for demonstrating AI reasoning to hackathon judges.

---

## 11. Scheduling

### How the System Schedules Tasks

The engine takes the prioritized task list and fits tasks into available time blocks from the baseline. The process:

1. **Identify all available blocks** for the relevant time period (today, this week)
2. **Sort tasks by priority** (using the logic from Section 10)
3. **Assign tasks to blocks**, respecting:
   - Task duration ≤ block duration (or split the task across blocks)
   - Buffer time between tasks (minimum 15-minute transition)
   - Commute time on FTF days
   - Student's preferred hours (no scheduling at 3 AM)
4. **Detect conflicts** where total required time exceeds total available time
5. **Communicate the result** as a structured plan

### What the Schedule Answers

The schedule should help the student answer:

- **"Can all of this fit?"** — Yes, with this arrangement / No, you are 2 hours short this week
- **"When should I do each thing?"** — Specific time blocks mapped to tasks
- **"What is at risk?"** — Tasks that may not fit if something else runs over
- **"What should I do right now?"** — The single most important next action

### Schedule Is a Recommendation, Not a Command

The student sees the proposed schedule and can:
- Move tasks to different blocks
- Change durations
- Remove tasks
- Add buffer/rest time
- Override AI priorities

---

## 12. What Should I Work On Next?

### The Focus Card

The single most important UI element in the app. It appears at the top of the dashboard and answers the question every student asks: **"What should I do right now?"**

#### Structure of the Focus Card

```
┌─────────────────────────────────────────┐
│  ⚡ WHAT TO DO NEXT                     │
│                                         │
│  Start Database Proposal                │
│  — Methodology Section                  │
│                                         │
│  🕐 10:30 AM – 12:00 PM (1.5 hrs)      │
│                                         │
│  💡 Why this? You have a 3-hour gap     │
│  before your 2 PM FTF class. This       │
│  proposal is due Friday and takes 3     │
│  hours — knocking out half now avoids   │
│  a Thursday crunch.                     │
│                                         │
│  [ ▶ Start Task ]  [ Snooze ]           │
└─────────────────────────────────────────┘
```

#### User Actions on the Focus Card

| Action | What Happens |
|---|---|
| **Start Task** | Timer begins (optional). Task status changes to "In Progress." |
| **Mark Done** | Task is completed. Next task is promoted to the Focus Card. Plan adjusts. |
| **Snooze / Didn't Finish** | Task is rescheduled to the next available block. Plan recalculates. The student does NOT need to type or explain anything — one tap triggers replanning. |

### Why This Matters

Without the Focus Card, the student opens the app, sees a list of 8 tasks, and spends 10 minutes deciding what to do. The Focus Card eliminates decision paralysis by giving a single, explained, actionable recommendation.

---

## 13. Adaptive Replanning (Core Feature)

> **This is the ONE must-have feature that distinguishes this product from a simple to-do list or calendar.**

### What Triggers Replanning

| Trigger | Example |
|---|---|
| **New temporary commitment** | "My boss asked me to cover a shift from 6–10 PM tonight" |
| **Missed or incomplete task** | Student taps "Snooze / Didn't Finish" on the Focus Card |
| **New task added** | "I just found out I have a group presentation next Tuesday" |
| **Changed deadline** | "The database proposal deadline moved to Thursday" |
| **Cancelled commitment** | "My org meeting tonight got cancelled" (frees up time) |
| **Student override** | Student manually moves a task, system adjusts everything else |

### What Replanning Does

When triggered, the engine:

1. **Detects the change** — Identifies what is new or different
2. **Identifies conflicts** — Determines which existing tasks are affected
3. **Reassesses available time** — Recalculates usable blocks with the new constraint
4. **Reprioritizes** — Re-evaluates which tasks are most urgent given the new reality
5. **Redistributes tasks** — Moves affected tasks to new available blocks
6. **Preserves critical deadlines** — Does not silently push a task past its deadline
7. **Communicates changes** — Shows the student exactly what changed and why
8. **Updates the Focus Card** — Provides a new "What should I work on next?"

### Protected Constraints Rule

> **Fixed commitments are protected constraints.** The AI can replan flexible tasks around them, but it does not silently modify, shorten, or move fixed commitments. If two fixed commitments conflict, the system surfaces the conflict and asks the student to resolve it.

**What counts as a fixed commitment:**
- Classes (from the baseline schedule)
- Confirmed work shifts (baseline or explicitly added)
- Exams
- Other events the student has explicitly marked as fixed

**What counts as a flexible task:**
- Assignments and study sessions scheduled by the engine
- Errands
- Any task the engine placed into an available block

**Behavior during replanning:**
- The engine may freely move, split, or reschedule **flexible tasks** to accommodate changes.
- The engine must **never** silently shorten, move, or overwrite a **fixed commitment**.
- If a new commitment conflicts with an existing fixed commitment, the system must **surface the conflict** and ask the student to resolve it — it does not assume the student has permission to skip a class or leave early.
- The student can explicitly change a fixed commitment through the UI (e.g., marking a class as cancelled), but the AI does not invent that permission on the student's behalf.

### Replanning Example

**Before:**
```
Monday Plan:
  10:00 AM – 12:00 PM  →  Database Proposal (Part 1)
   1:00 PM –  2:00 PM  →  Commute buffer
   2:00 PM –  5:00 PM  →  IT 306D (FTF class)
   5:30 PM –  6:30 PM  →  Buy Groceries
   7:00 PM –  9:00 PM  →  Database Proposal (Part 2)
```

**Student says:** "My boss just asked me to cover a shift from 5 PM to 9 PM tonight."

**After replanning:**
```
Monday Plan (Updated):
  10:00 AM – 12:00 PM  →  Database Proposal (Part 1)  [unchanged]
   1:00 PM –  2:00 PM  →  Commute buffer              [unchanged]
   2:00 PM –  5:00 PM  →  IT 306D (FTF class)         [unchanged]
   5:00 PM –  9:00 PM  →  Work Shift                   [NEW – temporary]
   9:30 PM – 10:00 PM  →  (too short for proposal)

Tuesday Plan (Updated):
   7:00 AM –  9:00 AM  →  SIA (Online class)
   9:30 AM – 10:30 AM  →  Buy Groceries               [MOVED from Mon]
  11:00 AM –  1:00 PM  →  Database Proposal (Part 2)   [MOVED from Mon]
```

**System communicates:**

> "Got it. I've blocked 5–9 PM for your work shift.
>
> 📋 What I adjusted:
> • **Buy Groceries** → Moved to Tuesday 9:30 AM
> • **Database Proposal (Part 2)** → Moved to Tuesday 11 AM – 1 PM
>
> Your proposal is still on track for Friday. Dashboard updated."

### How Replanning Is Triggered in the UI

There are two paths:

1. **One-tap trigger (Snooze button):** For internal failures (procrastination, ran out of time). The student taps "Snooze" on the Focus Card. No typing required. The engine recalculates silently and updates the dashboard.

2. **Voice/text trigger (Assistant interface):** For external changes (new shift, new assignment, cancelled meeting). The student opens the assistant interface and speaks/types the change. The engine processes it and replans.

---

## 14. Temporary vs Recurring Commitments

### The Distinction

This distinction is fundamental to correct replanning behavior.

| Type | Definition | Examples | Behavior |
|---|---|---|---|
| **Recurring (Baseline)** | Regular commitments that repeat weekly or on a known schedule | Classes, weekly org meetings, regular work shifts, daily commute | Part of the permanent baseline. Affects all future planning. |
| **Temporary** | One-time or short-term changes that do not alter the baseline | Extra work shift, sudden meeting, new assignment, rescheduled event | Affects only the specific date(s). Does not overwrite baseline. |

### Why This Matters

If the student says "I have to work tonight from 6–10," the system should:
- ✅ Block out 6–10 PM **tonight only**
- ✅ Replan tonight's tasks
- ❌ NOT add a recurring 6–10 PM work shift to every future day

If the student says "I got a new part-time job, I'll be working every Saturday 9 AM – 2 PM," the system should:
- ✅ Add this to the baseline as a recurring commitment
- ✅ Recalculate available time for all future Saturdays

### Default Behavior

**New information is treated as temporary unless the student indicates it is recurring.** The system may ask:

> "Should I add this as a one-time event, or does this happen regularly?"

---

## 15. Normal Daily Use

### What the Student Sees When They Open the App

The dashboard is the primary view. It is **not** a chat interface. It communicates the plan through structured visual elements.

#### Dashboard Layout

**Top Section:**
- Date and greeting: "Monday, October 12 — Hey, Alex 👋"

**Focus Card (most prominent element):**
- The single most important next action (see Section 12)

**Today's Timeline:**
- A vertical timeline showing the day's schedule:
  - Completed items (grayed out, checked)
  - Current/active item (highlighted)
  - Upcoming items (normal)
  - Fixed commitments (classes, work) distinguished from scheduled tasks

**Bottom Navigation:**
- Home (dashboard)
- Overview (weekly/monthly view — optional feature)
- 🧠 Brain Dump button (floating action button — opens task capture)
- Tasks (full task list)
- Profile/Settings

### Daily Flow

1. **Morning:** Student opens app on the bus. Sees Focus Card: "Study for Math Test — Review Chapter 4 (45 min). You have a 1-hour gap before your next class."
2. **Mid-day:** Professor mentions a new assignment. Student taps 🧠, speaks: "New report for ADET due next Monday, probably 4 hours." System adds it, replans if needed, dashboard updates.
3. **After class:** Student checks app. Focus Card has updated to next priority. Timeline shows remaining tasks.
4. **Evening:** Student finishes a task, taps "Mark Done." Next task promotes.
5. **Before bed:** Student opens app, sees tomorrow's preview. Everything is mapped out.

### The App Does NOT Require

- Starting a conversation to see the plan
- Asking "what should I do?" in a chat
- Navigating through menus to find the next task
- Manually reorganizing tasks after every change

---

## 16. Interaction Model

### Three Distinct Interaction Types

#### 1. Structured Interaction (Primary)

The main way the student interacts with the app. No typing or speaking required.

**Used for:**
- Viewing the dashboard and Focus Card
- Reviewing the timeline/schedule
- Seeing task priorities and deadlines
- Tapping "Start Task," "Mark Done," or "Snooze"
- Reviewing available time blocks
- Confirming or adjusting AI recommendations
- Navigating settings, task list, weekly view

**UX:** Visual cards, timelines, buttons, toggles, forms.

#### 2. Natural-Language Input (Secondary)

Quick capture of new information without filling out forms.

**Used for:**
- Adding new tasks: "Database proposal due Friday, about 3 hours"
- Adding temporary commitments: "I have to work tonight 6–10"
- Reporting changes: "My org meeting got cancelled"
- Reporting completion/failure: "I didn't finish the proposal today"

**UX:** Microphone button ("Brain Dump") or text input field. Available from the dashboard FAB and from the assistant interface.

#### 3. Interactive Clarification (Exception Only)

The system asks a focused question when critical information is missing.

**Used for:**
- Missing deadlines: "When is the math test?"
- Ambiguous dates: "By 'this Friday,' do you mean October 16?"
- Missing duration: "How long do you think the group presentation will take?"
- Ambiguous scope: "Is this a new task or part of the existing Database Proposal?"

**UX:** A brief, focused prompt — NOT an open-ended conversation. The system asks one specific question, the student answers, and the system proceeds.

**What this is NOT:**
- General conversation ("How are you feeling about your workload?")
- Open-ended advice ("Tell me more about your study habits")
- Therapeutic dialogue ("It sounds like you're stressed")

---

## 17. Structured Outputs

### What the System Produces

The system communicates through structured visual elements, not paragraphs of conversational text.

#### Task Card
```
📝 Database Proposal
   Due: Friday, Oct 16
   Est: 3 hours (1.5 hrs remaining)
   Priority: HIGH
   Status: In Progress
   Subtasks: ✅ Review requirements
             🔲 Draft methodology
             🔲 Draft results
```

#### Schedule Block
```
🕐 10:30 AM – 12:00 PM
   📝 Database Proposal — Methodology
   Duration: 1.5 hours
   Location: Campus (between classes)
```

#### Conflict Alert
```
⚠️ Schedule Conflict Detected
   You have 5 hours of tasks but only 3 hours
   of available time tomorrow.

   Options:
   • Move "Buy Groceries" to Wednesday (+2 hrs freed)
   • Shorten "Math Study" from 2 hrs to 1 hr
   • Accept the overload (not recommended)

   [ Review Options ]
```

#### Replanning Summary
```
📋 Plan Updated
   Trigger: Added work shift (Mon 5–9 PM)

   Changes:
   • Buy Groceries → Moved to Tue 9:30 AM
   • DB Proposal (Part 2) → Moved to Tue 11 AM

   ⚡ New Next Action: Database Proposal — Methodology
      Today, 10:30 AM – 12:00 PM
```

#### "Why This?" Explanation
```
💡 Why this task?
   This takes 3 hours and is due Friday. You have a
   3-hour gap right now. Completing the methodology
   section today means you only need 1.5 hours
   tomorrow for the results — which fits perfectly
   into your Tuesday morning gap.
```

---

## 18. Error and Edge Cases

### Missing Deadline

**Input:** "I have a math test."

**Behavior:** System asks: "When is the math test? I need the date to schedule study time."

**Rule:** Do NOT guess or invent a deadline. Do NOT schedule study time for "sometime this week" without confirmation.

### Missing Duration

**Input:** "I need to write a report for ADET."

**Behavior:** System auto-estimates based on task type (e.g., "report" → 2–3 hours) and labels it clearly: "I estimated this will take about 2.5 hours. Does that sound right, or would you like to adjust?"

**Rule:** Always label AI estimates. Let the student correct them.

### Ambiguous Date

**Input:** "The presentation is on Friday." (Said on a Thursday)

**Behavior:** System asks: "Do you mean tomorrow (Friday, Oct 9) or next Friday (Oct 16)?"

**Rule:** When the date is genuinely ambiguous and the consequence of guessing wrong is a missed deadline, ask.

### Two Commitments Conflict

**Input:** Student has org meeting Thursday 5–7 PM. Then says: "I have a group study session Thursday at 6 PM."

**Behavior:** System alerts:

> "⚠️ Conflict: You already have your org meeting from 5–7 PM on Thursday. The group study session overlaps at 6 PM. Which one takes priority, or would you like to reschedule one of them?"

**Rule:** Do NOT silently overwrite an existing commitment. Surface the conflict and let the student decide.

### Not Enough Time

**Input:** Student has 3 hours available this week but 8 hours of tasks due.

**Behavior:** System communicates honestly:

> "⚠️ Time Shortage: You have approximately 3 usable hours remaining this week, but your pending tasks require about 8 hours. Here's what I recommend prioritizing:
> 1. Database Proposal (due Friday, HIGH) — 3 hours
> 2. Math study (due Wednesday, MEDIUM) — 2 hours ← at risk
> 3. Buy groceries (no deadline, LOW) — 1 hour ← recommend deferring
>
> You may need to adjust deadlines, reduce scope, or find additional time."

**Rule:** Do NOT pretend everything fits when it does not. Be honest and help the student triage.

### Contradictory Information

**Input:** "My math test is on Wednesday." (Previously said Thursday)

**Behavior:** System asks: "You previously said the math test was on Thursday. Has the date changed to Wednesday, or did I misunderstand?"

**Rule:** Surface contradictions rather than silently overwriting.

### Student Says They Missed a Task

**Input:** "I wasn't able to finish the database proposal today."

**Behavior:** System treats the remaining work as unfinished, finds the next available time block, reschedules it, and updates the Focus Card. No judgment, no lecture.

### Sudden New Commitment

**Input:** "My boss just called, I need to work from 5–9 tonight."

**Behavior:** Full replanning cycle (Section 13). Treat as temporary unless stated otherwise.

### AI Cannot Confidently Interpret Input

**Input:** "Ugh, everything's a mess, just fix it."

**Behavior:** System responds with a clarifying question:

> "I want to help! Can you tell me specifically what changed? For example: Did you miss a task? Get a new assignment? Have a schedule change?"

**Rule:** Do NOT invent an interpretation. Ask for specifics.

---

## 19. Safety and Guardrails

### The System Must NOT

| Prohibited Action | Correct Alternative |
|---|---|
| **Complete graded academic work** (write essays, solve problems, generate content for submission) | Break the assignment into schedulable steps. "I can't write your essay, but I can help you plan 3 work sessions: outline, draft, and revision." |
| **Encourage cheating** | Refuse and redirect to legitimate planning |
| **Diagnose stress, burnout, or mental-health conditions** | Stay focused on objective time constraints. "You have 8 hours of tasks and 3 hours available" — not "It sounds like you're experiencing burnout." |
| **Guarantee grades or outcomes** | "This schedule gives you 2 hours of study time" — not "This will help you ace the test." |
| **Remove user control** | Always allow the student to override, adjust, or reject recommendations |
| **Silently invent critical information** | Ask when unsure |

### Example: Student Asks for Graded Work

**Input:** "Can you just write my 500-word history essay? I'm so stressed."

**System response:**

> "I can't write your essay — that's your work to own! But I can help you get it done without the overwhelm.
>
> Here's how I'd break it down:
> 📝 Step 1: Write the outline (20 min)
> 📝 Step 2: Draft the body paragraphs (45 min)
> 📝 Step 3: Write intro + conclusion (30 min)
> 📝 Step 4: Review and polish (15 min)
>
> Want me to schedule these into your available time?"

### Example: Student Vents About Stress

**Input:** "I'm so stressed, I feel like I can't handle anything."

**System response:**

> "Let's take a look at your schedule and see what we can do. You currently have 3 tasks due this week. Want me to reprioritize so you can focus on just the most urgent one first?"

**Rule:** Acknowledge without diagnosing. Redirect to actionable time-management help.

---

## 20. Complete End-to-End Example

### Day 0: First Launch (Sunday Evening)

**Step 1 — Welcome:**
Alex opens the app for the first time. Enters name: "Alex."

**Step 2 — Upload Schedule:**
Alex uploads a photo of the BSIT 3B class schedule. The AI extracts:
- Monday: IT 302 (7–10 AM, FTF), IT 306D (2–5 PM, FTF)
- Tuesday: SIA (7–9 AM, Online), ADET (9–11 AM, Online), SPEC1 (2–5 PM, FTF), SPEC2 (5–8 PM, FTF)
- Wednesday: SPEC1 (8–10 AM, Online), ENTREP (2–5 PM, Online)
- Thursday: ADET (7–10 AM, Online), SAD (12–2 PM, Online), SPEC3 (4–6 PM, Online)
- Friday: SAD (7–10 AM, Online), SPEC2 (11 AM – 1 PM, Online)

Alex confirms the extraction is correct.

**Step 3 — Questionnaire:**
- Day starts: 6:00 AM
- Commute (rush hour, FTF days): 1 hour
- Working student: Yes, part-time (Saturdays 9 AM – 2 PM)
- School org: No

**Step 4 — Sync:**
Alex connects Google Calendar. (Mock connection for hackathon.)

**Step 5 — Brain Dump:**
Alex speaks:

> "I have a database proposal for IT 306D due Friday. I need to do the methodology and results sections, probably 3 hours total. I also have a math quiz for SIA on Wednesday, should study about 2 hours. And I need to buy groceries sometime this week."

**AI Extracts:**

| Task | Deadline | Duration | Priority |
|---|---|---|---|
| Database Proposal (Methodology + Results) | Friday | 3 hours | High |
| Study for Math Quiz (SIA) | Wednesday | 2 hours | Medium |
| Buy Groceries | No deadline | 1 hour (AI est.) | Low |

Alex confirms.

**Step 6 — Generate Plan:**

The system calculates available blocks and generates:

**Monday:**
- 6:00 AM: Wake up / morning routine
- 6:30 AM: Commute to campus
- 7:00–10:00 AM: IT 302 (FTF)
- **10:30 AM – 12:00 PM: Database Proposal — Methodology (1.5 hrs)**
- 12:00–1:00 PM: Lunch / buffer
- 1:00–2:00 PM: Commute buffer
- 2:00–5:00 PM: IT 306D (FTF)
- 5:00–6:00 PM: Commute home
- **6:30–8:30 PM: Study for Math Quiz (2 hrs)**

**Tuesday:**
- 7:00–9:00 AM: SIA (Online)
- **9:30–10:30 AM: Buy Groceries (1 hr)**
- 11:00 AM–1:00 PM: Buffer / lunch
- 2:00–5:00 PM: SPEC1 (FTF)
- 5:00–8:00 PM: SPEC2 (FTF)
- **8:30–10:00 PM: Database Proposal — Results (1.5 hrs)**

**Focus Card shows:**

> ⚡ **WHAT TO DO NEXT**
> Database Proposal — Methodology Section
> 🕐 Monday, 10:30 AM – 12:00 PM (1.5 hrs)
> 💡 Why? You have a 3-hour gap before your 2 PM class. Starting the methodology now means you only need 1.5 hrs for the results section on Tuesday evening.

---

### Day 1: Monday — Normal Use

**Morning:** Alex commutes to campus. Opens the app on the bus. Sees the Focus Card: "Database Proposal — Methodology, 10:30 AM."

**10:30 AM:** Class ends. Alex taps "▶ Start Task." Works on the methodology section.

**12:00 PM:** Alex taps "✓ Mark Done." Focus Card updates:

> ⚡ **WHAT TO DO NEXT**
> Study for Math Quiz — Review Chapters 3 & 4
> 🕐 Tonight, 6:30 PM – 8:30 PM (2 hrs)
> 💡 Why? Your math quiz is Wednesday morning. This is your only available study block before then.

**5:00 PM:** Alex leaves campus, commutes home.

**6:30 PM:** Alex studies for the math quiz. Finishes at 8:30 PM. Marks done.

---

### Day 1: Monday — The Unexpected Change

**4:45 PM (while still in IT 306D):** Alex gets a text from the manager: "Can you cover a shift tonight from 6:30 PM to 10:30 PM?"

Alex opens the app, taps the 🧠 Brain Dump button, and types:

> "I have to work tonight from 6:30 PM to 10:30 PM"

**The system detects:**
- New temporary commitment: Monday 6:30–10:30 PM
- Conflict: Study for Math Quiz was scheduled for 6:30–8:30 PM (flexible task) — directly overlaps with the work shift
- No conflict with any fixed class (IT 306D ended at 5 PM)

**System responds (replanning summary):**

> 📋 **Plan Updated**
> Trigger: Added work shift (Mon 6:30–10:30 PM)
>
> Changes:
> • **Study for Math Quiz (2 hrs)** → Moved to Tuesday 10:30 AM – 12:30 PM (gap between your morning classes and afternoon FTF)
> • All fixed commitments unchanged
>
> ⚡ New Focus: Head home and prepare for your work shift.
> Your math quiz is Wednesday morning — you now have a study block tomorrow.

Alex reviews the changes. The system moved only the flexible study task; all fixed classes remain untouched. Dashboard updates.

---

### Day 2: Tuesday — Adjusted Plan in Action

Alex opens the app. The timeline now reflects the replanned schedule:

- 7:00–9:00 AM: SIA (Online)
- **9:30–10:30 AM: Buy Groceries**
- **10:30 AM – 12:30 PM: Study for Math Quiz** [MOVED from Mon]
- 12:30–2:00 PM: Lunch / buffer
- 2:00–5:00 PM: SPEC1 (FTF)
- 5:00–8:00 PM: SPEC2 (FTF)
- **8:30–10:00 PM: Database Proposal — Results (1.5 hrs)**

Focus Card in the morning: "Buy Groceries — 9:30 AM (1 hr)"

After groceries, Focus Card updates: "Study for Math Quiz — 10:30 AM (2 hrs)"

Alex follows the plan. All fixed classes (SIA, SPEC1, SPEC2) are attended normally. The day runs smoothly because the system reshuffled only the flexible tasks.

---

### Day 3: Wednesday — Task Completion

Alex has the math quiz in SIA (7:00 AM). After the quiz, the system auto-promotes the next task.

Focus Card updates:

> ⚡ **WHAT TO DO NEXT**
> Database Proposal — Review & Submit
> 🕐 Today, 10:30 AM – 11:00 AM (0.5 hrs)
> 💡 Why? Both sections are done. A quick review today gives you Thursday and Friday as buffer before the Friday deadline.

Alex finishes the review. Marks done. The Database Proposal is submitted ahead of schedule.

---

## 21. What the Product Is NOT

| It is NOT... | It IS... |
|---|---|
| A general-purpose AI chatbot | An adaptive time-management engine |
| An LMS replacement | A layer that sits on top of existing school systems |
| A lesson tutor or content generator | A tool that schedules study time (not study content) |
| A tool for completing graded work | A tool that breaks assignments into schedulable steps |
| A mental-health/burnout counselor | A system focused on objective time constraints |
| Simply a calendar | A system that prioritizes, recommends, and replans |
| Simply a to-do list | A system that answers "Does it all fit?" and "What's next?" |
| A conversational AI wrapper | An engine that uses conversation only for clarification and input |

---

## 22. Core vs Optional Features

### Core (Must-Have for MVP)

**The AI Adaptive Time-Management Engine:**

All of these are part of the ONE core function:
- Extract tasks/commitments from voice/text input
- Calculate available time around fixed commitments
- Prioritize tasks using deadline, duration, and availability
- Generate a realistic schedule
- Provide a clear "What should I work on next?" recommendation
- **Dynamically replan when circumstances change**
- Explain priorities ("Why this?")
- Allow student to override/adjust

### Optional (Valuable but Not Required for MVP)

| Feature | Description | Why Optional |
|---|---|---|
| **Smart, actionable reminders** | Push notifications when it's time to start a task | Requires background services and platform permissions. Judges evaluate the engine, not notification plumbing. |
| **Available-vs-required-time dashboard** | Visual overview: "You have 12 usable hours this week and 10 hours of tasks" | The visual dashboard showing available vs. required time is optional. The underlying calculation of available time and required work is part of the CORE engine, as it's required for scheduling and replanning. |
| **Advanced calendar/LMS integrations** | Direct API connections to Canvas, Google Classroom, etc. | Real integrations require OAuth flows and API keys. For hackathon, mock connections are sufficient to demonstrate the concept. |

### Critical Rule

Optional features must NEVER be prioritized over the core engine during the hackathon build. If time is running out, the adaptive replanning engine must work. Reminders and dashboards can be described in the pitch as "next steps."

---

## 23. Key UX Principles

### 1. Show, Don't Chat
The primary experience is structured visual information (cards, timelines, schedules), not conversation. The student should be able to understand their plan at a glance without reading paragraphs of AI text.

### 2. One Tap to Replan
The Snooze button on the Focus Card triggers a full replan with zero typing. This demonstrates the adaptive engine's power with minimal friction.

### 3. AI Recommends, Student Controls
Every AI output is a recommendation. The student can always override priorities, move tasks, change durations, or reject suggestions.

### 4. Transparency Over Magic
Every recommendation includes a brief "Why this?" explanation. The student (and the judges) should understand the reasoning, not just trust a black box.

### 5. Temporary by Default
New information is treated as a one-time change unless the student explicitly says it's recurring. This prevents the baseline from being accidentally corrupted.

### 6. Honest About Constraints
When there isn't enough time to do everything, the system says so. It does not pretend everything fits. It helps the student triage instead.

### 7. Fast Capture, Structured Output
Input is fast and messy (voice/text brain dump). Output is clean and structured (cards, timelines, priorities). The AI handles the translation between the two.

### 8. The Engine Is Invisible
The student should never feel like they are "using an AI." They should feel like they have a personal time-management system that just works. The AI is the engine under the hood, not the interface.

---

## 24. Consistency Check

Before finalizing, this document was verified against all 16 established project decisions:

| # | Decision | Status |
|---|---|---|
| 1 | Product is an adaptive time-management assistant, not a general-purpose AI assistant | ✅ Maintained throughout |
| 2 | Core product is the adaptive engine | ✅ Engine pipeline is central to all sections |
| 3 | Dynamic replanning is part of the ONE must-have function | ✅ Section 13 treats it as core, Section 22 confirms |
| 4 | Voice/text is an input mechanism, not the product | ✅ Section 16 explicitly distinguishes interaction types |
| 5 | Conversational interaction is allowed for time-management purposes only | ✅ Section 16 limits chat to interactive clarification |
| 6 | Structured output preferred for main experience | ✅ Section 17 defines structured output types |
| 7 | Regular commitments form a baseline | ✅ Section 7 defines baseline in detail |
| 8 | New information treated as temporary by default | ✅ Section 14 establishes this rule |
| 9 | System replans rather than just adding items | ✅ Section 13 describes full replanning cycle |
| 10 | Student remains in control | ✅ Emphasized in Sections 11, 12, 19, 23 |
| 11 | System does not invent critical information | ✅ Section 9 and 18 enforce this |
| 12 | Product does not teach, replace LMS, do graded work, provide mental-health support, or become a general chat assistant | ✅ Section 19 and 21 enforce boundaries |
| 13 | Original problem framing preserved (scattered info + limited time) | ✅ Section 1 and 4 preserve the full problem |
| 14 | Adaptive replanning is an extension, not a replacement | ✅ Replanning builds on top of the scheduling engine |
| 15 | Original problem not weakened in favor of replanning alone | ✅ Sections 1, 4, 5 maintain the full pipeline |
| 16 | Product is not "an AI chatbot that manages tasks" | ✅ Explicitly addressed in Sections 16, 21, 23 |

**This document was checked against the established project decisions. Future changes should preserve the core product definition, adaptive replanning behavior, student control, and defined scope.**

---

> **End of User Story Document**
>
> This document should be provided as context to any LLM tasked with designing, building, or prompting the application. It contains the canonical product flow, interaction model, safety rules, and design principles.
