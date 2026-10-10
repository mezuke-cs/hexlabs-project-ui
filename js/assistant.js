/*
 * SIKAD — Ask SIKAD: answers to questions about the current plan.
 *
 * Deterministic rules over the live application state. No language model is connected:
 * a question is recognised by its wording, then answered by reading the same tasks, plan
 * and fixed commitments every other view uses. When the state cannot answer, the reply
 * says what is missing instead of guessing. Changes ("I have a shift…") are not handled
 * here; they go through parser.js → preview → confirm → replan.
 *
 * answer(state, text) → null (not a question) | { kind, title, lines: [string], facts: [[label, value]], missing?: true }
 */
(function (root) {
  'use strict';
  const T = root.TempoTime, E = root.TempoEngine, P = root.TempoParser;
  const { MIN, DAY, HOUR } = T;

  const Q = {
    feasible: /\b(?:can|could|will) i (?:realistically |really |still |actually )?(?:finish|complete|fit|do|make|get)\b|\b(?:will|does|do) (?:everything|it all|all of (?:it|this)) fit\b|\bis (?:it|everything|this) (?:doable|feasible|possible|realistic)\b|\b(?:do i have|is there) enough time\b/i,
    usable: /\bhow (?:much|many) (?:usable |free |open |available |spare )?(?:time|hours?)\b|\b(?:am i|when am i) free\b|\bdo i have (?:any )?(?:free |open )?time\b/i,
    why: /\bwhy\b/i,
    next: /\bwhat (?:should|do|can|must) i (?:do|work on|start|focus on|tackle)\b|\bwhat'?s (?:next|first)\b|\bwhere (?:should|do) i start\b|\bwhat (?:is|comes) next\b/i,
  };

  const sum = (arr, f) => arr.reduce((a, x) => a + f(x), 0);
  const openTasks = (state) => state.tasks.filter((t) => t.status !== 'done' && t.status !== 'cancelled');
  const remaining = (t) => (t.parts && t.parts.length ? sum(t.parts.filter((p) => !p.done), (p) => p.remainingMins) : t.remainingMins);
  const usableBetween = (state, from, to) => Math.round(sum(E.freeSlots(state, T.ceilTo(from, 15), to), (s) => (s.end - s.start) / MIN));
  /** Big totals read better rounded: "35 hrs", not "35 hr 15 min". */
  const span = (mins) => (mins >= 600 ? `${Math.round(mins / 60)} hrs` : T.dur(mins));
  // Words that point at "whatever is recommended" rather than naming a specific task.
  const GENERIC = new Set(('why assignment task one thing priority highest high first top recommended recommend next important most start begin ' +
    'before ahead number main biggest urgent what should work again right').split(' '));
  const dueWords = (dl, now) => {
    const days = Math.round((T.dayStart(dl) - T.dayStart(now)) / DAY);
    if (dl <= now) return 'is past its deadline';
    return `is due ${days === 0 ? 'today' : days === 1 ? 'tomorrow' : days < 7 ? T.DAY_NAMES[T.dow(dl)] : T.short(dl)} (${T.short(dl)}, ${T.time(dl)})`;
  };

  function classify(text) {
    for (const kind of ['feasible', 'usable', 'why', 'next']) if (Q[kind].test(text)) return kind;
    return null;
  }

  function answer(state, text) {
    const kind = classify(text || '');
    if (!kind) return null;
    return { next: answerNext, why: answerWhy, usable: answerUsable, feasible: answerFeasible }[kind](state, text);
  }

  // ------------------------------------------------- "What should I work on next?"
  function answerNext(state) {
    const now = state.now;
    const next = E.nextSession(state.plan, now);
    if (!next) {
      const open = openTasks(state);
      if (!open.length) return { kind: 'next', title: 'Nothing is waiting', lines: ['You have no open tasks. Add one whenever something comes up.'], facts: [], missing: true };
      const noDl = open.filter((t) => t.deadline == null);
      return { kind: 'next', title: 'Nothing is scheduled yet', missing: true, facts: [],
        lines: [noDl.length ? `I can't schedule ${noDl.map((t) => `"${t.title}"`).join(', ')} without a deadline. Add the date and it gets a time slot.`
          : 'Your open tasks do not fit before their deadlines. See "Not enough time" on Home for options.'] };
    }
    const task = state.tasks.find((t) => t.id === next.taskId);
    return { kind: 'next', title: next.title,
      lines: [E.explain(state, state.plan, next, now) || 'It is the first item in your current plan.'],
      facts: [['When', `${T.rel(next.start, now)}, ${T.range(next.start, next.end)}`], ['Planned time', T.dur(next.mins) + (task && task.isAiEstimate ? ' (AI estimate)' : '')],
        ...(task && task.deadline != null ? [['Due', `${T.short(task.deadline)}, ${T.time(task.deadline)}`]] : [])] };
  }

  // ------------------------------------------------- "Why is this my highest priority?"
  function answerWhy(state, text) {
    const now = state.now;
    const open = openTasks(state);
    if (!open.length) return { kind: 'why', title: 'No open tasks', lines: ['There is nothing to prioritise yet. Add a task and I can explain where it sits.'], facts: [], missing: true };
    const next = E.nextSession(state.plan, now);
    const named = P.matchTask(text, open);
    const asked = P.tokens(text).filter((w) => !GENERIC.has(w));
    if (!named && asked.length) {
      const words = text.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w && asked.includes(P.tokens(w)[0]));
      return { kind: 'why', title: `No task matches "${words.join(' ')}"`, missing: true, facts: [],
        lines: [`I don't have an open task by that name, so I can't explain its priority. Your open tasks are: ${open.map((t) => `"${t.title}"`).join(', ')}.`] };
    }
    const task = named || (next && state.tasks.find((t) => t.id === next.taskId));
    if (!task) return { kind: 'why', title: 'Nothing is scheduled yet', lines: ['No task has a time slot yet, so there is no recommendation to explain. Check that your tasks have deadlines.'], facts: [], missing: true };
    if (task.deadline == null) return { kind: 'why', title: task.title, lines: [`"${task.title}" has no deadline yet, so I can't rank it. Add the date and I'll place it.`], facts: [], missing: true };

    // Priority order as the scheduler sees it (one entry per task, in rank order).
    const ranked = [];
    for (const u of E.rank(E.units(state).filter((x) => x.deadline != null), now)) if (!ranked.includes(u.taskId)) ranked.push(u.taskId);
    const pos = ranked.indexOf(task.id) + 1;
    const left = remaining(task);
    const usable = task.deadline > now ? usableBetween(state, now, task.deadline) : 0;
    const dueBy = sum(open.filter((t) => t.deadline != null && t.deadline <= task.deadline), remaining);
    const lines = [];
    const isNext = next && next.taskId === task.id;
    if (pos === 1) lines.push(`"${task.title}" ranks first of your ${ranked.length} scheduled task${ranked.length === 1 ? '' : 's'}.`);
    else lines.push(`"${task.title}" ranks ${pos} of ${ranked.length}. "${(state.tasks.find((t) => t.id === ranked[0]) || {}).title}" is ahead of it.`);
    if (pos > 1 && isNext) lines.push('It is still your next step, because the next open block is the first place it fits.');
    if (pos === 1 && next && !isNext) lines.push(`Your next scheduled step is "${next.title}", because that is what fits the next open block.`);
    lines.push(`It ${dueWords(task.deadline, now)} and has ${T.dur(left)} of work left.`);
    if (task.deadline > now) lines.push(`You have about ${span(usable)} of usable time before then, and ${T.dur(dueBy)} of work due by that point${dueBy > usable ? ', which is more than fits' : ''}.`);
    if (task.doFirst) lines.push('You marked it "do first", which puts it ahead of everything that is not overdue.');
    const blocks = open.filter((t) => (t.dependencies || []).includes(task.id));
    if (blocks.length) lines.push(`${blocks.map((t) => `"${t.title}"`).join(', ')} can't start until this is done.`);
    const waits = (task.dependencies || []).map((id) => state.tasks.find((t) => t.id === id)).filter((t) => t && t.status !== 'done');
    if (waits.length) lines.push(`It has to wait for ${waits.map((t) => `"${t.title}"`).join(', ')}.`);
    if (task.isAiEstimate) lines.push('Its duration is an AI estimate. If it is off, edit it and the ranking updates.');
    return { kind: 'why', title: `Why ${task.title}`, lines,
      facts: [['Rank', `${pos} of ${ranked.length}`], ['Importance you set', task.priority], ['Work left', T.dur(left)], ['Due', `${T.short(task.deadline)}, ${T.time(task.deadline)}`]] };
  }

  // ------------------------------------------------- "How much usable time do I have tomorrow?"
  function answerUsable(state, text) {
    const now = state.now;
    const parsed = P.parseDate(text, now);
    const day = parsed ? parsed.day : T.dayStart(now);
    const b = state.baseline;
    const from = Math.max(now, T.at(day, b.dayStart)), to = T.at(day, b.dayEnd);
    const label = `${T.rel(day, now)}${['Today', 'Tomorrow'].includes(T.rel(day, now)) ? ` (${T.short(day)})` : ''}`;
    if (to <= now) return { kind: 'usable', title: `${label}: no usable time left`, lines: [`Your planning day ends at ${T.hmLabel(b.dayEnd)}, and that has passed.`], facts: [] };
    const usable = usableBetween(state, from, to);
    const planned = sum(state.plan.filter((s) => s.end > now && T.dayStart(s.start) === day), (s) => s.mins);
    const fixed = E.occurrences(state, day).filter((o) => !o.soft && o.end > now);
    const lines = [`${label} you have ${T.dur(usable)} of usable time${day === T.dayStart(now) ? ' left' : ''}.`];
    lines.push(planned ? `${T.dur(planned)} of that is already planned for tasks, which leaves about ${T.dur(Math.max(0, usable - planned))} open.` : 'None of it is planned for tasks yet.');
    lines.push(`That counts only ${T.hmLabel(b.dayStart)}–${T.hmLabel(b.dayEnd)}, and leaves out your fixed commitments${b.commuteMins && fixed.some((o) => o.mode === 'FTF') ? ', commute' : ''} and a ${b.bufferMins}-minute buffer around them.`);
    return { kind: 'usable', title: `Usable time ${T.rel(day, now).toLowerCase()}`, lines,
      facts: [['Usable', T.dur(usable)], ['Planned for tasks', T.dur(planned)], ['Fixed commitments', fixed.length ? fixed.map((o) => `${o.title} ${T.timeShort(o.start)}–${T.timeShort(o.end)}`).join(' · ') : 'None']] };
  }

  // ------------------------------------------------- "Can I realistically finish everything before Friday?"
  function answerFeasible(state, text) {
    const now = state.now;
    const open = openTasks(state);
    if (!open.length) return { kind: 'feasible', title: 'Nothing is due', lines: ['You have no open tasks, so there is nothing to fit.'], facts: [], missing: true };
    const parsed = P.parseDate(text, now);
    const until = parsed ? T.at(parsed.day, '23:59') : T.endOfWeek(now);
    const label = parsed ? T.short(until) : `the end of this week (${T.short(until)})`;
    const due = open.filter((t) => t.deadline != null && t.deadline <= until);
    const noDl = open.filter((t) => t.deadline == null);
    if (!due.length) {
      return { kind: 'feasible', title: `Nothing is due by ${label}`, facts: [],
        lines: [`None of your ${open.length} open task${open.length === 1 ? '' : 's'} is due by then.`].concat(noDl.length ? [`I can't judge ${noDl.map((t) => `"${t.title}"`).join(', ')}: no deadline yet.`] : []) };
    }
    const need = sum(due, remaining);
    const usable = usableBetween(state, now, until);
    const stuck = (state.unscheduled || []).filter((u) => due.some((t) => t.id === u.taskId));
    const lastEnd = Math.max(0, ...state.plan.filter((s) => due.some((t) => t.id === s.taskId)).map((s) => s.end));
    const estimates = due.filter((t) => t.isAiEstimate);
    const lines = [];
    let title;
    if (stuck.length) {
      title = `No, not everything fits by ${label}`;
      lines.push(`${stuck.length === 1 ? 'One piece of work has' : `${stuck.length} pieces of work have`} no open block before the deadline: ${[...new Set(stuck.map((u) => `"${u.title}"`))].join(', ')} (${T.dur(sum(stuck, (u) => u.mins))} in total).`);
      lines.push('I have not moved any deadline or shortened any task to hide that. Options are on Home under "Not enough time".');
    } else {
      title = `Yes, as currently planned`;
      lines.push(`${due.length} task${due.length === 1 ? '' : 's'} due by ${label} need${due.length === 1 ? 's' : ''} ${T.dur(need)}. You have about ${span(usable)} of usable time before then.`);
      if (lastEnd) lines.push(`The plan finishes the last of them on ${T.short(lastEnd)} at ${T.time(lastEnd)}.`);
    }
    if (estimates.length) lines.push(`This relies on ${estimates.length} AI-estimated duration${estimates.length === 1 ? '' : 's'} (${estimates.map((t) => `"${t.title}"`).join(', ')}). If those run long, the answer can change.`);
    if (noDl.length) lines.push(`Not counted: ${noDl.map((t) => `"${t.title}"`).join(', ')} (no deadline yet).`);
    return { kind: 'feasible', title, lines,
      facts: [['Work due by then', T.dur(need)], ['Usable time', span(usable)], ['Tasks', due.map((t) => t.title).join(' · ')]] };
  }

  root.TempoAssistant = { answer, classify };
})(typeof window !== 'undefined' ? window : globalThis);
