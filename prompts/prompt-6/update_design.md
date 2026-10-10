# SIKAD — Design System Implementation, Motion Specification & UI Polish

## Objective

Apply the updated `design.md` to the existing SIKAD application. Treat it as the primary source of truth for the visual design, branding, layout, components, and motion principles.

This is an implementation task, not merely a design review or documentation exercise.

Inspect the existing project, understand its architecture, and implement the updated design directly in the working application. The final result should feel like a polished, cohesive, responsive product rather than a static mockup.

## 1. Apply the Available Skills

Inspect and use the available skills relevant to this task:

- `frontend-design`
- `motion-design`
- `gsap`
- `web-design-guidelines`

Read the relevant skill instructions before implementation. Use their guidance to improve the visual hierarchy, interaction design, animation quality, accessibility, and responsive behavior.

Skills are implementation guidance, not permission to replace the existing architecture or override the product's established design direction.

Avoid unnecessary dependencies, conflicting design systems, and generic AI-generated UI patterns.

## 2. Inspect Before Editing

Before making changes:

1. Read `design.md` completely.
2. Inspect the existing HTML, CSS, JavaScript, assets, and project structure.
3. Identify the current screens, components, event handlers, state management, and persistence mechanisms.
4. Understand how the scheduling engine and AI integrations communicate with the UI.
5. Identify existing animations and interactions that should be improved, preserved, or replaced.
6. Determine how the application is deployed and how any additional assets or dependencies can be loaded reliably.

Use the existing implementation as the starting point. Do not assume that every component needs to be rebuilt.

## 3. Preserve the Existing Architecture and Functionality

The existing application uses vanilla HTML, CSS, and JavaScript.

- Keep the existing architecture.
- Do not migrate to React or introduce another framework.
- Preserve the scheduling engine, AI prompts, output contracts, validation, and business logic.
- Preserve task creation, editing, scheduling, replanning, persistence, completion, Undo, conflict handling, and existing navigation.
- Do not change API contracts or the meaning of engine statuses.
- Do not replace working functionality with mock data or decorative interactions.
- Do not remove existing functionality simply because it does not fit a new visual layout.

**Scope:** Modify the presentation and interaction layer only, except for minimal UI integration changes necessary to connect the new presentation to existing functionality.

If a requested interaction cannot be implemented without changing core logic, explain the limitation before making that change.

## 4. Implement the Updated Design System

Apply the specifications in `design.md`, including:

- SIKAD branding, wordmark, and visual identity.
- Grounded Path visual motif and timeline nodes.
- Forest, Paper, Butter, Sage, Sky, Harbor, and semantic color tokens.
- Typography, spacing, borders, radii, and shadows.
- Focus Card and Focus Mode.
- Task cards, timeline, status cards, controls, and panels.
- Light and dark themes where specified.
- Responsive layouts, touch targets, and mobile safe-area handling.
- Consistent icons and the specified microcopy.

Follow the documented hierarchy and component behavior. Do not introduce unrelated visual styles, excessive gradients, glassmorphism, decorative illustrations, or gamification.

Prioritize the actual scheduling experience over marketing-page aesthetics.

## 5. Create `motion-spec.md`

Before implementing the motion system, create a complementary `motion-spec.md` in the project root.

Use `design.md` as the source of truth. Expand its motion requirements into an implementation-ready specification without unnecessarily duplicating the entire design document.

Document:

- Motion principles and intended user experience.
- Each interaction's trigger and initial/final states.
- Animation sequence, duration, easing, and delays.
- Enter, exit, and interruption behavior.
- Task movement during replanning.
- Task completion and status transitions.
- Focus Mode entrance, spotlight, timer, and exit behavior.
- Buttons, sheets, panels, loading feedback, and notifications.
- Rapid repeated actions and overlapping animations.
- State synchronization and cleanup.
- Reduced-motion behavior.
- Mobile performance and accessibility.
- Acceptance criteria for verifying each interaction.

Preserve the timing values and motion principles already specified in `design.md` unless a concrete conflict requires resolution. Document any proposed deviations.

Keep the specification practical and aligned with the existing vanilla implementation.

## 6. Implement the Motion System

Implement the interactions defined in both documents in the actual application.

### Replanning — The Shuffle

When the scheduling engine returns an updated plan, animate the existing task cards into their new timeline positions where practical.

- Use the real before-and-after task data.
- Make moved tasks visually identifiable.
- Preserve previous and new times where specified.
- Preserve Undo and existing scheduling behavior.
- Handle inserted, removed, or reordered UI elements without visual glitches.
- Do not use a generic spinner as a substitute for the actual reordering animation.

### Task completion — The Satisfaction

- Animate the task title's strikethrough.
- Provide subtle pressed feedback.
- Transition the task into its completed visual state.
- Update the interface using the existing completion logic.

### Focus Mode — The Spotlight

- Expand the Focus Card when the user starts a task.
- Subtly dim surrounding content where specified.
- Display the correct timer and available actions.
- Preserve the actual timer and task state.
- Support exiting Focus Mode without losing progress.

### Other interactions

Implement appropriate, consistent feedback for:

- Buttons and toggles.
- Opening and closing sheets and panels.
- Snoozing and moving tasks.
- Plan-updated feedback and Undo.
- Loading, clarification, conflicts, infeasible schedules, and errors.
- Theme changes and other existing UI interactions where relevant.

Animations must communicate actual application state. They must never imply that an operation succeeded when it failed.

## 7. Choose Animation Technology Deliberately

Prefer native CSS transitions and JavaScript for simple interactions.

Evaluate GSAP for complex timeline reordering and coordinated animations. Use it only if it provides a meaningful benefit over the existing implementation.

If GSAP is selected:

- Keep the application vanilla.
- Document the reason for adding it in `motion-spec.md`.
- Use a deployment-compatible loading method.
- Avoid unnecessary plugins and dependencies.
- Ensure animations can be interrupted, cleaned up, and synchronized with real application state.

Do not introduce Framer Motion, Lenis, a framework, or a build system without a specific technical justification and approval.

## 8. Accessibility and Performance

- Respect `prefers-reduced-motion`.
- Preserve all information and functionality when motion is reduced.
- Keep interactive targets and focus indicators compliant with `design.md`.
- Prevent horizontal overflow at phone widths.
- Avoid expensive layout work and excessive simultaneous animations.
- Ensure keyboard interactions remain functional.
- Avoid animation-related layout shifts, duplicated event handlers, stale UI state, and memory leaks.

## 9. Verification

Test the actual running application, not just the CSS or screenshots.

Verify:

1. The updated visual design is consistently applied across existing screens.
2. Replanning animates real task cards into their new positions.
3. Task completion transitions correctly.
4. Focus Mode and the timer remain functional.
5. Snooze, Undo, and repeated interactions behave correctly.
6. Loading and error states reflect real operation results.
7. Existing scheduling, AI integration, and persistence remain intact.
8. Mobile layouts and touch interactions work.
9. Reduced-motion preferences are respected.
10. No new console errors, broken navigation, or regressions are introduced.

Use the project's existing testing tools where available. If browser testing is available, inspect the actual interactions at representative desktop and mobile widths.

Do not claim that a test passed unless it was actually performed.

## 10. Final Deliverables

Complete the implementation rather than stopping after the specification.

Deliver:

- Updated working SIKAD application.
- New `motion-spec.md`.
- Updated styles, UI code, assets, and dependency configuration only where necessary.
- A concise implementation report describing:
  - Files changed.
  - Skills applied.
  - Animation technology selected and why.
  - Animations and visual changes implemented.
  - Tests actually performed and their results.
  - Any unresolved issues or incomplete requirements.

## Final Priority

**Preserve the product logic. Improve the entire presentation layer. Implement the motion system. Verify the result.**

The goal is a cohesive SIKAD experience that combines the restrained, tactile Grounded Path aesthetic with polished, responsive interactions—without turning the application into a different product.