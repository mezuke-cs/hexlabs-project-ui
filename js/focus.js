/*
 * SIKAD — Focus Mode: working-method suggestions and session timing.
 *
 * Time blocking decides WHEN work happens (engine.js). A working method shapes HOW the
 * student works inside a block that is already scheduled. Methods never change the plan.
 * The suggestion is a simple, explainable rule of thumb, not a claim about what is best.
 */
(function (root) {
  'use strict';
  const T = root.TempoTime;
  const MIN = 60000;

  const METHODS = {
    chunking: { name: 'Task chunking', short: 'One step at a time' },
    pomodoro: { name: 'Pomodoro', short: '25 min focus, 5 min break' },
    timebox: { name: 'Timeboxing', short: 'One bounded block' },
    none: { name: 'No method', short: 'Just a running timer' },
  };
  const POMO_WORK = 25, POMO_BREAK = 5;

  /** Pomodoro rounds that fit in `mins` (work + break, no break after the last round). */
  const pomodoroRounds = (mins) => Math.max(1, Math.floor((mins + POMO_BREAK) / (POMO_WORK + POMO_BREAK)));

  /**
   * Suggest a working method for one scheduled session.
   * ctx: { sessionMins, windowMins, remainingTaskMins, pendingSteps: [{title, mins}], taskType, nextFixed: {title, start}|null }
   *   windowMins = usable minutes from now until the next fixed commitment (or the end of the day)
   */
  function recommend(ctx) {
    const steps = ctx.pendingSteps || [];
    const fits = Math.min(ctx.sessionMins, Math.max(0, ctx.windowMins));
    const until = ctx.nextFixed ? ` before your ${T.timeShort(ctx.nextFixed.start)} ${ctx.nextFixed.title}` : '';
    const setups = {
      chunking: { method: 'chunking', plannedMins: ctx.sessionMins, steps: steps.length ? steps : splitSteps(ctx.sessionMins) },
      pomodoro: { method: 'pomodoro', plannedMins: ctx.sessionMins, workMins: POMO_WORK, breakMins: POMO_BREAK, rounds: pomodoroRounds(fits) },
      timebox: { method: 'timebox', plannedMins: ctx.sessionMins, workMins: Math.max(5, fits) },
      none: { method: 'none', plannedMins: ctx.sessionMins },
    };
    let pick, reason;
    if (steps.length >= 2 || ctx.remainingTaskMins >= 180) {
      pick = 'chunking';
      reason = `This is a larger task (${T.dur(ctx.remainingTaskMins)} left${steps.length >= 2 ? `, ${steps.length} steps` : ''}). Working one step at a time keeps this sitting concrete.`;
    } else if (ctx.sessionMins >= 50 && ctx.windowMins >= ctx.sessionMins) {
      pick = 'pomodoro';
      reason = `You have ${T.dur(ctx.sessionMins)} planned and no fixed commitment in the way${until}. That is room for ${setups.pomodoro.rounds} rounds of ${POMO_WORK} minutes with short breaks.`;
    } else {
      pick = 'timebox';
      reason = ctx.windowMins < ctx.sessionMins
        ? `Only ${T.dur(Math.max(5, fits))} is open${until}. One bounded block makes use of it.`
        : `This fits in a single block of ${T.dur(ctx.sessionMins)}${until}. Work until the timer ends, then stop.`;
    }
    const structure = {
      chunking: `${setups.chunking.steps.length} steps. This sitting: ${T.dur(ctx.sessionMins)}.`,
      pomodoro: `${setups.pomodoro.rounds} × ${POMO_WORK} min focus with ${POMO_BREAK} min breaks.`,
      timebox: `A single block of ${T.dur(setups.timebox.workMins)}.`,
      none: 'A running timer with no set structure.',
    };
    const options = ['chunking', 'pomodoro', 'timebox', 'none'].map((m) => ({ method: m, name: METHODS[m].name, structure: structure[m], setup: setups[m], recommended: m === pick }));
    return { method: pick, name: METHODS[pick].name, reason, structure: structure[pick], setup: setups[pick], options };
  }

  /** Tasks without named steps still get a simple split so chunking has something to show. */
  function splitSteps(mins) {
    const n = mins >= 90 ? 3 : 2;
    const each = Math.max(5, Math.round(mins / n / 5) * 5);
    return Array.from({ length: n }, (_, i) => ({ title: ['Get set up and start', 'Main work', 'Wrap up and check'][n === 2 && i === 1 ? 2 : i], mins: each }));
  }

  /**
   * Where a session's timer stands. `elapsedMs` is real focused+break time since start (pauses excluded).
   * Returns { label, remainingMs|null, elapsedMs, phase, round, rounds, finished, focusedMins }.
   * `finished` only means the timer ran out. It never means the task is done.
   */
  function timer(active, elapsedMs) {
    const m = active.method;
    if (m === 'pomodoro') {
      const work = active.workMins * MIN, brk = active.breakMins * MIN, cycle = work + brk;
      const total = active.rounds * work + (active.rounds - 1) * brk;
      if (elapsedMs >= total) return { phase: 'done', finished: true, remainingMs: 0, elapsedMs, round: active.rounds, rounds: active.rounds, focusedMins: active.rounds * active.workMins, label: 'All rounds finished' };
      const idx = Math.floor(elapsedMs / cycle), into = elapsedMs - idx * cycle;
      const inWork = into < work;
      return { phase: inWork ? 'focus' : 'break', finished: false, remainingMs: inWork ? work - into : cycle - into, elapsedMs,
        round: idx + 1, rounds: active.rounds, focusedMins: Math.floor((idx * work + Math.min(into, work)) / MIN),
        label: inWork ? `Focus · round ${idx + 1} of ${active.rounds}` : `Break · then round ${idx + 2} of ${active.rounds}` };
    }
    if (m === 'timebox') {
      const total = active.workMins * MIN;
      const done = elapsedMs >= total;
      return { phase: done ? 'done' : 'focus', finished: done, remainingMs: Math.max(0, total - elapsedMs), elapsedMs, focusedMins: Math.floor(Math.min(elapsedMs, total) / MIN), label: done ? 'Time is up' : 'Timebox' };
    }
    return { phase: 'focus', finished: false, remainingMs: null, elapsedMs, focusedMins: Math.floor(elapsedMs / MIN), label: m === 'chunking' ? 'Working step by step' : 'Focus time' };
  }

  const clock = (ms) => { const s = Math.max(0, Math.round(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };

  root.TempoFocus = { METHODS, recommend, timer, clock, pomodoroRounds, POMO_WORK, POMO_BREAK };
})(typeof window !== 'undefined' ? window : globalThis);
