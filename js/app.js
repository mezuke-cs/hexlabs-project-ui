/*
 * Tempo — UI layer. Renders the onboarding wizard, dashboard, week view,
 * task list, settings and bottom sheets, and wires user actions to the store.
 */
(function () {
  'use strict';
  const T = window.TempoTime, E = window.TempoEngine, P = window.TempoParser, S = window.TempoStore, D = window.TempoData;

  let state = S.load();
  let undoSnap = null;
  const ui = {
    tab: 'home', dayView: 'today', weekDay: null, sheet: null, toast: null, focusOnly: false, listening: null,
    ob: state.obDraft || freshOnboarding(),
  };

  const $app = document.getElementById('app');
  const $sheet = document.getElementById('sheet-root');
  const $toast = document.getElementById('toast-root');

  function freshOnboarding() {
    return {
      step: 0, name: '', corText: '', classes: [], analysis: '', extracted: false, uploadNote: '',
      ls: { dayStart: '06:00', dayEnd: '22:00', commuteMins: 60, working: null, workDays: [6], workStart: '09:00', workEnd: '14:00',
        org: null, orgDay: 4, orgStart: '17:00', orgEnd: '19:00' },
      dumpText: '', review: null, genStep: 0,
    };
  }

  // -------------------------------------------------------------- helpers --
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const taskById = (id) => state.tasks.find((t) => t.id === id);
  const now = () => state.now;
  const PRI_LABEL = { high: 'High', medium: 'Medium', low: 'Low' };
  const priChip = (p) => `<span class="chip pri-${p}">${PRI_LABEL[p] || p}</span>`;
  const estChip = () => '<span class="chip est" title="Tempo guessed this from the task type. Tap the task to adjust.">AI estimate</span>';
  const approx = (mins) => (mins >= 600 ? `${Math.round(mins / 60)} hrs` : T.dur(mins));
  const hrs = (mins) => Math.round((mins / 60) * 100) / 100;
  const ICON = {
    home: '<svg viewBox="0 0 24 24"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 9.5V20h13V9.5"/></svg>',
    week: '<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
    tasks: '<svg viewBox="0 0 24 24"><path d="M9 6h11M9 12h11M9 18h11"/><path d="m3.5 6 1.2 1.2L7 5M3.5 12l1.2 1.2L7 11M3.5 18l1.2 1.2L7 17"/></svg>',
    user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c1.2-4 4.2-5.6 7.5-5.6s6.3 1.6 7.5 5.6"/></svg>',
    lock: '<svg viewBox="0 0 24 24" class="i-lock"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    mic: '<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg>',
  };
  const LOGO = '<svg class="logo" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="26" r="17" /><path d="M24 26 31 15" /><path d="M19 5h10" /><circle cx="24" cy="26" r="2.6" class="dot"/></svg>';

  function setPath(obj, path, value) {
    const keys = path.split('.');
    let o = obj;
    for (let i = 0; i < keys.length - 1; i++) o = o[keys[i]];
    o[keys[keys.length - 1]] = value;
  }
  function convert(el) {
    const type = el.dataset.type;
    if (el.type === 'checkbox') return el.checked;
    if (type === 'num') return el.value === '' ? null : Number(el.value);
    if (type === 'hrs') return el.value === '' ? null : Math.round(Number(el.value) * 60);
    if (type === 'dt') return T.fromInput(el.value);
    if (type === 'int') return parseInt(el.value, 10);
    return el.value;
  }

  function snapshot(label) {
    const copy = S.clone(state);
    delete copy.obDraft;
    undoSnap = { label, json: JSON.stringify(copy) };
  }
  function toast(msg, opts = {}) {
    ui.toast = { msg, undo: !!opts.undo, id: Date.now() };
    renderToast();
    const id = ui.toast.id;
    setTimeout(() => { if (ui.toast && ui.toast.id === id) { ui.toast = null; renderToast(); } }, opts.ms || 4200);
  }

  // --------------------------------------------------------------- render --
  function render() {
    state.obDraft = state.onboarded ? null : ui.ob;
    S.save(state);
    $app.innerHTML = state.onboarded ? shell() : onboarding();
    $sheet.innerHTML = ui.sheet ? sheet() : '';
    document.body.classList.toggle('sheet-open', !!ui.sheet);
    renderToast();
    tickTimer();
  }
  function renderToast() {
    $toast.innerHTML = ui.toast ? `<div class="toast" role="status">${esc(ui.toast.msg)}${ui.toast.undo && undoSnap ? ' <button data-action="undo">Undo</button>' : ''}</div>` : '';
  }
  function tickTimer() {
    const el = document.getElementById('focus-timer');
    if (!el || !state.active) return;
    const secs = Math.max(0, Math.floor((Date.now() - state.active.realStartedAt) / 1000));
    el.textContent = `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
  }
  setInterval(tickTimer, 1000);

  // ============================================================ ONBOARDING ==
  function onboarding() {
    const ob = ui.ob;
    const steps = ['Welcome', 'Baseline', 'Lifestyle', 'Sync', 'Brain dump', 'Plan'];
    const progress = ob.step > 0 && ob.step < 5
      ? `<div class="ob-progress" aria-label="Step ${ob.step} of 4">${[1, 2, 3, 4].map((i) => `<span class="${i <= ob.step ? 'on' : ''}"></span>`).join('')}</div>` : '';
    const body = [obWelcome, obBaseline, obLifestyle, obSync, obDump, obGenerating][ob.step]();
    return `<div class="screen onboarding" data-step="${esc(steps[ob.step])}">${progress}${body}</div>`;
  }

  function obWelcome() {
    return `
      <div class="ob-welcome">
        ${LOGO}
        <h1 class="brand">Tempo</h1>
        <p class="lead">Figure out what you can realistically accomplish with the time you actually have.</p>
        <label class="field">
          <span>What should we call you?</span>
          <input type="text" placeholder="Your name" data-bind="ob.name" value="${esc(ui.ob.name)}" autocomplete="given-name">
        </label>
        <button class="btn primary block" data-action="obNext">Get started</button>
        <button class="btn ghost block" data-action="loadDemo">Skip setup and load a demo week (Alex, BSIT 3B)</button>
      </div>`;
  }

  function obBaseline() {
    const ob = ui.ob;
    const rows = ob.classes.map((c, i) => `
      <div class="class-row">
        <input class="cr-title" aria-label="Subject" placeholder="Subject" value="${esc(c.title)}" data-bind="ob.classes.${i}.title">
        <select class="cr-mode" aria-label="Mode" data-bind="ob.classes.${i}.mode"><option ${c.mode === 'FTF' ? 'selected' : ''}>FTF</option><option ${c.mode === 'Online' ? 'selected' : ''}>Online</option></select>
        <button class="icon-btn" aria-label="Remove class" data-action="obRemoveClass" data-i="${i}">${ICON.close}</button>
        <select class="cr-day" aria-label="Day" data-bind="ob.classes.${i}.day" data-type="int">${T.DAY_NAMES.map((d, n) => `<option value="${n}" ${n === c.day ? 'selected' : ''}>${d}</option>`).join('')}</select>
        <span class="cr-time"><input type="time" aria-label="Start" value="${c.start}" data-bind="ob.classes.${i}.start"><span>–</span><input type="time" aria-label="End" value="${c.end}" data-bind="ob.classes.${i}.end"></span>
      </div>`).join('');
    return `
      <h2 class="ob-title">Set your baseline</h2>
      <p class="muted">Upload your COR or a photo of your class schedule. Tempo will pull out your weekly class blocks.</p>
      <label class="upload">
        <input type="file" accept="image/*,application/pdf" data-change="obUpload" hidden>
        <span class="upload-icon">📄</span>
        <span><b>Upload COR / schedule photo</b><br><small class="muted">PDF or image</small></span>
      </label>
      ${ob.uploadNote ? `<p class="note">${esc(ob.uploadNote)}</p>` : ''}
      <details class="paste" ${ob.corText ? 'open' : ''}>
        <summary>…or paste / type it (one class per line)</summary>
        <textarea rows="6" data-bind="ob.corText" placeholder="IT 302   MON   07:00-10:00   FTF">${esc(ob.corText)}</textarea>
        <div class="row">
          <button class="btn small" data-action="obSampleCor">Use sample COR</button>
          <button class="btn small primary" data-action="obExtract">Extract classes</button>
        </div>
      </details>
      ${ob.analysis ? `<div class="ai-note"><b>Schedule analysis</b><p>${esc(ob.analysis)}</p></div>` : ''}
      ${ob.extracted || ob.classes.length ? `
        <h3 class="list-h">Weekly classes (${ob.classes.length})</h3>
        <div class="class-list">${rows || '<p class="muted">No classes yet.</p>'}</div>
        <button class="btn small ghost" data-action="obAddClass">+ Add a class</button>
        <p class="muted small">Check the extraction and fix anything that's off before continuing.</p>` : ''}
      <div class="ob-nav">
        <button class="btn ghost" data-action="obBack">Back</button>
        <button class="btn primary" data-action="obNext" ${ob.classes.length ? '' : 'disabled'}>Continue</button>
      </div>`;
  }

  function chips(path, current, options) {
    return `<div class="chips">${options.map(([v, label]) =>
      `<button class="chip-btn ${String(current) === String(v) ? 'on' : ''}" data-action="obSet" data-path="${path}" data-value="${esc(v)}">${esc(label)}</button>`).join('')}</div>`;
  }

  function obLifestyle() {
    const ls = ui.ob.ls;
    const ftfDays = [...new Set(ui.ob.classes.filter((c) => c.mode === 'FTF').map((c) => c.day))].sort().map((d) => T.DAY_NAMES[d]);
    const ftfText = ftfDays.length ? `I see you have FTF classes on ${ftfDays.join(' & ')}. ` : '';
    const dayChecks = (path, sel) => `<div class="chips">${[1, 2, 3, 4, 5, 6, 0].map((d) =>
      `<button class="chip-btn ${sel.includes(d) ? 'on' : ''}" data-action="obToggleDay" data-path="${path}" data-day="${d}">${T.DAY_SHORT[d]}</button>`).join('')}</div>`;
    return `
      <div class="mascot-row"><div class="mascot" aria-hidden="true">⏱️</div><div><h2 class="ob-title">A few quick questions</h2><p class="muted">So the plan fits your real day.</p></div></div>
      <div class="q">
        <h3>What time does your day usually start?</h3>
        ${chips('ls.dayStart', ls.dayStart, [['05:00', '5:00 AM'], ['06:00', '6:00 AM'], ['07:00', '7:00 AM'], ['08:00', '8:00 AM']])}
        <label class="inline">Custom <input type="time" value="${ls.dayStart}" data-bind="ob.ls.dayStart" data-rerender></label>
      </div>
      <div class="q">
        <h3>${esc(ftfText)}How long is your commute to campus during rush hour?</h3>
        ${chips('ls.commuteMins', ls.commuteMins, [[0, 'No commute'], [30, '30 min'], [60, '1 hour'], [90, '1.5 hours']])}
      </div>
      <div class="q">
        <h3>Are you a working student?</h3>
        ${chips('ls.working', ls.working, [['yes', 'Yes, part-time'], ['no', 'No']])}
        ${ls.working === 'yes' ? `<div class="follow"><p class="muted small">What days and times do you usually work?</p>${dayChecks('workDays', ls.workDays)}
          <div class="row"><input type="time" value="${ls.workStart}" data-bind="ob.ls.workStart" aria-label="Work start"> to <input type="time" value="${ls.workEnd}" data-bind="ob.ls.workEnd" aria-label="Work end"></div></div>` : ''}
      </div>
      <div class="q">
        <h3>Are you in a school organization?</h3>
        ${chips('ls.org', ls.org, [['yes', 'Yes'], ['no', 'No']])}
        ${ls.org === 'yes' ? `<div class="follow"><p class="muted small">When does your org usually meet?</p>
          <div class="row"><select data-bind="ob.ls.orgDay" data-type="int" aria-label="Org day">${[1, 2, 3, 4, 5, 6, 0].map((d) => `<option value="${d}" ${d === ls.orgDay ? 'selected' : ''}>${T.DAY_NAMES[d]}</option>`).join('')}</select>
          <input type="time" value="${ls.orgStart}" data-bind="ob.ls.orgStart" aria-label="Org start"> to <input type="time" value="${ls.orgEnd}" data-bind="ob.ls.orgEnd" aria-label="Org end"></div></div>` : ''}
      </div>
      <div class="q">
        <h3>Latest you want anything scheduled?</h3>
        ${chips('ls.dayEnd', ls.dayEnd, [['21:00', '9:00 PM'], ['22:00', '10:00 PM'], ['23:00', '11:00 PM']])}
      </div>
      <div class="ob-nav">
        <button class="btn ghost" data-action="obBack">Back</button>
        <button class="btn primary" data-action="obNext" ${ls.working && ls.org ? '' : 'disabled'}>Continue</button>
      </div>`;
  }

  function obSync() {
    return `
      <h2 class="ob-title">Sync your world</h2>
      <p class="muted">Bring deadlines and events in from where they already live.</p>
      <div class="integrations">${D.INTEGRATIONS.map((i) => integrationRow(i)).join('')}</div>
      <p class="muted small">You can always connect more platforms later in Settings. <span class="tag">Demo: connections are simulated</span></p>
      <div class="ob-nav">
        <button class="btn ghost" data-action="obBack">Back</button>
        <button class="btn primary" data-action="obNext">Continue</button>
      </div>`;
  }
  function integrationRow(i) {
    const on = !!state.integrations[i.id];
    return `<div class="integration"><span class="int-icon">${i.icon}</span><div><b>${esc(i.name)}</b><br><small class="muted">${esc(i.desc)}</small></div>
      <button class="btn small ${on ? 'connected' : ''}" data-action="toggleIntegration" data-id="${i.id}">${on ? '✓ Connected' : 'Connect'}</button></div>`;
  }

  function obDump() {
    const ob = ui.ob;
    if (ob.review) return obReview();
    return `
      <h2 class="ob-title">Brain dump 🧠</h2>
      <p class="muted">What's on your plate right now? Don't worry about formatting — just dump it.</p>
      ${micButton('ob.dumpText')}
      <div class="divider"><span>or type it out</span></div>
      <textarea id="dump-ob" rows="5" data-bind="ob.dumpText" placeholder="e.g. Database proposal due Friday, about 3 hours. Study for my math quiz on Wednesday…">${esc(ob.dumpText)}</textarea>
      <button class="btn small ghost" data-action="obSampleDump">Use Alex's example</button>
      <div class="ob-nav">
        <button class="btn ghost" data-action="obBack">Back</button>
        <button class="btn primary" data-action="obParseDump">Extract tasks</button>
      </div>`;
  }

  function obReview() {
    const items = ui.ob.review;
    const tasks = items.filter((it) => it.kind === 'task');
    const skipped = items.filter((it) => it.kind !== 'task' && !['stress', 'unclear', 'duplicate'].includes(it.kind)).length;
    const unclear = items.find((it) => it.kind === 'unclear');
    return `
      <h2 class="ob-title">Here's what I caught</h2>
      <p class="muted">Check each one. Durations marked <span class="chip est">AI estimate</span> are guesses — adjust them if you know better.</p>
      <div class="review-list">${items.map((it, n) => it.kind === 'task' ? taskReviewCard(it, `ob.review.${n}`, n, 'ob') : '').join('')}</div>
      ${!tasks.length ? `<div class="ai-note"><p>${esc(unclear ? P.unclearQuestion(unclear) : "I couldn't find any tasks in that. Try listing what's due and when.")}</p></div>` : ''}
      ${skipped ? `<p class="muted small">${skipped} other item(s) — like schedule changes — can be added from the dashboard after setup.</p>` : ''}
      <div class="ob-nav">
        <button class="btn ghost" data-action="obEditDump">Edit text</button>
        <button class="btn primary" data-action="obGenerate" ${tasks.some((t) => t.include) ? '' : 'disabled'}>Generate my schedule ✨</button>
      </div>`;
  }

  function obGenerating() {
    const steps = ['Analyzing your class schedule…', 'Calculating commute buffers…', 'Finding your best time gaps…', 'Prioritizing tasks by deadline & difficulty…', 'Building your plan…'];
    return `
      <div class="generating">
        ${LOGO}
        <h2 class="ob-title">Building your plan</h2>
        <ol class="gen-steps">${steps.map((s, i) => `<li class="${i < ui.ob.genStep ? 'done' : i === ui.ob.genStep ? 'doing' : ''}">${i < ui.ob.genStep ? '✓' : i === ui.ob.genStep ? '<span class="spinner"></span>' : '○'} ${s}</li>`).join('')}</ol>
      </div>`;
  }

  function micButton(bindPath) {
    const on = ui.listening === bindPath;
    return `<button class="mic ${on ? 'listening' : ''}" data-action="voice" data-path="${bindPath}" aria-label="${on ? 'Stop listening' : 'Tap to speak'}">${ICON.mic}</button>
      <div class="mic-label">${on ? 'Listening… tap to stop' : 'Tap to speak'}</div>`;
  }

  /** Editable card for an extracted task (used in onboarding + brain dump review). */
  function taskReviewCard(it, path, n, scope) {
    const t = it.task;
    const needsDate = t.deadline == null;
    return `
      <article class="review-card ${it.include ? '' : 'excluded'}">
        <div class="rc-head">
          <input class="rc-title" value="${esc(t.title)}" data-bind="${path}.task.title" aria-label="Task name">
          <label class="toggle"><input type="checkbox" ${it.include ? 'checked' : ''} data-bind="${path}.include" data-rerender> Add</label>
        </div>
        ${t.context ? `<div class="muted small">${esc(t.context)}</div>` : ''}
        <div class="rc-grid">
          <label>Due
            <input type="datetime-local" value="${t.deadline != null ? T.toInput(t.deadline) : ''}" data-bind="${path}.task.deadline" data-type="dt" data-rerender>
          </label>
          <label>Time needed ${t.isAiEstimate ? estChip() : ''}
            <span class="hrs-input"><input type="number" min="0.25" step="0.25" value="${hrs(t.durationMins)}" data-bind="${path}.task.durationMins" data-type="hrs" data-est="${path}.task.isAiEstimate"> hrs</span>
          </label>
          <label>Priority
            <select data-bind="${path}.task.priority">${['high', 'medium', 'low'].map((p) => `<option value="${p}" ${p === t.priority ? 'selected' : ''}>${PRI_LABEL[p]}</option>`).join('')}</select>
          </label>
        </div>
        ${t.parts && t.parts.length ? `<div class="rc-parts"><span class="muted small">${t.parts.some((p) => p.aiSuggested) ? 'Suggested steps' : 'Parts'}:</span> ${t.parts.map((p) => `<span class="chip">${esc(p.title)} · ${T.dur(p.mins)}</span>`).join(' ')}</div>` : ''}
        ${it.ambiguous ? `<div class="clarify"><p>❓ ${esc(it.clarification)}</p><div class="chips">${it.ambiguous.map((o, k) =>
          `<button class="chip-btn" data-action="pickAmbiguous" data-scope="${scope}" data-n="${n}" data-k="${k}">${esc(o.label)}</button>`).join('')}</div></div>`
          : needsDate ? `<div class="clarify"><p>❓ ${esc(it.clarification || 'When is this due? I need the date to schedule it.')}</p><p class="muted small">Tempo won't guess a deadline. Without one, this task is saved but not scheduled.</p></div>` : ''}
      </article>`;
  }

  // ============================================================== APP SHELL ==
  function shell() {
    const views = { home: homeView, week: weekView, tasks: tasksView, profile: profileView };
    return `
      <div class="screen app">
        ${clockBar()}
        <main class="view">${views[ui.tab]()}</main>
        <nav class="bottom-nav" aria-label="Main">
          ${navBtn('home', 'Home', ICON.home)}
          ${navBtn('week', 'Overview', ICON.week)}
          <button class="fab" data-action="openDump" aria-label="Brain dump: add a task or change"><span>🧠</span></button>
          ${navBtn('tasks', 'Tasks', ICON.tasks)}
          ${navBtn('profile', 'Profile', ICON.user)}
        </nav>
      </div>`;
  }
  const navBtn = (tab, label, icon) => `<button class="nav-btn ${ui.tab === tab ? 'on' : ''}" data-action="tab" data-tab="${tab}" ${ui.tab === tab ? 'aria-current="page"' : ''}>${icon}<span>${label}</span></button>`;

  function clockBar() {
    return `
      <div class="clock-bar" role="group" aria-label="Demo clock">
        <button class="clock-now" data-action="openClock" title="Set the demo clock"><span class="clock-dot"></span><b>${T.DAY_SHORT[T.dow(now())]} ${T.parts(now()).d} · ${T.time(now())}</b></button>
        <button class="clock-step" data-action="advance" data-mins="15">+15m</button>
        <button class="clock-step" data-action="advance" data-mins="60">+1h</button>
        <button class="clock-step" data-action="nextMorning">Next day</button>
      </div>`;
  }

  // ------------------------------------------------------------------ HOME --
  function homeView() {
    if (ui.focusOnly) {
      return `<header class="home-head"><div class="eyebrow">${T.date(now())}</div><h1>One thing at a time</h1></header>
        ${focusCard()}
        <button class="btn ghost block" data-action="showFullPlan">Show my full plan</button>`;
    }
    return `
      <header class="home-head">
        <div class="eyebrow">${T.date(now())}</div>
        <h1>Hey, ${esc(state.user.name || 'there')} 👋</h1>
      </header>
      ${updateCard()}
      ${checkinCards()}
      ${focusCard()}
      ${attentionBlock()}
      ${fitCard()}
      <section class="section">
        <div class="section-head">
          <h2>${ui.dayView === 'today' ? "Today's timeline" : "Tomorrow's preview"}</h2>
          <div class="seg" role="tablist">
            <button class="${ui.dayView === 'today' ? 'on' : ''}" data-action="dayView" data-v="today">Today</button>
            <button class="${ui.dayView === 'tomorrow' ? 'on' : ''}" data-action="dayView" data-v="tomorrow">Tomorrow</button>
          </div>
        </div>
        ${timeline(T.dayStart(now()) + (ui.dayView === 'tomorrow' ? T.DAY : 0))}
      </section>`;
  }

  function changeLine(c) {
    const n = now();
    const when = (x) => `${T.rel(x.start, n)} ${T.timeShort(x.start)}`;
    switch (c.action) {
      case 'RESCHEDULE': return `<b>${esc(c.title)}</b> → moved to ${when(c.to)}`;
      case 'SCHEDULE': return `<b>${esc(c.title)}</b> → scheduled ${when(c.to)}`;
      case 'COMPLETE': return `<b>${esc(c.title)}</b> → completed ✓`;
      case 'CANCEL': return `<b>${esc(c.title)}</b> → removed from your plan`;
      default: return `<b>${esc(c.title)}</b> → couldn't fit (see below)`;
    }
  }

  function updateCard() {
    const u = state.lastUpdate;
    if (!u) return '';
    const next = E.nextSession(state.plan, now());
    const shown = u.changes.slice(0, 6);
    return `
      <section class="card update ${u.status === 'INFEASIBLE' ? 'warn' : ''}" aria-live="polite">
        <div class="update-head"><b>📋 Plan updated</b><button class="icon-btn" data-action="dismissUpdate" aria-label="Dismiss">${ICON.close}</button></div>
        <div class="muted small">Trigger: ${esc(u.trigger)}</div>
        ${u.notes.map((x) => `<p class="small">${esc(x)}</p>`).join('')}
        ${shown.length ? `<ul class="changes">${shown.map((c) => `<li>${changeLine(c)}</li>`).join('')}</ul>${u.changes.length > shown.length ? `<p class="muted small">+${u.changes.length - shown.length} more</p>` : ''}`
          : '<p class="small">Nothing else needed to move.</p>'}
        <p class="small muted">🔒 Fixed commitments were not changed${/Cancel|skip/i.test(u.trigger) ? ' except the one you cancelled' : ''}.</p>
        ${next ? `<p class="small">⚡ Next: <b>${esc(next.title)}</b>, ${T.rel(next.start, now())} ${T.timeShort(next.start)}</p>` : ''}
        ${undoSnap ? `<div class="row end"><button class="btn small ghost" data-action="undo">Undo this change</button></div>` : ''}
      </section>`;
  }

  function checkinCards() {
    return state.checkins.slice(-2).map((c) => {
      const moved = state.plan.find((s) => s.unitId === c.unitId);
      return `
        <section class="card checkin">
          <div class="eyebrow">Check-in</div>
          <p>Did you finish <b>${esc(c.title)}</b>? It was planned for ${T.rel(c.start, now()).toLowerCase()} ${T.range(c.start, c.end)}.</p>
          <p class="muted small">${moved ? `In case you didn't, I've already moved it to ${T.rel(moved.start, now())} ${T.timeShort(moved.start)}.` : "In case you didn't, it's back in your queue."}</p>
          <div class="row"><button class="btn small primary" data-action="checkinDone" data-id="${c.id}">✓ Yes, done</button><button class="btn small" data-action="checkinNo" data-id="${c.id}">Not yet</button></div>
        </section>`;
    }).join('');
  }

  function focusCard() {
    const n = now();
    const active = state.active ? state.plan.find((s) => s.id === state.active.sessionId) : null;
    const next = active || E.nextSession(state.plan, n);
    const pendingTasks = state.tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress');
    if (!next) {
      return `<section class="focus empty"><div class="focus-label">⚡ What to do next</div>
        <h2>${pendingTasks.length ? 'Nothing fits right now' : "You're all clear 🎉"}</h2>
        <p>${pendingTasks.length ? 'Some tasks need a deadline or more time — check the notes below.' : 'No pending tasks. Tap 🧠 whenever something new lands on your plate.'}</p></section>`;
    }
    const task = taskById(next.taskId);
    const [main, part] = next.title.split(' — ');
    const nowFixed = E.currentFixed(state, n);
    const beforeNext = E.occurrences(state, T.dayStart(n)).find((o) => !o.soft && o.start > n && o.start < next.start);
    const startsNow = next.start <= n + 15 * T.MIN;
    const why = E.explain(state, state.plan, next, n);
    const sessionTag = next.sessions > 1 ? `<span class="chip">Session ${next.session}/${next.sessions}</span>` : '';
    return `
      <section class="focus ${active ? 'active' : ''}" aria-label="What to do next">
        <div class="focus-label">${active ? '<span class="pulse"></span> In progress' : '⚡ What to do next'}</div>
        ${nowFixed && !active ? `<div class="focus-now">Right now: ${esc(nowFixed.title)} until ${T.timeShort(nowFixed.end)}</div>` : ''}
        <h2>${!active && startsNow ? 'Start ' : ''}${esc(main)}</h2>
        ${part ? `<div class="focus-part">— ${esc(part)}</div>` : ''}
        <div class="focus-time">🕐 ${T.rel(next.start, n)}, ${T.range(next.start, next.end)} <span class="muted-on-dark">(${T.dur(next.mins)})</span></div>
        <div class="focus-tags">${task && task.context ? `<span class="chip">${esc(task.context)}</span>` : ''}${task ? priChip(task.priority) : ''}${sessionTag}${task && task.isAiEstimate ? estChip() : ''}</div>
        ${beforeNext && !active ? `<div class="focus-before">Before that: ${ICON.lock} ${esc(beforeNext.title)} · ${T.range(beforeNext.start, beforeNext.end)}</div>` : ''}
        ${why ? `<div class="why"><b>💡 Why this?</b> ${esc(why)}</div>` : ''}
        ${active ? `
          <div class="timer-row">⏱ <span id="focus-timer">00:00</span> <span class="muted-on-dark small">since you started</span></div>
          <div class="focus-actions"><button class="btn primary" data-action="done" data-id="${next.id}">✓ Mark done</button><button class="btn on-dark" data-action="snooze" data-id="${next.id}">Didn't finish</button></div>`
        : `
          <div class="focus-actions">
            <button class="btn primary" data-action="start" data-id="${next.id}">▶ Start task</button>
            <button class="btn on-dark" data-action="done" data-id="${next.id}">✓ Done</button>
            <button class="btn on-dark" data-action="snooze" data-id="${next.id}" title="Push this to your next open block">Snooze</button>
          </div>`}
      </section>`;
  }

  function attentionBlock() {
    const out = [];
    for (const id of state.needsDeadline || []) {
      const t = taskById(id);
      if (!t) continue;
      out.push(`
        <section class="card attention">
          <b>📅 "${esc(t.title)}" needs a deadline</b>
          <p class="small muted">I won't guess it. Add the date and I'll fit it in.</p>
          <div class="row"><input type="datetime-local" id="dl-${t.id}" aria-label="Deadline for ${esc(t.title)}"><button class="btn small primary" data-action="setDeadline" data-id="${t.id}">Schedule it</button></div>
        </section>`);
    }
    const unsched = state.unscheduled || [];
    if (unsched.length) {
      const crit = (state.alerts || []).find((a) => a.level === 'CRITICAL');
      const lows = unsched.filter((u) => (taskById(u.taskId) || {}).priority === 'low');
      out.push(`
        <section class="card conflict">
          <b>⚠️ Not everything fits</b>
          ${crit ? `<p class="small">${esc(crit.message)}</p>` : ''}
          <ul class="changes">${unsched.map((u) => `<li><b>${esc(u.title)}</b> · ${T.dur(u.mins)}${u.deadline ? ` · due ${T.short(u.deadline)}` : ''} <button class="link" data-action="openTask" data-id="${u.taskId}">Adjust</button></li>`).join('')}</ul>
          <p class="small"><b>Options</b></p>
          <ul class="small options">
            <li>Shorten a task's scope (tap Adjust → time needed)</li>
            <li>Check if a deadline can move, then update it</li>
            ${lows.length ? `<li>Defer low-priority work like "${esc(lows[0].title)}"</li>` : ''}
            <li>Free up time by cancelling or moving a commitment you control</li>
          </ul>
          <p class="muted small">Tempo won't squeeze work into time you don't have or push it past a deadline.</p>
        </section>`);
    }
    const warns = (state.alerts || []).filter((a) => a.level === 'WARNING' && !/needs a deadline|waiting on/.test(a.message));
    if (warns.length) out.push(`<section class="card attention">${warns.map((w) => `<p class="small">⚠️ ${esc(w.message)}</p>`).join('')}</section>`);
    return out.join('');
  }

  function fitCard() {
    const cap = E.capacity(state, now());
    const short = cap.required > cap.free;
    const pct = cap.free ? Math.min(100, Math.round((cap.required / cap.free) * 100)) : 100;
    return `
      <section class="card fit">
        <div class="fit-head"><b>Does it all fit?</b><span class="fit-verdict ${short ? 'bad' : 'good'}">${short ? `${T.dur(cap.required - cap.free)} short` : 'Yes ✓'}</span></div>
        <div class="bar" role="img" aria-label="${T.dur(cap.required)} of work against ${T.dur(cap.free)} of open time"><span style="width:${pct}%"></span></div>
        <div class="fit-legend small"><span><b>${T.dur(cap.required)}</b> of work due by ${T.DAY_SHORT[T.dow(cap.until)]}</span><span><b>${approx(cap.free)}</b> open time left</span></div>
      </section>`;
  }

  // -------------------------------------------------------------- timeline --
  function timeline(dayMs) {
    const n = now();
    const b = state.baseline;
    const items = [];
    for (const o of E.occurrences(state, dayMs)) items.push({ kind: o.kind, fixed: !o.soft, soft: o.soft, title: o.title, start: o.start, end: o.end, mode: o.mode, occ: o });
    for (const s of state.plan.filter((x) => T.dayStart(x.start) === dayMs)) items.push({ kind: 'task', title: s.title, start: s.start, end: s.end, session: s });
    for (const h of state.history.filter((x) => T.dayStart(x.start) === dayMs)) items.push({ kind: 'done', title: h.title, start: h.start, end: h.end, taskId: h.taskId });
    for (const c of state.checkins.filter((x) => T.dayStart(x.start) === dayMs)) items.push({ kind: 'missed', title: c.title, start: c.start, end: c.end });
    // Open gaps worth knowing about.
    let free = E.freeSlots(state, Math.max(n, T.at(dayMs, b.dayStart)), T.at(dayMs, b.dayEnd));
    for (const s of state.plan) free = free.flatMap((f) => (s.end + 15 * T.MIN <= f.start || s.start - 15 * T.MIN >= f.end) ? [f]
      : [{ start: f.start, end: s.start - 15 * T.MIN }, { start: s.end + 15 * T.MIN, end: f.end }].filter((x) => x.end - x.start >= 45 * T.MIN));
    for (const f of free) if (f.end - f.start >= 45 * T.MIN) items.push({ kind: 'free', title: 'Open time', start: f.start, end: f.end });
    items.sort((a, c) => a.start - c.start || (a.kind === 'done' ? -1 : 0));
    if (!items.length) return '<p class="muted empty-tl">Nothing on this day.</p>';

    const isToday = dayMs === T.dayStart(n);
    let nowPlaced = !isToday;
    const rows = [];
    for (const it of items) {
      if (!nowPlaced && it.start > n) { rows.push(`<div class="tl-now"><span>Now · ${T.time(n)}</span></div>`); nowPlaced = true; }
      rows.push(tlRow(it, n));
    }
    if (!nowPlaced) rows.push(`<div class="tl-now"><span>Now · ${T.time(n)}</span></div>`);
    return `<div class="timeline">${rows.join('')}</div>`;
  }

  function tlRow(it, n) {
    const past = it.end <= n && it.kind !== 'done';
    const current = it.start <= n && n < it.end;
    const cls = ['tl-item', `k-${it.kind}`, it.fixed ? 'fixed' : '', past ? 'past' : '', current ? 'current' : ''].join(' ');
    let title = esc(it.title), meta = T.range(it.start, it.end), action = '', icon = '';
    if (it.kind === 'class') { icon = ICON.lock; meta += ` · Class · ${it.mode === 'FTF' ? 'Face-to-face' : 'Online'}`; }
    else if (it.fixed) { icon = ICON.lock; meta += it.occ.source === 'temporary' ? ' · One-time' : ' · Weekly'; }
    if (it.fixed) action = `data-action="openFixed" data-id="${esc(it.occ.id)}" data-day="${T.dayStart(it.start)}"`;
    if (it.kind === 'task') {
      const t = taskById(it.session.taskId);
      action = `data-action="openTask" data-id="${it.session.taskId}"`;
      meta += ` · ${T.dur(it.session.mins)}`;
      if (it.session.sessions > 1) meta += ` · part ${it.session.session}/${it.session.sessions}`;
      icon = '📝';
      if (state.active && state.active.sessionId === it.session.id) title += ' <span class="chip live">In progress</span>';
      if (t) title += ' ' + priChip(t.priority);
    }
    if (it.kind === 'done') { icon = '✅'; meta = it.start === it.end ? `Completed · ${T.time(it.start)}` : `${T.range(it.start, it.end)} · Done`; }
    if (it.kind === 'missed') { icon = '↪'; meta += ' · Not marked done — moved'; }
    if (it.kind === 'free') { meta = `${T.range(it.start, it.end)} · ${T.dur((it.end - it.start) / T.MIN)} free`; }
    if (it.kind === 'commute') icon = '🚌';
    if (it.kind === 'lunch') icon = '🍽';
    if (it.kind === 'routine') icon = '☀️';
    return `<div class="${cls}"><div class="tl-time">${T.timeShort(it.start)}</div>
      <${action ? 'button' : 'div'} class="tl-card" ${action}><div class="tl-title">${icon ? `<span class="tl-icon">${icon}</span>` : ''}<span>${title}</span>${current ? '<span class="chip now">Now</span>' : ''}</div><div class="tl-meta">${meta}</div></${action ? 'button' : 'div'}></div>`;
  }

  // ------------------------------------------------------------------ WEEK --
  function weekView() {
    const n = now();
    const today = T.dayStart(n);
    const sel = ui.weekDay != null && ui.weekDay >= today ? ui.weekDay : today;
    const days = Array.from({ length: 7 }, (_, i) => today + i * T.DAY);
    const b = state.baseline;
    const stats = days.map((d) => {
      const planned = state.plan.filter((s) => T.dayStart(s.start) === d).reduce((a, s) => a + s.mins, 0);
      const free = E.freeSlots(state, Math.max(n, T.at(d, b.dayStart)), T.at(d, b.dayEnd)).reduce((a, s) => a + (s.end - s.start) / T.MIN, 0);
      return { d, planned, free };
    });
    const cap = E.capacity(state, n, today + 7 * T.DAY);
    return `
      <header class="home-head"><div class="eyebrow">Next 7 days</div><h1>Overview</h1></header>
      <section class="card fit">
        <div class="fit-head"><b>Available vs. required</b><span class="fit-verdict ${cap.required > cap.free ? 'bad' : 'good'}">${cap.required > cap.free ? 'Over capacity' : 'Fits'}</span></div>
        <p class="small">You have <b>${approx(cap.free)}</b> of usable time in the next 7 days and <b>${T.dur(cap.required)}</b> of tasks due in that window.</p>
      </section>
      <div class="daystrip" role="tablist">
        ${stats.map((s) => {
          const load = s.planned + s.free ? Math.round((s.planned / (s.planned + s.free)) * 100) : 0;
          return `<button class="daychip ${s.d === sel ? 'on' : ''}" data-action="pickDay" data-day="${s.d}" role="tab" aria-selected="${s.d === sel}">
            <span>${s.d === today ? 'Today' : T.DAY_SHORT[T.dow(s.d)]}</span><b>${T.parts(s.d).d}</b>
            <i class="load" style="--load:${load}%"></i><small>${s.planned ? T.dur(s.planned) : '—'}</small></button>`;
        }).join('')}
      </div>
      <section class="section"><div class="section-head"><h2>${T.date(sel)}</h2></div>${timeline(sel)}</section>`;
  }

  // ----------------------------------------------------------------- TASKS --
  function tasksView() {
    const n = now();
    const open = state.tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress');
    const unschedIds = new Set((state.unscheduled || []).map((u) => u.taskId));
    const attention = open.filter((t) => t.deadline == null || unschedIds.has(t.id) || t.deadline <= n);
    const upcoming = open.filter((t) => !attention.includes(t)).sort((a, b) => a.deadline - b.deadline);
    const done = state.tasks.filter((t) => t.status === 'done');
    return `
      <header class="home-head"><div class="eyebrow">${open.length} open · ${done.length} done</div><h1>Tasks</h1></header>
      <button class="btn block" data-action="newTask">+ Add a task manually</button>
      ${attention.length ? `<h2 class="list-h">Needs attention</h2>${attention.map(taskCard).join('')}` : ''}
      ${upcoming.length ? `<h2 class="list-h">Up next</h2>${upcoming.map(taskCard).join('')}` : ''}
      ${!open.length ? '<p class="muted">No open tasks. Tap 🧠 to add one.</p>' : ''}
      ${done.length ? `<details class="done-list"><summary>Completed (${done.length})</summary>${done.map(taskCard).join('')}</details>` : ''}`;
  }

  function taskCard(t) {
    const n = now();
    const total = S.taskTotal(t), rem = S.taskRemaining(t);
    const next = state.plan.filter((s) => s.taskId === t.id).sort((a, b) => a.start - b.start)[0];
    const unsched = (state.unscheduled || []).some((u) => u.taskId === t.id);
    const isExam = t.type === 'exam' || t.type === 'quiz';
    const status = t.status === 'done' ? 'Done' : t.status === 'in_progress' ? 'In progress' : t.deadline == null ? 'Needs deadline' : unsched ? "Doesn't fit yet" : 'Scheduled';
    return `
      <button class="task-card ${t.status}" data-action="openTask" data-id="${t.id}">
        <div class="tc-head"><h3>📝 ${esc(t.title)}</h3>${t.status === 'done' ? '<span class="chip">Done</span>' : priChip(t.priority)}</div>
        ${t.context ? `<div class="muted small">${esc(t.context)}</div>` : ''}
        <dl class="tc-meta">
          <div><dt>${isExam ? 'Exam' : 'Due'}</dt><dd class="${t.deadline != null && t.deadline <= n && t.status !== 'done' ? 'overdue' : ''}">${t.deadline != null ? (isExam ? T.short(t.deadline) : `${T.short(t.deadline)}, ${T.time(t.deadline)}`) : '— not set'}</dd></div>
          <div><dt>Est</dt><dd>${T.dur(total)}${t.isAiEstimate ? ' ' + estChip() : ''}${rem < total && t.status !== 'done' ? ` <span class="muted">(${T.dur(rem)} left)</span>` : ''}</dd></div>
          <div><dt>Status</dt><dd>${status}${t.doFirst ? ' · ⭐ Do first' : ''}</dd></div>
          ${next ? `<div><dt>Next</dt><dd>${T.rel(next.start, n)}, ${T.timeShort(next.start)}</dd></div>` : ''}
        </dl>
        ${t.parts && t.parts.length ? `<ul class="subtasks">${t.parts.map((p) => `<li>${p.done ? '✅' : '🔲'} ${esc(p.title)} <span class="muted">${T.dur(p.mins)}</span></li>`).join('')}</ul>` : ''}
      </button>`;
  }

  // --------------------------------------------------------------- PROFILE --
  function profileView() {
    const b = state.baseline;
    const timeOpts = (sel, from, to) => {
      let o = '';
      for (let m = from; m <= to; m += 30) { const hm = T.minsToHm(m); o += `<option value="${hm}" ${hm === sel ? 'selected' : ''}>${T.hmLabel(hm)}</option>`; }
      return o;
    };
    const classes = b.classes.slice().sort((a, c) => ((a.day + 6) % 7) - ((c.day + 6) % 7) || T.hmToMins(a.start) - T.hmToMins(c.start));
    const upcomingEvents = state.events.filter((e) => e.end > now()).sort((a, c) => a.start - c.start);
    return `
      <header class="home-head"><div class="eyebrow">Profile & settings</div><h1>${esc(state.user.name || 'You')}</h1></header>
      <section class="card settings">
        <h2>Your day</h2>
        <div class="grid2">
          <label>Day starts<select data-setting="dayStart">${timeOpts(b.dayStart, 240, 600)}</select></label>
          <label>Latest scheduling<select data-setting="dayEnd">${timeOpts(b.dayEnd, 1140, 1410)}</select></label>
          <label>Commute (FTF days)<select data-setting="commuteMins" data-type="int">${[0, 15, 30, 45, 60, 75, 90, 120].map((m) => `<option value="${m}" ${m === b.commuteMins ? 'selected' : ''}>${m ? T.dur(m) : 'None'}</option>`).join('')}</select></label>
          <label>Morning routine<select data-setting="routineMins" data-type="int">${[0, 15, 30, 45, 60].map((m) => `<option value="${m}" ${m === b.routineMins ? 'selected' : ''}>${m ? T.dur(m) : 'None'}</option>`).join('')}</select></label>
        </div>
        <label class="toggle"><input type="checkbox" data-setting="protectLunch" ${b.protectLunch ? 'checked' : ''}> Protect a lunch hour (12–1 PM) when free</label>
        <p class="muted small">Tempo keeps a ${b.bufferMins}-minute transition buffer around every task.</p>
      </section>

      <section class="card settings">
        <h2>Class schedule <span class="muted small">(fixed)</span></h2>
        <ul class="plain">${classes.map((c) => `<li><span><b>${esc(c.title)}</b> · ${T.DAY_SHORT[c.day]} ${T.hmLabel(c.start)}–${T.hmLabel(c.end)} · ${c.mode}</span><button class="icon-btn" aria-label="Remove ${esc(c.title)}" data-action="removeClass" data-id="${c.id}">${ICON.close}</button></li>`).join('') || '<li class="muted">No classes.</li>'}</ul>
        <details><summary>+ Add a class</summary>
          <div class="grid2 add-form" id="add-class">
            <label>Subject<input name="title" placeholder="e.g. IT 302"></label>
            <label>Day<select name="day">${[1, 2, 3, 4, 5, 6, 0].map((d) => `<option value="${d}">${T.DAY_NAMES[d]}</option>`).join('')}</select></label>
            <label>Start<input type="time" name="start" value="08:00"></label>
            <label>End<input type="time" name="end" value="10:00"></label>
            <label>Mode<select name="mode"><option>FTF</option><option>Online</option></select></label>
            <button class="btn small primary" data-action="addClass">Add class</button>
          </div>
        </details>
      </section>

      <section class="card settings">
        <h2>Recurring commitments</h2>
        <ul class="plain">${b.recurring.map((r) => `<li><span><b>${esc(r.title)}</b> · every ${T.DAY_NAMES[r.day]} ${T.hmLabel(r.start)}–${T.hmLabel(r.end)}</span><button class="icon-btn" aria-label="Remove ${esc(r.title)}" data-action="removeRecurring" data-id="${r.id}">${ICON.close}</button></li>`).join('') || '<li class="muted">None yet.</li>'}</ul>
        <details><summary>+ Add a weekly commitment</summary>
          <div class="grid2 add-form" id="add-rec">
            <label>Name<input name="title" placeholder="e.g. Org meeting"></label>
            <label>Type<select name="kind"><option value="work">Work</option><option value="org">Organization</option><option value="event">Other</option></select></label>
            <label>Day<select name="day">${[1, 2, 3, 4, 5, 6, 0].map((d) => `<option value="${d}">${T.DAY_NAMES[d]}</option>`).join('')}</select></label>
            <label>Start<input type="time" name="start" value="17:00"></label>
            <label>End<input type="time" name="end" value="19:00"></label>
            <button class="btn small primary" data-action="addRecurringForm">Add</button>
          </div>
        </details>
        ${upcomingEvents.length ? `<h3>One-time commitments</h3><ul class="plain">${upcomingEvents.map((e) => `<li><span><b>${esc(e.title)}</b> · ${T.short(e.start)} ${T.range(e.start, e.end)}</span><button class="icon-btn" aria-label="Remove ${esc(e.title)}" data-action="removeEvent" data-id="${e.id}">${ICON.close}</button></li>`).join('')}</ul>` : ''}
        ${state.cancellations.length ? `<h3>Cancelled sessions</h3><ul class="plain">${state.cancellations.map((c) => `<li><span>${esc(cancellationLabel(c))}</span><button class="btn small ghost" data-action="restoreOcc" data-id="${esc(c)}">Restore</button></li>`).join('')}</ul>` : ''}
      </section>

      <section class="card settings">
        <h2>Connected platforms</h2>
        <div class="integrations">${D.INTEGRATIONS.map(integrationRow).join('')}</div>
        <p class="muted small">Demo build: connections are simulated.</p>
      </section>

      <section class="card settings">
        <h2>Under the hood</h2>
        <p class="small muted">Every extraction and replan produces the JSON contract from prompt.md (Phase 1–3).</p>
        <button class="btn block" data-action="openEngine">View engine output (JSON)</button>
        <div class="row">
          <button class="btn small ghost" data-action="loadDemoConfirm">Reload Alex demo</button>
          <button class="btn small ghost danger" data-action="resetAll">Reset & restart setup</button>
        </div>
      </section>`;
  }
  function cancellationLabel(id) {
    const [ref, date] = id.split('@');
    const [kind, refId] = ref.split(':');
    const src = kind === 'cls' ? state.baseline.classes.find((c) => c.id === refId) : state.baseline.recurring.find((r) => r.id === refId);
    return `${src ? src.title : 'Commitment'} on ${T.short(T.fromISO(date + 'T00:00'))}`;
  }

  // ================================================================ SHEETS ==
  function sheet() {
    const sh = ui.sheet;
    const inner = { dump: dumpSheet, task: taskSheet, fixed: fixedSheet, clock: clockSheet, engine: engineSheet }[sh.type]();
    return `<div class="sheet-backdrop" data-action="backdrop"><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(sh.type)}">
      <div class="sheet-grip"></div><button class="icon-btn sheet-close" data-action="closeSheet" aria-label="Close">${ICON.close}</button>${inner}</div></div>`;
  }

  // ---------- Brain dump (capture + review) ----------
  function dumpSheet() {
    const sh = ui.sheet;
    if (sh.mode === 'review') return dumpReview();
    return `
      <h2>Brain dump 🧠</h2>
      <p class="muted small">New task, schedule change, cancelled meeting, didn't finish something? Say it or type it.</p>
      <div class="tabs"><button class="${sh.input !== 'form' ? 'on' : ''}" data-action="dumpInput" data-v="text">Speak / type</button><button class="${sh.input === 'form' ? 'on' : ''}" data-action="dumpInput" data-v="form">Manual entry</button></div>
      ${sh.input === 'form' ? manualForm() : `
        ${micButton('sheet.text')}
        <textarea id="dump-text" rows="4" data-bind="sheet.text" placeholder="e.g. My boss asked me to cover a shift from 5 to 9 PM tonight">${esc(sh.text || '')}</textarea>
        <button class="btn primary block" data-action="processDump">Update my plan</button>
        <div class="scenarios"><p class="muted small">Try a demo scenario:</p><div class="chips">${D.SCENARIOS.map((s, i) => `<button class="chip-btn" data-action="scenario" data-i="${i}">${esc(s.label)}</button>`).join('')}</div></div>`}`;
  }

  function manualForm() {
    const f = ui.sheet.form || (ui.sheet.form = { title: '', deadline: null, durationMins: 60, priority: 'medium', notes: '' });
    return `
      <div class="form">
        <label>Task name<input value="${esc(f.title)}" data-bind="sheet.form.title" placeholder="e.g. ADET report"></label>
        <label>Deadline<input type="datetime-local" value="${f.deadline != null ? T.toInput(f.deadline) : ''}" data-bind="sheet.form.deadline" data-type="dt"></label>
        <label>Estimated duration (hours)<input type="number" min="0.25" step="0.25" value="${hrs(f.durationMins)}" data-bind="sheet.form.durationMins" data-type="hrs"></label>
        <label>Priority (optional)<select data-bind="sheet.form.priority">${['high', 'medium', 'low'].map((p) => `<option value="${p}" ${p === f.priority ? 'selected' : ''}>${PRI_LABEL[p]}</option>`).join('')}</select></label>
        <label>Notes (optional)<textarea rows="2" data-bind="sheet.form.notes">${esc(f.notes)}</textarea></label>
        <button class="btn primary block" data-action="saveManual">Add to plan</button>
      </div>`;
  }

  function dumpReview() {
    const sh = ui.sheet;
    const blocking = dumpBlocking();
    const actionable = sh.items.some((it) => it.include && !['stress', 'unclear', 'duplicate', 'next', 'refuse'].includes(it.kind)) ||
      sh.items.some((it) => it.kind === 'refuse' && it.addAsTask);
    return `
      <h2>Here's what changed</h2>
      <blockquote class="quote">“${esc(sh.text)}”</blockquote>
      <div class="review-list">${sh.items.map((it, n) => reviewItem(it, n)).join('')}</div>
      ${blocking ? `<p class="small warn-text">${esc(blocking)}</p>` : ''}
      <div class="row end">
        <button class="btn ghost" data-action="dumpEdit">Edit text</button>
        ${actionable ? `<button class="btn primary" data-action="applyDump" ${blocking ? 'disabled' : ''}>Apply to my plan</button>` : '<button class="btn primary" data-action="closeSheet">Done</button>'}
      </div>`;
  }

  function dumpBlocking() {
    for (const it of ui.sheet.items) {
      if (!it.include) continue;
      if (it.kind === 'event' && it.conflicts.hard.length && !it.resolution) return 'Choose how to handle the conflict first.';
      if (it.kind === 'recurring' && it.conflicts.length && !it.resolution) return 'Choose how to handle the conflict first.';
      if (it.kind === 'contradiction' && !it.answer) return 'Answer the question above first.';
      if (it.kind === 'refuse' && it.addAsTask && it.deadline == null) return 'Add a due date so I can schedule the steps.';
    }
    return '';
  }

  function reviewItem(it, n) {
    const p = `sheet.items.${n}`;
    const n0 = now();
    switch (it.kind) {
      case 'task': return taskReviewCard(it, p, n, 'sheet');
      case 'event': {
        const e = it.event;
        const hard = it.conflicts.hard;
        const range = `${T.short(e.start)}, ${T.range(e.start, e.end)}`;
        return `
          <article class="review-card">
            <div class="rc-kind">${ICON.lock} New fixed commitment</div>
            <div class="rc-head"><input class="rc-title" value="${esc(e.title)}" data-bind="${p}.event.title" aria-label="Commitment name"></div>
            <p class="small"><b>${range}</b>${it.durationEstimated ? ' <span class="chip est">1 hr assumed</span>' : ''}</p>
            <p class="small muted">${it.makeRecurring ? `Weekly — every ${T.DAY_NAMES[T.dow(e.start)]} from now on.` : `One-time — only affects ${T.short(e.start)}. Your regular schedule stays the same.`}
              <button class="link" data-action="toggleRecurring" data-n="${n}">${it.makeRecurring ? 'Make it one-time' : 'This happens every week'}</button></p>
            ${hard.length ? `<div class="clarify conflict">
              <p>⚠️ <b>Conflict:</b> you already have ${hard.map((o) => `<b>${esc(o.title)}</b> (${T.range(o.start, o.end)})`).join(', ')}. ${esc(e.title)} overlaps it. Which one takes priority?</p>
              <div class="chips">
                <button class="chip-btn ${it.resolution === 'keep' ? 'on' : ''}" data-action="resolve" data-n="${n}" data-v="keep">Keep ${esc(hard[0].title)}</button>
                <button class="chip-btn ${it.resolution === 'prioritize' ? 'on' : ''}" data-action="resolve" data-n="${n}" data-v="prioritize">Go to ${esc(e.title)} instead</button>
                <button class="chip-btn ${it.resolution === 'both' ? 'on' : ''}" data-action="resolve" data-n="${n}" data-v="both">Keep both (I'll sort it out)</button>
              </div>
              <p class="muted small">Tempo never skips a class or shift on its own; it only does that if you choose it here.</p></div>` : ''}
            ${it.conflicts.soft.length ? `<p class="small muted">Note: overlaps your ${it.conflicts.soft.map((o) => o.title.toLowerCase()).join(' and ')}.</p>` : ''}
          </article>`;
      }
      case 'recurring': {
        const e = it.event;
        return `
          <article class="review-card">
            <div class="rc-kind">${ICON.lock} New weekly commitment</div>
            <p><b>${esc(e.title)}</b> · every ${e.days.map((d) => T.DAY_NAMES[d]).join(' & ')}, ${T.hmLabel(e.start)}–${T.hmLabel(e.end)}</p>
            <p class="small muted">Added to your baseline, so all future weeks plan around it.</p>
            ${it.conflicts.length ? `<div class="clarify conflict"><p>⚠️ Overlaps ${it.conflicts.map((c) => `<b>${esc(c.title)}</b> on ${c.dayName}s (${T.hmLabel(c.start)}–${T.hmLabel(c.end)})`).join(', ')}.</p>
              <div class="chips"><button class="chip-btn ${it.resolution === 'both' ? 'on' : ''}" data-action="resolve" data-n="${n}" data-v="both">Add anyway</button><button class="chip-btn ${it.resolution === 'keep' ? 'on' : ''}" data-action="resolve" data-n="${n}" data-v="keep">Don't add</button></div></div>` : ''}
          </article>`;
      }
      case 'cancel_occurrence':
        return `<article class="review-card"><div class="rc-kind">Cancelled</div>${it.occurrences.map((o) => `<p><b>${esc(o.title)}</b> · ${T.short(o.start)}, ${T.range(o.start, o.end)}</p>`).join('')}
          <p class="small muted">That frees ${T.dur(it.occurrences.reduce((a, o) => a + (o.end - o.start) / T.MIN, 0))}. Only this date changes; your weekly schedule stays the same.</p></article>`;
      case 'cancel_task': return `<article class="review-card"><div class="rc-kind">Remove task</div><p><b>${esc(it.title)}</b> will be removed from your plan.</p></article>`;
      case 'complete': return `<article class="review-card"><div class="rc-kind">Completed</div><p><b>${esc(it.title)}</b> → marked done ✓</p></article>`;
      case 'missed': return `<article class="review-card"><div class="rc-kind">Didn't finish</div><p>No problem. The remaining work on <b>${esc(it.title)}</b> moves to your next open block.</p></article>`;
      case 'deadline_change': return `<article class="review-card"><div class="rc-kind">Deadline ${it.oldDeadline == null ? 'set' : 'changed'}</div><p><b>${esc(it.title)}</b>: ${it.oldDeadline != null ? `<s>${T.short(it.oldDeadline)}</s> → ` : ''}<b>${T.short(it.deadline)}</b></p></article>`;
      case 'contradiction':
        return `<article class="review-card"><div class="rc-kind">Quick question</div><p>❓ ${esc(it.question)}</p>
          <div class="chips"><button class="chip-btn ${it.answer === 'update' ? 'on' : ''}" data-action="answer" data-n="${n}" data-v="update">It changed to ${T.short(it.deadline)}</button>
          <button class="chip-btn ${it.answer === 'keep' ? 'on' : ''}" data-action="answer" data-n="${n}" data-v="keep">Keep ${T.short(it.oldDeadline)}</button></div></article>`;
      case 'duplicate': {
        const t = taskById(it.taskId);
        return `<article class="review-card info"><p>“${esc(it.title)}” is already in your plan${t && t.deadline ? ` (due ${T.short(t.deadline)})` : ''}. Nothing to change.</p></article>`;
      }
      case 'refuse':
        return `<article class="review-card info">
          <p>I can't write your ${esc(it.noun)}, since that's your work to own. But I can help you get it done without the overwhelm. Here's how I'd break it down:</p>
          <ol class="steps">${it.breakdown.map(([s, m]) => `<li>📝 ${esc(s)} <span class="muted">(${m} min)</span></li>`).join('')}</ol>
          <label class="toggle"><input type="checkbox" ${it.addAsTask ? 'checked' : ''} data-bind="${p}.addAsTask" data-rerender> Schedule these steps into my free time</label>
          ${it.addAsTask ? `<label class="small">When is it due?<input type="datetime-local" value="${it.deadline != null ? T.toInput(it.deadline) : ''}" data-bind="${p}.deadline" data-type="dt" data-rerender></label>` : ''}
        </article>`;
      case 'stress': {
        const cap = E.capacity(state, n0);
        const due = state.tasks.filter((t) => t.status !== 'done' && t.status !== 'cancelled' && t.deadline != null && t.deadline <= cap.until).length;
        return `<article class="review-card info"><p>Let's look at your schedule and see what we can do. You have <b>${due} task${due === 1 ? '' : 's'}</b> due this week: about ${T.dur(cap.required)} of work, with ${approx(cap.free)} of open time.</p>
          <p>Want me to show you just the most urgent thing first?</p><button class="btn small primary" data-action="focusOnly">Show me just my next step</button></article>`;
      }
      case 'next': return `<article class="review-card info"><p>Your next step is always on the Focus Card at the top of Home.</p><button class="btn small primary" data-action="focusOnly">Show me</button></article>`;
      default:
        return `<article class="review-card info"><p>${esc(P.unclearQuestion(it))}</p>
          <div class="chips"><button class="chip-btn" data-action="template" data-v="I wasn't able to finish ">I missed a task</button>
          <button class="chip-btn" data-action="template" data-v="New assignment: ">New assignment</button>
          <button class="chip-btn" data-action="template" data-v="I have to ">Schedule change</button>
          <button class="chip-btn" data-action="template" data-v="Cancelled: ">Something got cancelled</button></div></article>`;
    }
  }

  function intentToItem(i) {
    switch (i.type) {
      case 'task': return { kind: 'task', include: true, task: Object.assign({}, i.task), clarification: i.clarification, ambiguous: i.ambiguous };
      case 'event':
        if (i.recurring) return { kind: 'recurring', include: true, event: i.event, conflicts: E.recurringConflicts(state, i.event), resolution: null };
        return { kind: 'event', include: true, event: Object.assign({}, i.event), conflicts: E.eventConflicts(state, i.event), resolution: null, makeRecurring: false, durationEstimated: i.durationEstimated };
      case 'cancel_occurrence': return { kind: 'cancel_occurrence', include: true, occurrences: i.occurrences };
      case 'refuse': return { kind: 'refuse', include: true, noun: i.noun, subject: i.subject, breakdown: i.breakdown, addAsTask: false, deadline: null };
      default: return Object.assign({ kind: i.type, include: true }, i);
    }
  }

  function processDump(text) {
    const parsed = P.parse(text, S.parseContext(state));
    S.log(state, 'Phase 2 · Brain dump', text, P.toPhase2(parsed));
    const items = parsed.intents.map(intentToItem);
    // Record the clarification/conflict outcome as a Phase 3 response, as the LLM contract would.
    const conflict = items.find((it) => it.kind === 'event' && it.conflicts.hard.length);
    const question = items.map((it) => it.kind === 'contradiction' ? it.question : it.kind === 'task' && it.clarification ? it.clarification
      : it.kind === 'unclear' ? P.unclearQuestion(it) : null).filter(Boolean);
    if (conflict || question.length) {
      const status = conflict ? 'CONFLICT' : 'CLARIFICATION_NEEDED';
      const clar = conflict ? `"${conflict.event.title}" overlaps ${conflict.conflicts.hard.map((o) => o.title).join(', ')}. Which one takes priority?` : question.join(' ');
      S.log(state, 'Phase 3 · Dashboard & replanning', text, E.phase3({ status, alerts: [], clarification: clar, next: E.nextSession(state.plan, now()), changes: [], unscheduled: [] }));
    }
    ui.sheet = { type: 'dump', mode: 'review', text, items };
  }

  function applyDump() {
    const sh = ui.sheet;
    snapshot('Brain dump');
    const triggers = [], notes = [];
    for (const it of sh.items) {
      if (!it.include) continue;
      const t = it.taskId ? taskById(it.taskId) : null;
      switch (it.kind) {
        case 'task': {
          const task = S.makeTask(state, it.task);
          state.tasks.push(task);
          triggers.push(`New task: ${task.title}`);
          if (task.deadline == null) notes.push(`"${task.title}" is saved but won't be scheduled until it has a deadline.`);
          break;
        }
        case 'event': {
          const e = it.event;
          if (it.resolution === 'keep') { notes.push(`Kept ${it.conflicts.hard.map((o) => o.title).join(', ')}; didn't add ${e.title}.`); break; }
          if (it.makeRecurring) S.addRecurring(state, { title: e.title, kind: e.kind, days: [T.dow(e.start)], start: T.minsToHm(T.minsOfDay(e.start)), end: T.minsToHm(T.minsOfDay(e.end)) });
          else S.addEvent(state, e);
          if (it.resolution === 'prioritize') {
            for (const o of it.conflicts.hard) S.cancelOccurrence(state, o);
            notes.push(`As you chose, ${it.conflicts.hard.map((o) => o.title).join(', ')} is marked as skipped on ${T.short(e.start)} only.`);
          }
          triggers.push(`${it.makeRecurring ? 'Weekly' : 'Added'} ${e.title} (${T.DAY_SHORT[T.dow(e.start)]} ${T.timeShort(e.start)}–${T.timeShort(e.end)})${it.makeRecurring ? '' : ' — one-time'}`);
          break;
        }
        case 'recurring': {
          if (it.resolution === 'keep') break;
          S.addRecurring(state, it.event);
          triggers.push(`Weekly ${it.event.title} (${it.event.days.map((d) => T.DAY_SHORT[d]).join('/')} ${T.hmLabel(it.event.start)}–${T.hmLabel(it.event.end)})`);
          break;
        }
        case 'cancel_occurrence':
          for (const o of it.occurrences) S.cancelOccurrence(state, o);
          triggers.push(`Cancelled ${it.occurrences.map((o) => o.title).join(', ')} (${T.short(it.occurrences[0].start)})`);
          break;
        case 'cancel_task': if (t) { t.status = 'cancelled'; triggers.push(`Removed task: ${t.title}`); } break;
        case 'complete':
          if (t) {
            t.status = 'done';
            (t.parts || []).forEach((x) => { x.done = true; x.remainingMins = 0; });
            t.remainingMins = 0;
            state.history.push({ id: `${t.id}@${now()}`, taskId: t.id, title: t.title, start: now(), end: now(), doneAt: now() });
            triggers.push(`Completed: ${t.title}`);
          }
          break;
        case 'missed':
          if (t) {
            t.notBefore = now();
            state.checkins = state.checkins.filter((c) => c.taskId !== t.id);
            triggers.push(`Didn't finish: ${t.title}`);
          }
          break;
        case 'deadline_change': if (t) { t.deadline = it.deadline; triggers.push(`Deadline for ${t.title} → ${T.short(it.deadline)}`); } break;
        case 'contradiction':
          if (t && it.answer === 'update') { t.deadline = it.deadline; triggers.push(`Deadline for ${t.title} → ${T.short(it.deadline)}`); }
          break;
        case 'refuse':
          if (it.addAsTask && it.deadline != null) {
            const total = it.breakdown.reduce((a, [, m]) => a + m, 0);
            const task = S.makeTask(state, { title: it.subject, type: 'report', deadline: it.deadline, durationMins: total, priority: 'medium',
              parts: it.breakdown.map(([title, mins]) => ({ title, mins })) });
            state.tasks.push(task);
            triggers.push(`New task: ${task.title} (${it.breakdown.length} steps)`);
          }
          break;
        default: break;
      }
    }
    if (!triggers.length && !notes.length) { ui.sheet = null; render(); return; }
    S.replan(state, triggers.join(' · ') || 'Brain dump', { notes });
    ui.sheet = null; ui.tab = 'home'; ui.focusOnly = false;
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ---------- Task details / edit ----------
  function openTask(id) {
    const t = taskById(id);
    if (!t) return;
    ui.sheet = { type: 'task', id, d: {
      title: t.title, context: t.context, deadline: t.deadline, total: S.taskTotal(t), priority: t.priority, doFirst: !!t.doFirst,
      pinnedStart: t.pinnedStart, notes: t.notes || '', parts: t.parts.map((p) => Object.assign({}, p)), dependencies: (t.dependencies || []).slice(),
      isAiEstimate: t.isAiEstimate,
    } };
    render();
  }

  function taskSheet() {
    const sh = ui.sheet, d = sh.d, t = taskById(sh.id);
    if (!t) return '<p>Task not found.</p>';
    const sessions = state.plan.filter((s) => s.taskId === t.id);
    const others = state.tasks.filter((x) => x.id !== t.id && x.status !== 'done' && x.status !== 'cancelled');
    const p = 'sheet.d';
    return `
      <h2>Task details</h2>
      <div class="form">
        <label>Task name<input value="${esc(d.title)}" data-bind="${p}.title"></label>
        <div class="grid2">
          <label>Deadline<input type="datetime-local" value="${d.deadline != null ? T.toInput(d.deadline) : ''}" data-bind="${p}.deadline" data-type="dt"></label>
          <label>Time needed ${d.isAiEstimate ? estChip() : ''}<span class="hrs-input"><input type="number" min="0.25" step="0.25" value="${hrs(d.total)}" data-bind="${p}.total" data-type="hrs"> hrs</span></label>
          <label>Priority<select data-bind="${p}.priority">${['high', 'medium', 'low'].map((x) => `<option value="${x}" ${x === d.priority ? 'selected' : ''}>${PRI_LABEL[x]}</option>`).join('')}</select></label>
          <label>Schedule at (optional)<input type="datetime-local" value="${d.pinnedStart ? T.toInput(d.pinnedStart) : ''}" data-bind="${p}.pinnedStart" data-type="dt"></label>
        </div>
        <label class="toggle"><input type="checkbox" ${d.doFirst ? 'checked' : ''} data-bind="${p}.doFirst"> ⭐ Do this first (override Tempo's priority)</label>
        ${d.parts.length ? `<fieldset><legend>Steps</legend>${d.parts.map((x, i) => `
          <div class="part-row"><label class="toggle"><input type="checkbox" ${x.done ? 'checked' : ''} data-bind="${p}.parts.${i}.done"></label>
          <input value="${esc(x.title)}" data-bind="${p}.parts.${i}.title" aria-label="Step name"><span class="muted small nowrap">${T.dur(x.mins)}</span></div>`).join('')}</fieldset>` : ''}
        ${others.length ? `<label>Can only start after…<select data-bind="${p}.depSingle"><option value="">(no dependency)</option>${others.map((o) => `<option value="${o.id}" ${d.dependencies.includes(o.id) ? 'selected' : ''}>${esc(o.title)}</option>`).join('')}</select></label>` : ''}
        <label>Notes<textarea rows="2" data-bind="${p}.notes">${esc(d.notes)}</textarea></label>
      </div>
      ${sessions.length ? `<div class="sessions"><b class="small">Scheduled</b><ul class="plain small">${sessions.map((s) => `<li>${T.short(s.start)}, ${T.range(s.start, s.end)}${s.partId ? ' · ' + esc(s.title.split(' — ').pop()) : ''}</li>`).join('')}</ul></div>` : ''}
      <div class="row end wrap">
        ${t.status !== 'done' ? '<button class="btn ghost danger" data-action="deleteTask">Remove task</button><button class="btn ghost" data-action="completeTask">Mark whole task done</button>' : ''}
        <button class="btn primary" data-action="saveTask">Save & replan</button>
      </div>`;
  }

  function saveTask() {
    const sh = ui.sheet, d = sh.d, t = taskById(sh.id);
    snapshot('Edit task');
    const changes = [];
    if (d.title.trim() && d.title !== t.title) { t.title = d.title.trim(); changes.push('renamed'); }
    if (d.deadline !== t.deadline) { t.deadline = d.deadline; changes.push('deadline'); }
    if (d.priority !== t.priority) { t.priority = d.priority; changes.push('priority'); }
    if (d.doFirst !== !!t.doFirst) { t.doFirst = d.doFirst; changes.push(d.doFirst ? 'do first' : 'normal priority'); }
    if ((d.pinnedStart || null) !== (t.pinnedStart || null)) { t.pinnedStart = d.pinnedStart || null; changes.push('time pinned'); }
    t.notes = d.notes;
    d.parts.forEach((p, i) => {
      const tp = t.parts[i];
      tp.title = p.title;
      if (p.done && !tp.done) { tp.done = true; tp.remainingMins = 0; changes.push(`${tp.title} done`); }
      if (!p.done && tp.done) { tp.done = false; tp.remainingMins = tp.mins; }
    });
    if (d.total && d.total !== S.taskTotal(t)) { S.setDuration(t, d.total); changes.push('duration'); }
    if (d.depSingle !== undefined) t.dependencies = d.depSingle ? [d.depSingle] : [];
    if (S.taskRemaining(t) === 0) t.status = 'done';
    ui.sheet = null;
    S.replan(state, `Edited ${t.title}${changes.length ? ' (' + changes.join(', ') + ')' : ''}`);
    render();
  }

  // ---------- Fixed commitment ----------
  function fixedSheet() {
    const sh = ui.sheet;
    const o = E.occurrences(state, sh.day).find((x) => x.id === sh.id);
    if (!o) return '<p>This commitment is no longer on the schedule.</p>';
    return `
      <h2>${ICON.lock} ${esc(o.title)}</h2>
      <p><b>${T.date(o.start)}</b><br>${T.range(o.start, o.end)}${o.mode ? ` · ${o.mode === 'FTF' ? 'Face-to-face' : 'Online'}` : ''}</p>
      <p class="small muted">${o.source === 'temporary' ? 'One-time commitment.' : 'Part of your weekly baseline.'} Fixed commitments are protected: Tempo plans your tasks around them and never moves, shortens or skips them on its own.</p>
      <div class="row end wrap">
        ${o.source === 'temporary' ? `<button class="btn danger" data-action="cancelFixed">Remove this event</button>`
          : `<button class="btn" data-action="cancelFixed">It's cancelled on ${T.short(o.start)}</button>`}
      </div>`;
  }

  // ---------- Clock ----------
  function clockSheet() {
    const presets = [
      ['Mon 6:00 AM', T.make(2026, 10, 12, 6, 0)], ['Mon 10:00 AM', T.make(2026, 10, 12, 10, 0)],
      ['Mon 4:45 PM (the boss texts)', T.make(2026, 10, 12, 16, 45)], ['Tue 6:00 AM', T.make(2026, 10, 13, 6, 0)], ['Wed 10:00 AM', T.make(2026, 10, 14, 10, 0)],
    ].filter(([, ms]) => ms > now());
    return `
      <h2>Demo clock</h2>
      <p class="small muted">Tempo is stateless about time: everything is computed from this clock. Move it forward to walk through the week. Sessions that pass without "Done" become check-ins and get rescheduled.</p>
      <label>Jump to<input type="datetime-local" id="clock-input" value="${T.toInput(now())}"></label>
      <div class="row end"><button class="btn primary" data-action="setClock">Set time</button></div>
      ${presets.length ? `<p class="small"><b>Story checkpoints</b></p><div class="chips">${presets.map(([l, ms]) => `<button class="chip-btn" data-action="jump" data-ms="${ms}">${esc(l)}</button>`).join('')}</div>` : ''}`;
  }

  // ---------- Engine output ----------
  function engineSheet() {
    const log = state.engineLog;
    return `
      <h2>Engine output</h2>
      <p class="small muted">The structured JSON the engine returns for each request, following the contracts in prompt.md. Newest first.</p>
      ${log.map((e, i) => `
        <details class="log" ${i === 0 ? 'open' : ''}>
          <summary><b>${esc(e.phase)}</b> <span class="muted small">· ${T.short(e.at)} ${T.time(e.at)}</span>${e.output.status ? ` <span class="chip status-${e.output.status}">${e.output.status}</span>` : ''}</summary>
          <p class="small muted">Input: ${esc(String(e.input).slice(0, 220))}</p>
          <pre>${esc(JSON.stringify(e.output, null, 2))}</pre>
        </details>`).join('') || '<p class="muted">Nothing yet.</p>'}`;
  }

  // =============================================================== ACTIONS ==
  const A = {
    // --- onboarding
    obNext() {
      const ob = ui.ob;
      if (ob.step === 0) state.user.name = (ob.name || '').trim() || 'there';
      if (ob.step === 1) {
        state.baseline.classes = ob.classes.filter((c) => c.title.trim()).map((c) => ({ id: S.uid(state, 'c'), title: c.title.trim(), day: c.day, start: c.start, end: c.end, mode: c.mode }));
        const p1 = { extracted_commitments: state.baseline.classes.map((c) => ({ title: c.title, day_of_week: T.DAY_NAMES[c.day], start_time: c.start, end_time: c.end, type: 'fixed', mode: c.mode === 'FTF' ? 'In person' : 'Online' })), clarification_needed: null };
        S.log(state, 'Phase 1 · Schedule extraction (confirmed)', 'Student-confirmed class table', p1);
      }
      if (ob.step === 2) {
        const ls = ob.ls;
        S.applyLifestyle(state, {
          dayStart: ls.dayStart, dayEnd: ls.dayEnd, commuteMins: Number(ls.commuteMins),
          work: ls.working === 'yes' ? ls.workDays.map((d) => ({ day: d, start: ls.workStart, end: ls.workEnd })) : [],
          org: ls.org === 'yes' ? [{ day: ls.orgDay, start: ls.orgStart, end: ls.orgEnd }] : [],
        });
      }
      ob.step++;
      render();
      window.scrollTo(0, 0);
    },
    obBack() { ui.ob.step = Math.max(0, ui.ob.step - 1); render(); },
    obSet(ds) {
      const v = ds.value;
      const [obj, key] = ds.path.split('.');
      ui.ob[obj][key] = /^\d+$/.test(v) && key === 'commuteMins' ? Number(v) : v;
      render();
    },
    obToggleDay(ds) {
      const arr = ui.ob.ls[ds.path];
      const d = Number(ds.day);
      const i = arr.indexOf(d);
      if (i >= 0) arr.splice(i, 1); else arr.push(d);
      render();
    },
    obSampleCor() { ui.ob.corText = D.SAMPLE_COR_TEXT; A.obExtract(); },
    obExtract() {
      const ob = ui.ob;
      const p1 = P.parseSchedule(ob.corText);
      S.log(state, 'Phase 1 · Schedule extraction', ob.corText.slice(0, 200), p1);
      if (p1.clarification_needed) { ob.analysis = p1.clarification_needed; ob.extracted = true; render(); return; }
      ob.classes = p1.extracted_commitments.map((c) => ({ title: c.title, day: T.DAY_NAMES.indexOf(c.day_of_week), start: c.start_time, end: c.end_time, mode: c.mode === 'Online' ? 'Online' : 'FTF' }));
      ob.analysis = E.analyzeBaseline(ob.classes);
      ob.extracted = true;
      render();
    },
    obAddClass() { ui.ob.classes.push({ title: '', day: 1, start: '08:00', end: '10:00', mode: 'FTF' }); ui.ob.extracted = true; render(); },
    obRemoveClass(ds) { ui.ob.classes.splice(Number(ds.i), 1); ui.ob.analysis = E.analyzeBaseline(ui.ob.classes); render(); },
    obSampleDump() { ui.ob.dumpText = D.SAMPLE_BRAIN_DUMP; render(); },
    obParseDump() {
      const text = (ui.ob.dumpText || '').trim();
      if (!text) { toast('Type or say what is on your plate first.'); return; }
      const parsed = P.parse(text, S.parseContext(state));
      S.log(state, 'Phase 2 · Brain dump', text, P.toPhase2(parsed));
      ui.ob.review = parsed.intents.map(intentToItem);
      render();
    },
    obEditDump() { ui.ob.review = null; render(); },
    obGenerate() {
      for (const it of ui.ob.review) if (it.kind === 'task' && it.include) state.tasks.push(S.makeTask(state, it.task));
      ui.ob.step = 5; ui.ob.genStep = 0;
      render();
      const tick = () => {
        ui.ob.genStep++;
        if (ui.ob.genStep >= 5) {
          state.onboarded = true;
          S.replan(state, null, { fresh: true });
          ui.ob = freshOnboarding();
          ui.tab = 'home';
          render();
          toast('Your plan is ready. Use the demo clock at the top to move through the week.', { ms: 6000 });
          return;
        }
        render();
        setTimeout(tick, 520);
      };
      setTimeout(tick, 520);
    },
    loadDemo() {
      state = S.loadDemo(S.reset());
      ui.ob = freshOnboarding(); ui.tab = 'home'; undoSnap = null;
      render();
      toast("Loaded Alex's week. Try the 🧠 button or move the demo clock.", { ms: 6000 });
    },
    loadDemoConfirm() { if (confirm("Replace everything with Alex's demo week?")) A.loadDemo(); },
    resetAll() {
      if (!confirm('Erase all data and restart setup?')) return;
      state = S.reset(); ui.ob = freshOnboarding(); ui.sheet = null; undoSnap = null; render();
    },
    toggleIntegration(ds) { state.integrations[ds.id] = !state.integrations[ds.id]; render(); },

    // --- navigation
    tab(ds) { ui.tab = ds.tab; ui.focusOnly = false; render(); window.scrollTo(0, 0); },
    dayView(ds) { ui.dayView = ds.v; render(); },
    pickDay(ds) { ui.weekDay = Number(ds.day); render(); },
    showFullPlan() { ui.focusOnly = false; render(); },
    focusOnly() { ui.sheet = null; ui.tab = 'home'; ui.focusOnly = true; render(); window.scrollTo(0, 0); },
    dismissUpdate() { state.lastUpdate = null; render(); },
    undo() {
      if (!undoSnap) return;
      const log = state.engineLog;
      state = Object.assign(S.initialState(), JSON.parse(undoSnap.json));
      state.engineLog = log;
      state.lastUpdate = null;
      undoSnap = null; ui.toast = null;
      render();
      toast('Change undone.');
    },

    // --- focus card
    start(ds) { snapshot('Start'); S.startSession(state, ds.id); render(); },
    done(ds) {
      snapshot('Done');
      const s = S.findSession(state, ds.id);
      S.completeSession(state, ds.id);
      render();
      toast(`Nice — "${s.title}" done. Next task promoted.`, { undo: true });
    },
    snooze(ds) {
      snapshot('Snooze');
      const s = S.findSession(state, ds.id);
      S.snoozeSession(state, ds.id);
      const moved = state.plan.find((x) => x.unitId === s.unitId);
      render();
      toast(moved ? `Moved "${s.title}" to ${T.rel(moved.start, now())} ${T.timeShort(moved.start)}.` : `"${s.title}" no longer fits before its deadline — see the alert.`, { undo: true });
    },
    checkinDone(ds) {
      snapshot('Check-in');
      S.completeSession(state, ds.id);
      render();
      toast('Logged as done. Plan adjusted.', { undo: true });
    },
    checkinNo(ds) { S.dismissCheckin(state, ds.id); render(); },
    setDeadline(ds) {
      const el = document.getElementById('dl-' + ds.id);
      const v = el && T.fromInput(el.value);
      if (!v) { toast('Pick a date and time first.'); return; }
      snapshot('Deadline');
      const t = taskById(ds.id);
      t.deadline = v;
      S.replan(state, `Deadline set: ${t.title} → ${T.short(v)}`);
      render();
    },

    // --- clock
    openClock() { ui.sheet = { type: 'clock' }; render(); },
    advance(ds) { moveClock(now() + Number(ds.mins) * T.MIN); },
    nextMorning() { moveClock(T.at(T.dayStart(now()) + T.DAY, state.baseline.dayStart)); },
    jump(ds) { ui.sheet = null; moveClock(Number(ds.ms)); },
    setClock() {
      const v = T.fromInput(document.getElementById('clock-input').value);
      if (!v) return;
      ui.sheet = null;
      moveClock(v);
    },

    // --- brain dump
    openDump() { ui.sheet = { type: 'dump', mode: 'input', text: '', input: 'text' }; render(); setTimeout(() => { const el = document.getElementById('dump-text'); if (el) el.focus(); }, 60); },
    dumpInput(ds) { ui.sheet.input = ds.v; render(); },
    scenario(ds) { ui.sheet.text = D.SCENARIOS[Number(ds.i)].text; render(); },
    processDump() {
      const text = (ui.sheet.text || '').trim();
      if (!text) { toast('Say or type what changed first.'); return; }
      stopVoice();
      processDump(text);
      render();
    },
    dumpEdit() { ui.sheet.mode = 'input'; render(); },
    template(ds) { ui.sheet = { type: 'dump', mode: 'input', input: 'text', text: ds.v }; render(); setTimeout(() => { const el = document.getElementById('dump-text'); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }, 60); },
    resolve(ds) { ui.sheet.items[Number(ds.n)].resolution = ds.v; render(); },
    answer(ds) { ui.sheet.items[Number(ds.n)].answer = ds.v; render(); },
    toggleRecurring(ds) { const it = ui.sheet.items[Number(ds.n)]; it.makeRecurring = !it.makeRecurring; render(); },
    pickAmbiguous(ds) {
      const list = ds.scope === 'ob' ? ui.ob.review : ui.sheet.items;
      const it = list[Number(ds.n)];
      it.task.deadline = it.ambiguous[Number(ds.k)].deadline;
      it.ambiguous = null; it.clarification = null;
      render();
    },
    applyDump() { applyDump(); },
    saveManual() {
      const f = ui.sheet.form;
      if (!f.title.trim()) { toast('Give the task a name.'); return; }
      snapshot('Manual task');
      const { type, est } = P.classify(f.title);
      const task = S.makeTask(state, { title: P.titleCase(f.title.trim()), type, deadline: f.deadline, durationMins: f.durationMins || est,
        isAiEstimate: !f.durationMins, priority: f.priority, notes: f.notes, parts: P.suggestParts(type, f.durationMins || est) });
      state.tasks.push(task);
      ui.sheet = null;
      S.replan(state, `New task: ${task.title}`, { notes: task.deadline == null ? [`"${task.title}" needs a deadline before it can be scheduled.`] : [] });
      render();
    },
    voice(ds) { toggleVoice(ds.path); },

    // --- tasks
    openTask(ds) { openTask(ds.id); },
    newTask() { ui.sheet = { type: 'dump', mode: 'input', input: 'form', text: '' }; render(); },
    saveTask() { saveTask(); },
    completeTask() {
      const t = taskById(ui.sheet.id);
      snapshot('Complete task');
      t.status = 'done';
      (t.parts || []).forEach((p) => { p.done = true; p.remainingMins = 0; });
      t.remainingMins = 0;
      state.history.push({ id: `${t.id}@${now()}`, taskId: t.id, title: t.title, start: now(), end: now(), doneAt: now() });
      ui.sheet = null;
      S.replan(state, `Completed: ${t.title}`);
      render();
    },
    deleteTask() {
      const t = taskById(ui.sheet.id);
      snapshot('Remove task');
      t.status = 'cancelled';
      ui.sheet = null;
      S.replan(state, `Removed task: ${t.title}`);
      render();
    },

    // --- fixed commitments & settings
    openFixed(ds) { ui.sheet = { type: 'fixed', id: ds.id, day: Number(ds.day) }; render(); },
    cancelFixed() {
      const sh = ui.sheet;
      const o = E.occurrences(state, sh.day).find((x) => x.id === sh.id);
      if (!o) return;
      snapshot('Cancel commitment');
      S.cancelOccurrence(state, o);
      ui.sheet = null;
      S.replan(state, `Cancelled ${o.title} (${T.short(o.start)}) — by you`, { notes: [`That frees up ${T.dur((o.end - o.start) / T.MIN)} on ${T.short(o.start)}.`] });
      render();
    },
    removeClass(ds) { baselineChange('Removed class', () => { state.baseline.classes = state.baseline.classes.filter((c) => c.id !== ds.id); }); },
    removeRecurring(ds) { baselineChange('Removed weekly commitment', () => { state.baseline.recurring = state.baseline.recurring.filter((r) => r.id !== ds.id); }); },
    removeEvent(ds) { baselineChange('Removed one-time commitment', () => { state.events = state.events.filter((e) => e.id !== ds.id); }); },
    restoreOcc(ds) { baselineChange('Restored a cancelled session', () => { state.cancellations = state.cancellations.filter((c) => c !== ds.id); }); },
    addClass() {
      const f = formValues('add-class');
      if (!f.title.trim() || f.end <= f.start) { toast('Add a subject and a valid time range.'); return; }
      baselineChange(`Added class ${f.title}`, () => state.baseline.classes.push({ id: S.uid(state, 'c'), title: f.title.trim(), day: Number(f.day), start: f.start, end: f.end, mode: f.mode }));
    },
    addRecurringForm() {
      const f = formValues('add-rec');
      if (!f.title.trim() || f.end <= f.start) { toast('Add a name and a valid time range.'); return; }
      baselineChange(`Added weekly ${f.title}`, () => S.addRecurring(state, { title: f.title.trim(), kind: f.kind, days: [Number(f.day)], start: f.start, end: f.end }));
    },
    openEngine() { ui.sheet = { type: 'engine' }; render(); },

    // --- sheet chrome
    closeSheet() { stopVoice(); ui.sheet = null; render(); },
    backdrop(ds, el, e) { if (e.target === el) A.closeSheet(); },
  };

  function formValues(id) {
    const out = {};
    document.querySelectorAll(`#${id} [name]`).forEach((el) => { out[el.name] = el.value; });
    return out;
  }

  function baselineChange(trigger, fn) {
    snapshot(trigger);
    fn();
    S.replan(state, trigger);
    render();
    toast('Baseline updated — plan recalculated.', { undo: true });
  }

  function moveClock(ms) {
    const hadCheckins = state.checkins.length;
    S.setClock(state, ms);
    undoSnap = null;
    render();
    if (state.checkins.length > hadCheckins) toast('A session ended without "Done". Check in on the Home tab.');
  }

  // ----------------------------------------------------------------- voice --
  let recog = null;
  function toggleVoice(path) {
    if (ui.listening) { stopVoice(); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast("Voice input isn't supported in this browser. Type it instead, or try a demo scenario."); return; }
    recog = new SR();
    recog.lang = 'en-US';
    recog.interimResults = true;
    const field = document.querySelector(`[data-bind="${path}"]`);
    const base = field && field.value ? field.value.trim() + ' ' : '';
    recog.onresult = (e) => {
      const txt = Array.from(e.results).map((r) => r[0].transcript).join(' ');
      const el = document.querySelector(`[data-bind="${path}"]`);
      const root = path.startsWith('ob.') ? ui : ui;
      setPath(root, path, base + txt);
      if (el) el.value = base + txt;
    };
    recog.onerror = () => toast("Couldn't hear that. Check microphone permissions, or type instead.");
    recog.onend = () => { ui.listening = null; updateMic(path); };
    try { recog.start(); ui.listening = path; updateMic(path); } catch (err) { toast('Voice input is unavailable right now.'); }
  }
  function stopVoice() { if (recog) { try { recog.stop(); } catch (e) { /* already stopped */ } } ui.listening = null; }
  function updateMic(path) {
    const btn = document.querySelector(`.mic[data-path="${path}"]`);
    if (!btn) return;
    btn.classList.toggle('listening', ui.listening === path);
    const label = btn.nextElementSibling;
    if (label) label.textContent = ui.listening === path ? 'Listening… tap to stop' : 'Tap to speak';
  }

  // ---------------------------------------------------------------- events --
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el || el.disabled) return;
    const fn = A[el.dataset.action];
    if (!fn) return;
    if (el.dataset.action !== 'backdrop') e.preventDefault();
    fn(el.dataset, el, e);
  });

  document.addEventListener('input', (e) => {
    const el = e.target;
    if (el.dataset.bind && el.type !== 'checkbox' && el.tagName !== 'SELECT' && !['datetime-local', 'time'].includes(el.type)) {
      setPath(ui, el.dataset.bind.replace(/^ob\./, 'ob.'), convert(el));
      if (el.dataset.est) setPath(ui, el.dataset.est, false);
      if (el.dataset.bind === 'sheet.text') { /* keep typing smooth: no re-render */ }
    }
  });

  document.addEventListener('change', (e) => {
    const el = e.target;
    if (el.dataset.bind) {
      setPath(ui, el.dataset.bind, convert(el));
      if (el.dataset.est) setPath(ui, el.dataset.est, false);
      if (el.dataset.rerender !== undefined || el.tagName === 'SELECT' || el.type === 'checkbox') {
        if (el.dataset.bind.startsWith('ob.classes')) ui.ob.analysis = E.analyzeBaseline(ui.ob.classes);
        if (el.dataset.rerender !== undefined) render();
      }
      return;
    }
    if (el.dataset.setting) {
      const key = el.dataset.setting;
      const val = el.type === 'checkbox' ? el.checked : el.dataset.type === 'int' ? parseInt(el.value, 10) : el.value;
      baselineChange('Baseline settings changed', () => { state.baseline[key] = val; });
      return;
    }
    if (el.dataset.change === 'obUpload' && el.files && el.files[0]) {
      ui.ob.uploadNote = `Read "${el.files[0].name}". Demo build: document OCR is simulated, so the sample COR text was used. Review it below.`;
      ui.ob.corText = D.SAMPLE_COR_TEXT;
      A.obExtract();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && ui.sheet) A.closeSheet();
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && ui.sheet && ui.sheet.type === 'dump' && ui.sheet.mode === 'input') A.processDump();
  });

  render();
})();
