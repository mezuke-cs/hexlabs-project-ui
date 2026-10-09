/*
 * SIKAD — application state and state transitions.
 *
 * This is the "Application Responsibility" side of prompt.md §2: it owns
 * persistence, applies the engine's proposals, keeps fixed commitments
 * protected, and records every engine output (Phase 1–3 JSON) for inspection.
 */
(function (root) {
  'use strict';
  const T = root.TempoTime, E = root.TempoEngine, P = root.TempoParser, D = root.TempoData;
  const { MIN } = T;
  const KEY = 'tempo-state-v1';

  const clone = (o) => JSON.parse(JSON.stringify(o));

  function initialState() {
    return {
      version: 1, onboarded: false, onboardStep: 0, now: D.DEMO_START,
      user: { name: '' },
      baseline: { dayStart: '06:00', dayEnd: '22:00', commuteMins: 60, bufferMins: 15, routineMins: 30, protectLunch: false, classes: [], recurring: [] },
      integrations: {},
      tasks: [], events: [], cancellations: [],
      plan: [], unscheduled: [], needsDeadline: [], alerts: [], status: 'SUCCESS',
      history: [], checkins: [], active: null, lastUpdate: null,
      engineLog: [], seq: 1,
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return Object.assign(initialState(), JSON.parse(raw));
    } catch (e) { /* storage unavailable — start fresh */ }
    return initialState();
  }
  function save(state) {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }
  function reset() {
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    return initialState();
  }

  const uid = (state, prefix) => `${prefix}_${String(state.seq++).padStart(3, '0')}`;

  function log(state, phase, input, output) {
    state.engineLog.unshift({ phase, at: state.now, input, output });
    state.engineLog = state.engineLog.slice(0, 25);
  }

  // ---------------------------------------------------------------- tasks --
  function taskRemaining(t) {
    if (t.parts && t.parts.length) return t.parts.filter((p) => !p.done).reduce((a, p) => a + p.remainingMins, 0);
    return t.status === 'done' ? 0 : t.remainingMins;
  }
  function taskTotal(t) {
    return t.parts && t.parts.length ? t.parts.reduce((a, p) => a + p.mins, 0) : t.durationMins;
  }

  function makeTask(state, t) {
    const parts = (t.parts || []).filter((p) => p.mins > 0).map((p, i) => ({
      id: `p${i + 1}`, title: p.title, mins: p.mins, remainingMins: p.mins, done: false, aiSuggested: !!p.aiSuggested,
    }));
    return {
      id: uid(state, 't'), title: t.title, type: t.type || 'task', context: t.context || null,
      deadline: t.deadline != null ? t.deadline : null, durationMins: t.durationMins,
      remainingMins: parts.length ? 0 : t.durationMins, isAiEstimate: !!t.isAiEstimate,
      priority: t.priority || 'medium', doFirst: false, status: 'pending', parts,
      dependencies: t.dependencies || [], notBefore: null, pinnedStart: null, notes: t.notes || '', createdAt: state.now,
    };
  }

  /** Change a task's total duration, scaling any pending parts proportionally. */
  function setDuration(task, mins) {
    mins = Math.max(5, Math.round(mins));
    if (task.parts && task.parts.length) {
      const pending = task.parts.filter((p) => !p.done);
      const doneMins = task.parts.filter((p) => p.done).reduce((a, p) => a + p.mins, 0);
      const target = Math.max(pending.length * 5, mins - doneMins);
      const cur = pending.reduce((a, p) => a + p.mins, 0) || 1;
      let used = 0;
      pending.forEach((p, i) => {
        const m = i === pending.length - 1 ? target - used : Math.max(5, Math.round((p.mins / cur) * target / 5) * 5);
        const doneSoFar = p.mins - p.remainingMins;
        p.mins = m; p.remainingMins = Math.max(0, m - doneSoFar); used += m;
      });
    } else {
      const doneSoFar = task.durationMins - task.remainingMins;
      task.remainingMins = Math.max(0, mins - doneSoFar);
    }
    task.durationMins = mins;
    task.isAiEstimate = false;
  }

  // ----------------------------------------------------------------- plan --
  /** Run the engine and record what changed. Every state change funnels through here. */
  function replan(state, trigger, opts = {}) {
    const prevPlan = state.plan.filter((s) => s.end > state.now);
    const res = E.schedule(state, { prevPlan: opts.fresh ? null : prevPlan });
    const changes = opts.fresh ? [] : E.diff(prevPlan, res.plan, state, res.unscheduled);
    state.plan = res.plan;
    state.unscheduled = res.unscheduled.map((x) => ({ unitId: x.unit.id, taskId: x.unit.taskId, title: x.unit.title, mins: x.unit.mins, deadline: x.unit.deadline, reason: x.reason, waitingOn: x.waitingOn || null }));
    state.needsDeadline = res.needsDeadline;
    state.alerts = res.alerts;
    state.status = res.status;
    if (state.active && !state.plan.some((s) => s.id === state.active.sessionId)) state.active = null;

    const next = E.nextSession(res.plan, state.now);
    const alerts = (opts.alerts || []).concat(res.alerts);
    const output = E.phase3({ status: opts.status || res.status, alerts, clarification: opts.clarification, next, changes, unscheduled: res.unscheduled });
    log(state, 'Phase 3 · Dashboard & replanning', trigger || 'Plan generated', output);
    if (trigger) {
      state.lastUpdate = {
        trigger, at: state.now, status: res.status, notes: opts.notes || [], silent: !!opts.silent,
        changes: changes.map((c) => ({ action: c.action, title: c.title, from: c.from ? { start: c.from.start, end: c.from.end } : null, to: c.to ? { start: c.to.start, end: c.to.end, mins: c.to.mins } : null })),
      };
    }
    return { res, changes, output };
  }

  // -------------------------------------------------------------- actions --
  function findSession(state, id) {
    return state.plan.find((s) => s.id === id) || state.checkins.find((s) => s.id === id) || null;
  }

  function creditWork(state, s) {
    const task = state.tasks.find((t) => t.id === s.taskId);
    if (!task) return null;
    if (s.partId) {
      const part = task.parts.find((p) => p.id === s.partId);
      if (part) {
        part.remainingMins = Math.max(0, part.remainingMins - s.mins);
        if (part.remainingMins === 0) part.done = true;
      }
    } else {
      task.remainingMins = Math.max(0, task.remainingMins - s.mins);
    }
    if (taskRemaining(task) === 0) task.status = 'done';
    else if (task.status === 'in_progress' && !(state.active && state.active.sessionId !== s.id)) task.status = 'pending';
    return task;
  }

  function startSession(state, id) {
    const s = findSession(state, id);
    if (!s) return;
    state.active = { sessionId: id, startedAt: state.now, realStartedAt: Date.now() };
    const task = state.tasks.find((t) => t.id === s.taskId);
    if (task) task.status = 'in_progress';
  }

  function completeSession(state, id) {
    const s = findSession(state, id);
    if (!s) return null;
    const now = state.now;
    const early = now < s.start;
    state.history.push({ id: s.id + '@' + now, taskId: s.taskId, title: s.title,
      start: early ? now : s.start, end: early ? now : Math.min(Math.max(now, s.start + 15 * MIN), s.end), doneAt: now });
    const task = creditWork(state, s);
    state.checkins = state.checkins.filter((c) => c.id !== id);
    if (state.active && state.active.sessionId === id) state.active = null;
    const notes = [];
    if (task && task.status === 'done') notes.push(`"${task.title}" is complete. 🎉`);
    return replan(state, `Marked done: ${s.title}`, { notes, silent: true });
  }

  /** One-tap "Snooze / Didn't finish": push this piece of work to the next open block. */
  function snoozeSession(state, id) {
    const s = findSession(state, id);
    if (!s) return null;
    const task = state.tasks.find((t) => t.id === s.taskId);
    const target = s.partId ? task.parts.find((p) => p.id === s.partId) : task;
    target.notBefore = Math.max(s.end, state.now);
    if (task.status === 'in_progress') task.status = 'pending';
    if (state.active && state.active.sessionId === id) state.active = null;
    state.checkins = state.checkins.filter((c) => c.id !== id);
    return replan(state, `Snoozed: ${s.title}`, { silent: true });
  }

  function dismissCheckin(state, id) {
    state.checkins = state.checkins.filter((c) => c.id !== id);
  }

  /** Move the demo clock. Sessions that ended without being marked done become check-ins and get rescheduled. */
  function setClock(state, newNow) {
    const back = newNow < state.now;
    state.now = newNow;
    if (back) {
      state.checkins = [];
      return replan(state, null, { fresh: true });
    }
    const missed = state.plan.filter((s) => s.end <= newNow);
    for (const m of missed) if (!state.checkins.some((c) => c.id === m.id)) state.checkins.push(m);
    state.checkins = state.checkins.filter((c) => newNow - c.end < 2 * T.DAY);
    if (state.active) {
      const a = state.plan.find((s) => s.id === state.active.sessionId);
      if (!a || a.end <= newNow) state.active = null;
    }
    if (!missed.length) {
      const before = JSON.stringify(state.plan.map((s) => [s.unitId, s.start]));
      const r = replan(state, null);
      if (JSON.stringify(state.plan.map((s) => [s.unitId, s.start])) === before) return r;
      state.lastUpdate = { trigger: 'Time moved on', at: newNow, status: state.status, notes: [], silent: true, changes: r.changes.map(simpleChange) };
      return r;
    }
    return replan(state, `Not marked done: ${missed.map((m) => m.title).join(', ')}`, { silent: true,
      notes: ['I moved unfinished work to your next open blocks. If you did finish, confirm it on the check-in card.'] });
  }
  const simpleChange = (c) => ({ action: c.action, title: c.title, from: c.from ? { start: c.from.start, end: c.from.end } : null, to: c.to ? { start: c.to.start, end: c.to.end, mins: c.to.mins } : null });

  // ---------------------------------------------------- commitments edits --
  function addEvent(state, ev) {
    const e = { id: uid(state, 'e'), title: ev.title, kind: ev.kind || 'event', start: ev.start, end: ev.end, recurring: false };
    state.events.push(e);
    return e;
  }

  function addRecurring(state, rec) {
    const ids = [];
    for (const day of rec.days) {
      const r = { id: uid(state, 'r'), title: rec.title, kind: rec.kind || 'event', day, start: rec.start, end: rec.end };
      state.baseline.recurring.push(r);
      ids.push(r.id);
    }
    return ids;
  }

  /** Only called when the student explicitly says a commitment is cancelled — never on the engine's own initiative. */
  function cancelOccurrence(state, occ) {
    if (occ.source === 'temporary') state.events = state.events.filter((e) => e.id !== occ.refId && e.id !== occ.id);
    else if (!state.cancellations.includes(occ.id)) state.cancellations.push(occ.id);
  }

  // ---------------------------------------------------------- onboarding --
  function classesFromPhase1(state, phase1) {
    return phase1.extracted_commitments.map((c) => ({
      id: uid(state, 'c'), title: c.title, day: T.DAY_NAMES.indexOf(c.day_of_week),
      start: c.start_time, end: c.end_time, mode: c.mode === 'Online' ? 'Online' : 'FTF',
    }));
  }

  function applyLifestyle(state, ls) {
    const b = state.baseline;
    b.dayStart = ls.dayStart; b.dayEnd = ls.dayEnd; b.commuteMins = ls.commuteMins;
    b.recurring = b.recurring.filter((r) => r.kind !== 'work' && r.kind !== 'org');
    for (const w of ls.work || []) b.recurring.push({ id: uid(state, 'r'), title: 'Part-time work', kind: 'work', day: w.day, start: w.start, end: w.end });
    for (const o of ls.org || []) b.recurring.push({ id: uid(state, 'r'), title: 'Org meeting', kind: 'org', day: o.day, start: o.start, end: o.end });
  }

  function parseContext(state) {
    return {
      now: state.now, tasks: state.tasks, dayStartHm: state.baseline.dayStart,
      occurrencesFor: (day) => E.occurrences(state, day),
    };
  }

  /** Build the full Alex demo (skips onboarding). */
  function loadDemo(state) {
    state.user.name = 'Alex';
    const p1 = P.parseSchedule(D.SAMPLE_COR_TEXT);
    log(state, 'Phase 1 · Schedule extraction', 'Sample COR (BSIT 3B)', p1);
    state.baseline.classes = classesFromPhase1(state, p1);
    applyLifestyle(state, D.SAMPLE_LIFESTYLE);
    state.integrations = { gcal: true };
    const parsed = P.parse(D.SAMPLE_BRAIN_DUMP, parseContext(state));
    log(state, 'Phase 2 · Brain dump', D.SAMPLE_BRAIN_DUMP, P.toPhase2(parsed));
    for (const i of parsed.intents) if (i.type === 'task') state.tasks.push(makeTask(state, i.task));
    state.onboarded = true;
    replan(state, null, { fresh: true });
    return state;
  }

  root.TempoStore = {
    KEY, clone, initialState, load, save, reset, uid, log, taskRemaining, taskTotal, makeTask, setDuration,
    replan, findSession, startSession, completeSession, snoozeSession, dismissCheckin, setClock,
    addEvent, addRecurring, cancelOccurrence, classesFromPhase1, applyLifestyle, parseContext, loadDemo,
  };
})(typeof window !== 'undefined' ? window : globalThis);
