/*
 * SIKAD — UI layer. Renders the onboarding wizard, dashboard, week view,
 * task list, settings and bottom sheets, and wires user actions to the store.
 */
(function () {
  'use strict';
  const T = window.TempoTime, E = window.TempoEngine, P = window.TempoParser, S = window.TempoStore, D = window.TempoData;
  const F = window.TempoFocus, Assistant = window.TempoAssistant, M = window.TempoMotion;

  let state = S.load();
  let undoSnap = null;

  const TUTORIAL_KEY = 'sikad-tutorial-seen';
  function hasSeenTutorial() {
    try {
      return localStorage.getItem(TUTORIAL_KEY) === '1';
    } catch (e) {
      return false;
    }
  }
  function markTutorialSeen() {
    try {
      localStorage.setItem(TUTORIAL_KEY, '1');
    } catch (e) {}
  }

  const ui = {
    tab: 'home', dayView: 'today', weekDay: null, sheet: null, toast: null, focusOnly: false,
    tutorialOpen: !hasSeenTutorial() && !state.onboarded,
    tutorialSlide: 0,
    askThread: [],      // answered questions shown in the Ask SIKAD panel (this visit only)
    dict: null,         // dictaphone state: { path, state, final, interim, note, error }
    focusPick: null,    // session id while the student is choosing a working method
    spotlightOff: false, // the student un-dimmed the screen during Focus Mode; the session keeps running
    ob: state.obDraft || freshOnboarding(),
    integrationState: {}, // Batch 6: UI-only map ui.integrationState[id] = { status, account, lastSync, imported, error }
    isOffline: typeof navigator !== 'undefined' && !navigator.onLine,
  };

  const $app = document.getElementById('app');
  const $sheet = document.getElementById('sheet-root');
  const $toast = document.getElementById('toast-root');

  function freshOnboarding() {
    return {
      step: 0, name: '', corText: '', classes: [], analysis: '', extracted: false, uploadNote: '', extracting: false, parsingDump: false,
      ls: { dayStart: '06:00', dayEnd: '22:00', commuteMins: 60, working: null, workDays: [6], workStart: '09:00', workEnd: '14:00',
        org: null, orgDay: 4, orgStart: '17:00', orgEnd: '19:00' },
      dumpText: '', review: null, genStep: 0,
    };
  }

  // Judge mode support (Batch 1: gated behind ?demo=1 or 5 taps on version text)
  const JUDGE_KEY = 'sikad-judge';
  function isJudge() {
    try {
      const p = new URLSearchParams(window.location.search);
      if (p.get('demo') === '1') { localStorage.setItem(JUDGE_KEY, '1'); return true; }
      if (p.get('demo') === '0') { localStorage.removeItem(JUDGE_KEY); return false; }
      return localStorage.getItem(JUDGE_KEY) === '1';
    } catch (e) {
      return false;
    }
  }
  function setJudge(on) {
    try {
      if (on) localStorage.setItem(JUDGE_KEY, '1');
      else localStorage.removeItem(JUDGE_KEY);
    } catch (e) {}
  }
  let versionTaps = [];
  function recordVersionTap() {
    const t = Date.now();
    versionTaps = versionTaps.filter((ts) => t - ts < 3000);
    versionTaps.push(t);
    if (versionTaps.length >= 5) {
      versionTaps = [];
      const cur = isJudge();
      setJudge(!cur);
      render();
      toast(!cur ? 'Judge mode enabled.' : 'Judge mode disabled (Product mode).');
    }
  }

  // Batch 6: Integration seam
  // window.SikadIntegrations provides adapters for external platforms.
  // connect(id) returns Promise<{ account, items:[{title, due, source}] }> or rejects with { message }.
  window.SikadIntegrations = window.SikadIntegrations || {
    gcal: {
      connect() {
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            if (isJudge()) {
              resolve({
                account: 'alex.s@up.edu.ph',
                items: [
                  { title: 'CS 199 Thesis Progress Report', due: new Date(Date.now() + 86400000 * 2).toISOString(), source: 'Google Calendar' },
                  { title: 'Project Consultation with Adviser', due: new Date(Date.now() + 86400000 * 3).toISOString(), source: 'Google Calendar' }
                ]
              });
            } else {
              // Stub error in product mode: no OAuth client configured yet
              reject({ message: 'Google Calendar connection failed: No OAuth client configured. Check network and credentials.' });
            }
          }, 800);
        });
      }
    }
  };

  function getIntegrationState(id) {
    if (!ui.integrationState) ui.integrationState = {};
    if (!ui.integrationState[id]) {
      const hasAdapter = !!(window.SikadIntegrations && window.SikadIntegrations[id]);
      const isConn = !!(state.integrations && state.integrations[id] && isJudge());
      ui.integrationState[id] = {
        status: hasAdapter ? (isConn ? 'connected' : 'idle') : 'unavailable',
        account: isConn ? 'alex.s@up.edu.ph' : '',
        lastSync: isConn ? 'Synced recently · 2 items' : '',
        imported: [],
        error: null
      };
    }
    return ui.integrationState[id];
  }

  // -------------------------------------------------------------- helpers --
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const taskById = (id) => state.tasks.find((t) => t.id === id);
  const now = () => (isJudge() ? state.now : Date.now());
  const PRI_LABEL = { high: 'High', medium: 'Medium', low: 'Low' };
  // Priority is a ranking, not a status: neutral chip + bar glyph (design.md §5.4).
  const PRI_BARS = { high: 3, medium: 2, low: 1 };
  const priChip = (p) => `<span class="chip pri" aria-label="${PRI_LABEL[p] || p} priority"><span class="pri-bars" aria-hidden="true">${[1, 2, 3].map((i) => `<i class="${i <= (PRI_BARS[p] || 0) ? '' : 'off'}"></i>`).join('')}</span>${PRI_LABEL[p] || p}</span>`;
  const estChip = () => '<span class="chip est" title="SIKAD guessed this from the task type. Tap the task to adjust.">AI estimate</span>';
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
    // design.md §10 icon set (24px grid, 1.75 stroke, currentColor) — replaces emoji in system UI
    doc: '<svg viewBox="0 0 24 24"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>',
    info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5v.5"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
    question: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.6 9.5a2.5 2.5 0 1 1 3.6 2.2c-.8.4-1.2 1-1.2 1.8v.5M12 17v.5"/></svg>',
    alert: '<svg viewBox="0 0 24 24"><path d="M12 4 2.8 19.5h18.4z"/><path d="M12 10v4.5M12 17v.4"/></svg>',
    hourglass: '<svg viewBox="0 0 24 24"><path d="M7 3h10M7 21h10M8 3v3.5a4 4 0 0 0 1.6 3.2L12 12l2.4-2.3A4 4 0 0 0 16 6.5V3M8 21v-3.5a4 4 0 0 1 1.6-3.2L12 12l2.4 2.3a4 4 0 0 1 1.6 3.2V21"/></svg>',
    overlap: '<svg viewBox="0 0 24 24"><rect x="3.5" y="4" width="11" height="11" rx="2"/><rect x="9.5" y="9" width="11" height="11" rx="2"/></svg>',
    undo: '<svg viewBox="0 0 24 24"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>',
    step: '<svg viewBox="0 0 24 24"><path d="M3 20c5 0 6-6 9-8s5-2 6-4"/><circle cx="19" cy="6" r="2.6" fill="currentColor"/></svg>',
    clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    bus: '<svg viewBox="0 0 24 24"><rect x="5" y="3.5" width="14" height="14" rx="2.5"/><path d="M5 11h14M8 17.5V20M16 17.5V20M8.5 14.5h.01M15.5 14.5h.01"/></svg>',
    meal: '<svg viewBox="0 0 24 24"><path d="M7 3v8M5 3v4a2 2 0 0 0 4 0V3M7 11v10M16 21V3c-2 1.5-3 4-3 7h3"/></svg>',
    sunrise: '<svg viewBox="0 0 24 24"><path d="M5 18a7 7 0 0 1 14 0M3 18h18M12 4v4M5.5 9.5 7 11M18.5 9.5 17 11"/></svg>',
    task: '<svg viewBox="0 0 24 24"><rect x="4" y="3.5" width="16" height="17" rx="2.5"/><path d="M8 9h8M8 13h8M8 17h5"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M8 5.5v13l10-6.5z"/></svg>',
    snooze: '<svg viewBox="0 0 24 24"><path d="M5 12h12M13 7l5 5-5 5"/></svg>',
    braindump: '<svg viewBox="0 0 24 24"><path d="M5 5h14a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 19 16h-8l-4.5 4v-4H5a1.5 1.5 0 0 1-1.5-1.5v-8A1.5 1.5 0 0 1 5 5z"/><path d="M8 9h8M8 12.5h5"/></svg>',
    chevron: '<svg viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg>',
    sun: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/></svg>',
    moon: '<svg viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>',
  };
  // SIKAD mark: a short path with the next step ahead of it (design.md §10).
  const LOGO = '<svg class="logo" viewBox="0 0 48 48" aria-hidden="true"><path class="logo-path" d="M6 41c10 0 11-9 17-13s10-3 12-7"/><circle class="logo-step" cx="10.5" cy="40.4" r="2.6"/><circle class="logo-step" cx="22" cy="29" r="2.6"/><circle class="logo-next" cx="38.5" cy="13.5" r="5.5"/></svg>';

  // ------------------------------------------------------------- theme --
  // Light/dark toggle. The choice is a per-device convenience kept in localStorage;
  // with no saved choice the app follows the OS setting (design.md §5.2).
  const THEME_KEY = 'sikad-theme';
  let themeFade = 0;
  const darkQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  const currentTheme = () => document.documentElement.dataset.theme || (darkQuery && darkQuery.matches ? 'dark' : 'light');
  function getThemeSetting() {
    try {
      const s = localStorage.getItem(THEME_KEY);
      if (s === 'light' || s === 'dark') return s;
      return 'system';
    } catch (e) {
      return 'system';
    }
  }
  function setThemeSetting(setting) {
    const html = document.documentElement;
    html.classList.add('theme-fade');
    clearTimeout(themeFade);
    themeFade = setTimeout(() => html.classList.remove('theme-fade'), M.DUR.enter + 40);
    try {
      if (setting === 'system') {
        localStorage.removeItem(THEME_KEY);
        delete html.dataset.theme;
      } else {
        localStorage.setItem(THEME_KEY, setting);
        html.dataset.theme = setting;
      }
    } catch (e) {}
    const isDark = setting === 'dark' || (setting === 'system' && darkQuery && darkQuery.matches);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', isDark ? '#131917' : '#294B3A');
    render();
  }
  function applyTheme(theme) {
    setThemeSetting(theme);
  }
  function appearanceCard() {
    const cur = getThemeSetting();
    return `
      <section class="card settings">
        <h2>Appearance</h2>
        <div class="seg" role="radiogroup" aria-label="Appearance">
          <button class="${cur === 'light' ? 'on' : ''}" role="radio" aria-checked="${cur === 'light'}" data-action="setTheme" data-theme="light">Light</button>
          <button class="${cur === 'dark' ? 'on' : ''}" role="radio" aria-checked="${cur === 'dark'}" data-action="setTheme" data-theme="dark">Dark</button>
          <button class="${cur === 'system' ? 'on' : ''}" role="radio" aria-checked="${cur === 'system'}" data-action="setTheme" data-theme="system">System</button>
        </div>
      </section>`;
  }

  function setPath(obj, path, value) {
    const keys = path.split('.');
    let o = obj;
    for (let i = 0; i < keys.length - 1; i++) { o = o[keys[i]]; if (o == null) return; } // e.g. a late change event after its sheet closed
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

  /** After a step change, put keyboard/screen-reader focus on the new step's heading. */
  function focusHeading() {
    const h = document.querySelector('.ob-title, main h1');
    if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  }

  /** Move focus to the first question that needs the student's answer (design.md §12.6). */
  function focusFirstQuestion() {
    const q = document.querySelector('[data-question]');
    if (q) q.focus({ preventScroll: false });
  }

  function snapshot(label) {
    const copy = S.clone(state);
    delete copy.obDraft;
    undoSnap = { label, json: JSON.stringify(copy) };
  }
  /** Toast: ≥ 5 s, paused while hovered or focused (design.md §7.11). */
  function toast(msg, opts = {}) {
    ui.toast = { msg, undo: !!opts.undo, id: Date.now() };
    renderToast();
    const id = ui.toast.id;
    const expire = () => {
      if (!ui.toast || ui.toast.id !== id) return;
      if ($toast.matches(':hover') || $toast.contains(document.activeElement)) { setTimeout(expire, 1000); return; }
      ui.toast = null; renderToast();
    };
    setTimeout(expire, Math.max(5200, opts.ms || 0));
  }

  // --------------------------------------------------------------- render --
  // Sheet focus management (design.md §7.11): focus moves in on open, Tab is trapped, focus returns on close.
  let sheetWasOpen = false, sheetOpener = null;
  const describe = (el) => {
    const b = el && el.closest && el.closest('[data-action]');
    if (!b) return null;
    return `[data-action="${b.dataset.action}"]` + (b.dataset.id ? `[data-id="${b.dataset.id}"]` : '') + (b.dataset.tab ? `[data-tab="${b.dataset.tab}"]` : '');
  };
  /** Selector that finds "the same" control after innerHTML is rebuilt, so keyboard focus isn't dropped to <body>. */
  const FOCUS_KEYS = ['action', 'id', 'tab', 'n', 'v', 'i', 'k', 'path', 'value', 'day', 'scope', 'bind', 'setting', 'mins', 'ms'];
  const focusKey = (el) => {
    if (!el || el === document.body || !el.closest) return null;
    if (el.id) return `#${CSS.escape(el.id)}`;
    const parts = FOCUS_KEYS.filter((k) => el.dataset && el.dataset[k] !== undefined).map((k) => `[data-${k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())}="${CSS.escape(el.dataset[k])}"]`);
    return parts.length ? el.tagName.toLowerCase() + parts.join('') : null;
  };

  // ---------------------------------------------------------- history --
  // Browser/phone Back works like a native app: it closes an open sheet, then steps
  // back through tabs. Each tab has a URL (#home, #week, #tasks, #profile).
  const TABS = ['home', 'week', 'tasks', 'profile'];
  let lastTab = null, fromPop = false, popsToIgnore = 0;
  function syncHistory(opening, closing) {
    if (!state.onboarded) { lastTab = null; return; }
    const tabChanged = lastTab !== null && lastTab !== ui.tab;
    lastTab = ui.tab;
    if (fromPop) return;                                   // the browser already moved; nothing to record
    const onSheetEntry = history.state && history.state.sikad === 'sheet';
    try {
      if (opening) history.pushState({ sikad: 'sheet' }, '');
      else if (closing && onSheetEntry && tabChanged) history.replaceState({ sikad: 'tab' }, '', '#' + ui.tab);
      else if (closing && onSheetEntry) { popsToIgnore++; history.back(); }
      else if (tabChanged) history.pushState({ sikad: 'tab' }, '', '#' + ui.tab);
    } catch (e) { /* history unavailable (sandboxed frame): navigation still works without it */ }
  }
  window.addEventListener('popstate', () => {
    if (popsToIgnore > 0) { popsToIgnore--; return; }
    fromPop = true;
    if (ui.sheet) { stopVoice(); keepDraft(); ui.sheet = null; }
    const t = location.hash.slice(1);
    ui.tab = TABS.includes(t) ? t : 'home';
    ui.focusOnly = false;
    render();
    fromPop = false;
    const h = document.querySelector('main h1');           // focus-on-route-change
    if (h && state.onboarded) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  });

  // ---------------------------------------------------------- motion --
  // motion-spec.md: state changes first, then the view animates from where it was to where it is.
  let lastViewKey = null, lastSheetKey = null;
  const updateSig = () => { const u = state.lastUpdate; return u ? `${u.trigger}|${u.at}|${JSON.stringify(u.changes)}` : ''; };
  let lastWashSig = updateSig();          // a plan update restored from storage is not news: no wash on load

  /** Play an element's CSS exit, then remove it. */
  function leave(el, cls, ms) {
    if (M.reduced()) { el.remove(); return; }
    el.classList.add(cls);
    el.inert = true;
    el.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
    const gone = () => el.remove();
    el.addEventListener('animationend', (e) => { if (e.target === el) gone(); }, { once: true });
    setTimeout(gone, ms + 80);
  }

  /**
   * The Satisfaction (motion-spec §5.2). Call after the store has changed: the old view strikes
   * the finished title, then the real state renders. Any other render in between wins.
   */
  let pending = null;
  function settle(sessionId, after) {
    const sel = `[data-sid="${CSS.escape(sessionId)}"]`;
    const card = document.querySelector(`.focus${sel}`), row = document.querySelector(`.tl-item${sel}`);
    const wait = M.strike([...(card ? card.querySelectorAll('.strike') : []), row && row.querySelector('.tl-name')]);
    if (!wait) { render(); if (after) after(); return; }
    S.save(state);
    if (card) card.classList.add('is-completing');
    if (row) row.classList.add('is-completing');
    pending = { after, timer: setTimeout(render, wait) };
  }

  /** Focus Mode dims the rest of Home while a method is being picked or a session is open. */
  function spotlightOn() {
    if (!state.onboarded || ui.tab !== 'home' || ui.sheet || ui.spotlightOff) return false;
    if (state.active) return state.plan.some((x) => x.id === state.active.sessionId);
    const next = ui.focusPick && E.nextSession(state.plan, now());
    return !!next && next.id === ui.focusPick;
  }

  function render() {
    if (!isJudge()) state.now = Date.now();
    const after = pending && pending.after;
    if (pending) { clearTimeout(pending.timer); pending = null; }
    state.obDraft = state.onboarded ? null : ui.ob;
    S.save(state);
    const opening = !!ui.sheet && !sheetWasOpen, closing = !ui.sheet && sheetWasOpen;
    syncHistory(opening, closing);
    if (opening) sheetOpener = describe(document.activeElement);
    const keep = !opening && !closing ? focusKey(document.activeElement) : null;
    const viewKey = ui.tutorialOpen ? `tutorial:${ui.tutorialSlide}` : (state.onboarded ? `app:${ui.tab}:${ui.focusOnly ? 'one' : 'all'}` : `ob:${ui.ob.step}`);
    const sheetKey = ui.sheet ? `${ui.sheet.type}:${ui.sheet.mode || ''}` : null;
    const snap = M.capture($app);
    const oldSheet = $sheet.querySelector('.sheet-backdrop:not(.is-closing)');
    $app.innerHTML = (ui.isOffline ? '<div class="offline-banner" role="status" aria-live="polite"><span>You\'re offline. Your plan still works. Syncing resumes when you\'re back.</span></div>' : '') + (ui.tutorialOpen ? tutorialScreen() : (state.onboarded ? shell() : onboarding()));
    if (closing && oldSheet && !M.reduced()) leave(oldSheet, 'is-closing', 160);
    else $sheet.innerHTML = ui.sheet ? sheet() : '';
    if (ui.sheet) {
      if (opening) $sheet.firstElementChild.classList.add('is-opening');
      else if (sheetScroll) $sheet.firstElementChild.firstElementChild.scrollTop = sheetScroll;   // re-rendering a sheet keeps your place
    }
    lastSheetKey = sheetKey;
    document.body.classList.toggle('sheet-open', !!ui.sheet);
    document.body.classList.toggle('spotlight', spotlightOn());
    $app.toggleAttribute('inert', !!ui.sheet);
    if (opening) {
      const target = $sheet.querySelector('#dump-text') || $sheet.querySelector('#sheet-title');
      if (target) target.focus({ preventScroll: true });
    } else if (!ui.sheet && sheetWasOpen) {
      const back = sheetOpener && $app.querySelector(sheetOpener);
      if (back) back.focus({ preventScroll: true });
      sheetOpener = null;
    } else if (keep) {
      // Same control if it still exists; otherwise the Focus Card title or the view heading.
      const again = document.querySelector(keep) || document.querySelector(ui.sheet ? '#sheet-title' : (ui.tutorialOpen ? '.tutorial-title, .tutorial-next-btn, .tutorial-finish-btn' : '#focus-title, main h1, .ob-title'));
      if (again && again !== document.activeElement) again.focus({ preventScroll: true });
    }
    sheetWasOpen = !!ui.sheet;
    const sig = updateSig();
    M.play($app, snap, { sameView: viewKey === lastViewKey, viewEl: $app.querySelector('main, .onboarding, .tutorial-screen'), washNew: !!sig && sig !== lastWashSig });
    lastViewKey = viewKey; lastWashSig = sig;
    if (state.onboarded) ui.prevPct = S.weeklyProgress(state).percent;
    ui.celebrate = false;
    renderToast();
    tickTimer();
    if (after) after();
  }
  /** The toast is one node for its whole life, so unrelated renders don't replay its entrance. */
  function renderToast() {
    const cur = $toast.querySelector('.toast:not(.is-leaving)');
    if (!ui.toast) { if (cur) leave(cur, 'is-leaving', M.DUR.micro); return; }
    const undo = !!(ui.toast.undo && undoSnap);
    if (cur && cur.dataset.id === String(ui.toast.id) && !!cur.querySelector('button') === undo) return;
    $toast.innerHTML = `<div class="toast" role="status" data-id="${ui.toast.id}"><span>${esc(ui.toast.msg)}</span>${undo ? ` <button data-action="undo">${ICON.undo}Undo</button>` : ''}</div>`;
  }
  function tickDictation() {
    const el = document.getElementById('dict-time');
    if (!el || !ui.dict || ui.dict.state !== 'recording') return;
    const secs = Math.floor((Date.now() - ui.dict.startedReal) / 1000);
    el.textContent = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  }
  setInterval(tickDictation, 500);

  /** Once a second: refresh the session timer in place. A phase change or the timer ending triggers a re-render. */
  let lastPhase = null;
  function tickTimer() {
    const a = state.active;
    const el = document.getElementById('focus-timer');
    if (!a || a.status !== 'running') { lastPhase = null; return; }
    const t = F.timer(a, S.focusElapsedMs(a));
    if (t.finished) {                      // timer ran out: ask the student; never complete or count anything automatically
      S.pauseSession(state); a.status = 'awaiting'; lastPhase = null;
      render();
      const q = document.getElementById('outcome-title');
      if (q) q.focus({ preventScroll: true });
      return;
    }
    if (lastPhase !== null && lastPhase !== t.phase + t.round) { lastPhase = t.phase + t.round; render(); return; }
    lastPhase = t.phase + (t.round || '');
    if (el) el.textContent = F.clock(t.remainingMs == null ? t.elapsedMs : t.remainingMs);
  }
  setInterval(tickTimer, 1000);

  // ======================================================= APP TUTORIAL ==
  const TUTORIAL_SLIDES = [
    {
      tagline: 'Momentum & Flow',
      title: 'Find your momentum',
      desc: 'SIKAD sees what you can realistically achieve with the hours you actually have — without toxic productivity or burnout.',
      svg: `<svg viewBox="0 0 320 180" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 140 C 90 120, 180 150, 310 125" stroke="var(--line)" stroke-width="1.5" stroke-dasharray="4 4" fill="none" opacity="0.6"/>
        <path d="M10 95 C 100 80, 200 110, 310 85" stroke="var(--line)" stroke-width="1.5" stroke-dasharray="4 4" fill="none" opacity="0.4"/>
        <path d="M30 145 C 80 145, 100 100, 160 95 C 220 90, 240 45, 290 40" stroke="var(--forest)" stroke-width="4" stroke-linecap="round" fill="none"/>
        <circle cx="45" cy="144" r="8" fill="var(--surface)" stroke="var(--forest)" stroke-width="3"/>
        <circle cx="45" cy="144" r="3" fill="var(--forest)"/>
        <circle cx="160" cy="95" r="9" fill="var(--surface)" stroke="var(--forest)" stroke-width="3"/>
        <circle cx="160" cy="95" r="3.5" fill="var(--forest)"/>
        <circle cx="275" cy="44" r="18" fill="var(--butter)" fill-opacity="0.25"/>
        <circle cx="275" cy="44" r="12" fill="var(--butter)" stroke="var(--forest)" stroke-width="3"/>
        <path d="M271 44 L274 47 L280 41" stroke="var(--forest)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        <g transform="translate(18, 55)">
          <rect width="112" height="28" rx="14" fill="var(--sage-tint)" stroke="var(--forest)" stroke-width="1"/>
          <circle cx="14" cy="14" r="4" fill="var(--forest)"/>
          <text x="24" y="18" font-family="var(--font-sans)" font-size="11" font-weight="700" fill="var(--forest)">REALISTIC TIME</text>
        </g>
        <g transform="translate(190, 125)">
          <rect width="105" height="28" rx="14" fill="var(--surface-2)" stroke="var(--line-strong)" stroke-width="1"/>
          <text x="52" y="18" font-family="var(--font-sans)" font-size="11" font-weight="600" fill="var(--ink-2)" text-anchor="middle">ZERO BURNOUT</text>
        </g>
      </svg>`
    },
    {
      tagline: 'Sacred Baseline',
      title: 'Your baseline is sacred',
      desc: 'Classes, commutes, and org meetings are fixed anchors. SIKAD plans study around them and never moves or cancels them automatically.',
      svg: `<svg viewBox="0 0 320 180" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g transform="translate(25, 18)">
          <rect width="270" height="48" rx="8" fill="var(--sky-tint)" stroke="var(--harbor)" stroke-width="1.5"/>
          <rect x="0" y="0" width="5" height="48" rx="2.5" fill="var(--harbor)"/>
          <rect x="18" y="22" width="14" height="11" rx="2" fill="none" stroke="var(--harbor)" stroke-width="1.8"/>
          <path d="M21 22 V 17 C 21 14.5, 29 14.5, 29 17 V 22" stroke="var(--harbor)" stroke-width="1.8" fill="none"/>
          <text x="40" y="26" font-family="var(--font-display)" font-size="13" font-weight="700" fill="var(--ink)">CMSC 199 Thesis</text>
          <text x="40" y="40" font-family="var(--font-mono)" font-size="11" font-weight="600" fill="var(--harbor)">08:00 – 10:00 · FTF</text>
          <rect x="200" y="14" width="56" height="20" rx="10" fill="var(--surface)" stroke="var(--harbor)" stroke-width="1"/>
          <text x="228" y="28" font-family="var(--font-sans)" font-size="10" font-weight="700" fill="var(--harbor)" text-anchor="middle">LOCKED</text>
        </g>
        <g transform="translate(25, 74)">
          <rect width="270" height="34" rx="6" fill="var(--surface-2)" stroke="var(--line-strong)" stroke-width="1" stroke-dasharray="4 3"/>
          <rect x="18" y="9" width="14" height="14" rx="2" stroke="var(--ink-2)" stroke-width="1.5" fill="none"/>
          <circle cx="21" cy="20" r="1.5" fill="var(--ink-2)"/>
          <circle cx="29" cy="20" r="1.5" fill="var(--ink-2)"/>
          <text x="40" y="21" font-family="var(--font-sans)" font-size="12" font-weight="500" fill="var(--ink-2)">Commute buffer · 45m protected</text>
        </g>
        <g transform="translate(25, 116)">
          <rect width="270" height="46" rx="8" fill="var(--surface)" stroke="var(--forest)" stroke-width="1.5"/>
          <rect x="0" y="0" width="5" height="46" rx="2.5" fill="var(--forest)"/>
          <circle cx="25" cy="23" r="5" fill="var(--forest)"/>
          <text x="40" y="24" font-family="var(--font-display)" font-size="13" font-weight="700" fill="var(--ink)">Literature Review</text>
          <text x="40" y="39" font-family="var(--font-mono)" font-size="11" font-weight="600" fill="var(--forest)">11:00 – 12:30 · Flexible</text>
          <rect x="200" y="13" width="56" height="20" rx="10" fill="var(--sage-tint)" stroke="var(--forest)" stroke-width="1"/>
          <text x="228" y="27" font-family="var(--font-sans)" font-size="10" font-weight="700" fill="var(--forest)" text-anchor="middle">FLEXIBLE</text>
        </g>
      </svg>`
    },
    {
      tagline: 'Singular Focus',
      title: 'The Focus Card',
      desc: 'Stop juggling ten deadlines at once. SIKAD surfaces the one right step for right now, with dedicated work methods like Pomodoro, Flowtime, and Chunking.',
      svg: `<svg viewBox="0 0 320 180" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="25" y="14" width="270" height="152" rx="16" fill="#294B3A" stroke="var(--forest)" stroke-width="1"/>
        <circle cx="45" cy="35" r="4" fill="var(--butter)"/>
        <text x="56" y="39" font-family="var(--font-sans)" font-size="10" font-weight="800" fill="var(--butter)" letter-spacing="1">CURRENT FOCUS</text>
        <text x="45" y="66" font-family="var(--font-display)" font-size="17" font-weight="800" fill="#FFFDF7">ADET Project Report</text>
        <text x="45" y="84" font-family="var(--font-sans)" font-size="12" font-weight="500" fill="#A8B99A">Section 3 · Architecture</text>
        <g transform="translate(205, 50)">
          <circle cx="36" cy="36" r="32" stroke="rgba(255,255,255,0.15)" stroke-width="4" fill="none"/>
          <circle cx="36" cy="36" r="32" stroke="var(--butter)" stroke-width="4" stroke-dasharray="200" stroke-dashoffset="60" stroke-linecap="round" fill="none"/>
          <text x="36" y="42" font-family="var(--font-sans)" font-size="15" font-weight="800" fill="#FFFDF7" text-anchor="middle">25:00</text>
        </g>
        <g transform="translate(45, 114)">
          <rect x="0" y="0" width="80" height="26" rx="13" fill="var(--butter)" stroke="var(--butter)" stroke-width="1"/>
          <text x="40" y="17" font-family="var(--font-sans)" font-size="11" font-weight="700" fill="#26332D" text-anchor="middle">Pomodoro</text>
          <rect x="86" y="0" width="72" height="26" rx="13" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>
          <text x="122" y="17" font-family="var(--font-sans)" font-size="11" font-weight="600" fill="#FFFDF7" text-anchor="middle">Flowtime</text>
          <rect x="164" y="0" width="74" height="26" rx="13" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>
          <text x="201" y="17" font-family="var(--font-sans)" font-size="11" font-weight="600" fill="#FFFDF7" text-anchor="middle">Chunking</text>
        </g>
      </svg>`
    },
    {
      tagline: 'Zero Guilt',
      title: 'Guilt-free replanning',
      desc: 'Life changes, plans slip, or energy shifts. SIKAD recalculates your schedule with one tap and zero judgment. Everything can be undone instantly.',
      svg: `<svg viewBox="0 0 320 180" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g transform="translate(25, 22)">
          <rect width="115" height="52" rx="8" fill="var(--surface-2)" stroke="var(--line)" stroke-width="1"/>
          <text x="14" y="24" font-family="var(--font-sans)" font-size="11" font-weight="600" fill="var(--ink-3)">Delayed slot</text>
          <text x="14" y="40" font-family="var(--font-display)" font-size="13" font-weight="700" fill="var(--ink-2)">2:00 PM</text>
        </g>
        <path d="M148 48 C 175 48, 165 106, 184 106" stroke="var(--forest)" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="5 4" fill="none"/>
        <polygon points="184,101 192,106 184,111" fill="var(--forest)"/>
        <g transform="translate(180, 80)">
          <rect width="115" height="52" rx="8" fill="var(--sage-tint)" stroke="var(--forest)" stroke-width="1.5"/>
          <rect x="0" y="0" width="4" height="52" rx="2" fill="var(--forest)"/>
          <text x="14" y="24" font-family="var(--font-sans)" font-size="11" font-weight="700" fill="var(--forest)">Recalculated</text>
          <text x="14" y="40" font-family="var(--font-display)" font-size="13" font-weight="700" fill="var(--ink)">4:30 PM · Fits!</text>
        </g>
        <g transform="translate(48, 134)">
          <rect width="224" height="34" rx="17" fill="var(--ink)" stroke="none"/>
          <text x="22" y="21" font-family="var(--font-sans)" font-size="11" font-weight="600" fill="var(--bg)">Plan recalculated.</text>
          <g transform="translate(150, 6)">
            <rect width="60" height="22" rx="11" fill="var(--butter)"/>
            <path d="M15 11 L10 8 L15 5" stroke="var(--on-butter)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            <path d="M11 8 H20 C23 8 25 10 25 13" stroke="var(--on-butter)" stroke-width="1.5" stroke-linecap="round" fill="none"/>
            <text x="32" y="15" font-family="var(--font-sans)" font-size="11" font-weight="800" fill="var(--on-butter)">Undo</text>
          </g>
        </g>
      </svg>`
    }
  ];

  function tutorialScreen() {
    const s = TUTORIAL_SLIDES[ui.tutorialSlide] || TUTORIAL_SLIDES[0];
    const isLast = ui.tutorialSlide === TUTORIAL_SLIDES.length - 1;
    return `
      <div class="screen tutorial-screen" role="region" aria-roledescription="carousel" aria-label="SIKAD App Tour">
        <div class="tutorial-header">
          <div class="tutorial-brand">
            ${LOGO}
            <span class="tutorial-logo-text">SIKAD</span>
          </div>
          <button class="tutorial-skip-btn" data-action="tutorialSkip" aria-label="${state.onboarded ? 'Close tour' : 'Skip tutorial'}">
            ${state.onboarded ? 'Close' : 'Skip'}
          </button>
        </div>

        <div class="tutorial-carousel" id="tutorial-carousel">
          <div class="tutorial-slide" role="group" aria-roledescription="slide" aria-label="Slide ${ui.tutorialSlide + 1} of ${TUTORIAL_SLIDES.length}">
            <div class="tutorial-art" aria-hidden="true">
              ${s.svg}
            </div>
            <div class="tutorial-content">
              <span class="tutorial-tagline">${esc(s.tagline)}</span>
              <h1 class="tutorial-title">${esc(s.title)}</h1>
              <p class="tutorial-desc">${esc(s.desc)}</p>
            </div>
          </div>
        </div>

        <div class="tutorial-footer">
          <div class="tutorial-dots" role="tablist" aria-label="Tutorial slide pagination">
            ${TUTORIAL_SLIDES.map((slide, i) => `
              <button class="tutorial-dot ${i === ui.tutorialSlide ? 'active' : ''}"
                      role="tab"
                      aria-selected="${i === ui.tutorialSlide}"
                      aria-label="Go to slide ${i + 1}: ${esc(slide.title)}"
                      data-action="tutorialGoto"
                      data-slide="${i}">
              </button>
            `).join('')}
          </div>

          <div class="tutorial-nav">
            ${ui.tutorialSlide > 0
              ? `<button class="btn tutorial-prev-btn" data-action="tutorialPrev" aria-label="Previous slide">Back</button>`
              : `<div class="tutorial-spacer"></div>`
            }
            ${!isLast
              ? `<button class="btn primary tutorial-next-btn" data-action="tutorialNext">Next</button>`
              : `<button class="btn primary tutorial-finish-btn" data-action="tutorialFinish">${state.onboarded ? 'Got it' : 'Get Started'}</button>`
            }
          </div>
        </div>
      </div>`;
  }

  // ============================================================ ONBOARDING ==
  function onboarding() {
    const ob = ui.ob;
    const steps = ['Welcome', 'Baseline', 'Lifestyle', 'Sync', 'Brain dump', 'Plan'];
    const progress = ob.step > 0 && ob.step < 5
      ? `<div class="ob-progress"><div class="ob-bars" aria-hidden="true">${[1, 2, 3, 4].map((i) => `<span class="${i <= ob.step ? 'on' : ''}"></span>`).join('')}</div><span class="ob-step">Step ${ob.step} of 4</span></div>` : '';
    const body = [obWelcome, obBaseline, obLifestyle, obSync, obDump, obGenerating][ob.step]();
    return `<div class="screen onboarding" data-step="${esc(steps[ob.step])}">${progress}${body}${isJudge() ? judgeDock() : ''}</div>`;
  }

  function obWelcome() {
    return `
      <div class="ob-welcome">
        ${LOGO}
        <h1 class="brand">SIKAD</h1>
        <p class="tagline">Find your next move.</p>
        <p class="lead">See what you can realistically get done with the time you actually have.</p>
        <label class="field">
          <span>What should we call you?</span>
          <input type="text" placeholder="Your name" data-bind="ob.name" value="${esc(ui.ob.name)}" autocomplete="given-name">
        </label>
        <button class="btn primary block" data-action="obNext">Get started</button>
      </div>`;
  }

  function obBaseline() {
    const ob = ui.ob;
    const rows = ob.classes.map((c, i) => `
      <div class="class-row">
        <span class="cr-lock" aria-hidden="true">${ICON.lock}</span>
        <input class="cr-title" aria-label="Subject" placeholder="Subject" value="${esc(c.title)}" data-bind="ob.classes.${i}.title">
        <select class="cr-mode" aria-label="Mode" data-bind="ob.classes.${i}.mode"><option ${c.mode === 'FTF' ? 'selected' : ''}>FTF</option><option ${c.mode === 'Online' ? 'selected' : ''}>Online</option></select>
        <button class="icon-btn" aria-label="Remove ${esc(c.title || 'class')}" data-action="obRemoveClass" data-i="${i}">${ICON.close}</button>
        <select class="cr-day" aria-label="Day" data-bind="ob.classes.${i}.day" data-type="int">${T.DAY_SHORT.map((d, n) => `<option value="${n}" ${n === c.day ? 'selected' : ''}>${d}</option>`).join('')}</select>
        <span class="cr-time"><input type="time" aria-label="Start" value="${c.start}" data-bind="ob.classes.${i}.start"><span>–</span><input type="time" aria-label="End" value="${c.end}" data-bind="ob.classes.${i}.end"></span>
      </div>`).join('');
    const fixedTag = `<span class="fixed-tag">${ICON.lock}Fixed</span>`;
    return `
      <h1 class="ob-title">Set your baseline</h1>
      <p class="ob-sub">Upload your COR or a photo of your class schedule. SIKAD will pull out your weekly class blocks.</p>
      <label class="upload">
        <input type="file" accept="image/*,application/pdf" data-change="obUpload" hidden>
        <span class="upload-icon">${ICON.doc}</span>
        <span><b>Upload COR or schedule photo</b><br><small>PDF or image</small></span>
      </label>
      ${isJudge() && ob.uploadNote ? `<p class="demo-note"><span class="demo-tag">DEMO</span> ${esc(ob.uploadNote)}</p>` : ''}
      <details class="paste" ${ob.corText ? 'open' : ''}>
        <summary>Or paste or type it (one class per line)</summary>
        <textarea rows="6" data-bind="ob.corText" aria-label="Class schedule text" placeholder="IT 302   MON   07:00-10:00   FTF">${esc(ob.corText)}</textarea>
        <div class="row">
          ${isJudge() ? '<button class="btn small" data-action="obSampleCor">Use sample COR</button>' : ''}
          <button class="btn small" data-action="obExtract" ${ob.extracting ? 'disabled aria-disabled="true"' : ''}>${ob.extracting ? '<span class="int-spinner" aria-hidden="true"></span> Extracting…' : 'Extract classes'}</button>
        </div>
      </details>
      ${ob.analysis ? (ob.analysisError
        ? `<div class="status-panel s-clarify" role="status">${ICON.question}<div><b>I couldn't read that schedule</b><p>${esc(ob.analysis)}</p></div></div>`
        : `<div class="status-panel s-info">${ICON.info}<div><b>Schedule analysis</b><p>${esc(ob.analysis)}</p></div></div>`) : ''}
      ${ob.extracted || ob.classes.length ? `
        <div class="list-head"><h2 class="list-h">Weekly classes (${ob.classes.length})</h2>${fixedTag}</div>
        <p class="small muted">Classes are fixed: SIKAD plans around them and never moves them.</p>
        <div class="class-list">${rows || '<p class="muted">No classes yet.</p>'}</div>
        <button class="btn small ghost" data-action="obAddClass">${ICON.plus} Add a class</button>
        <p class="small muted">Check the extraction and fix anything that's off before continuing.</p>` : ''}
      <div class="ob-nav">
        ${ob.classes.length ? '' : '<p class="nav-reason">Add at least one class to continue.</p>'}
        <button class="btn ghost" data-action="obBack">Back</button>
        <button class="btn primary" data-action="obNext" ${ob.classes.length ? '' : 'disabled'}>Continue</button>
      </div>`;
  }

  /** Radio-style choice chips (design.md §7.2): selected = Harbor fill + check icon. */
  function chips(path, current, options, labelId) {
    return `<div class="chips" role="radiogroup" aria-labelledby="${labelId}">${options.map(([v, label]) => {
      const on = String(current) === String(v);
      return `<button class="chip-btn ${on ? 'on' : ''}" role="radio" aria-checked="${on}" data-action="obSet" data-path="${path}" data-value="${esc(v)}">${on ? ICON.check : ''}${esc(label)}</button>`;
    }).join('')}</div>`;
  }

  function obLifestyle() {
    const ls = ui.ob.ls;
    const ftfDays = [...new Set(ui.ob.classes.filter((c) => c.mode === 'FTF').map((c) => c.day))].sort().map((d) => T.DAY_NAMES[d]);
    const ftfText = ftfDays.length ? `I see you have FTF classes on ${ftfDays.join(' & ')}. ` : '';
    const dayChecks = (path, sel, labelId) => `<div class="chips" role="group" aria-labelledby="${labelId}">${[1, 2, 3, 4, 5, 6, 0].map((d) => {
      const on = sel.includes(d);
      return `<button class="chip-btn ${on ? 'on' : ''}" aria-pressed="${on}" data-action="obToggleDay" data-path="${path}" data-day="${d}">${on ? ICON.check : ''}${T.DAY_SHORT[d]}</button>`;
    }).join('')}</div>`;
    const missing = [!ls.working && 'work', !ls.org && 'org'].filter(Boolean);
    return `
      <div class="mascot-row"><div class="mascot" aria-hidden="true">${ICON.step}</div><div><h1 class="ob-title">A few quick questions</h1><p class="ob-sub">So the plan fits your real day.</p></div></div>
      <div class="q">
        <h2 id="q-start">What time does your day usually start?</h2>
        ${chips('ls.dayStart', ls.dayStart, [['05:00', '5:00 AM'], ['06:00', '6:00 AM'], ['07:00', '7:00 AM'], ['08:00', '8:00 AM']], 'q-start')}
        <label class="inline">Custom time <input type="time" value="${ls.dayStart}" data-bind="ob.ls.dayStart" data-rerender></label>
      </div>
      <div class="q">
        <h2 id="q-commute">${esc(ftfText)}How long is your commute to campus during rush hour?</h2>
        ${chips('ls.commuteMins', ls.commuteMins, [[0, 'No commute'], [30, '30 min'], [60, '1 hour'], [90, '1.5 hours']], 'q-commute')}
      </div>
      <div class="q">
        <h2 id="q-work">Are you a working student?</h2>
        ${chips('ls.working', ls.working, [['yes', 'Yes, part-time'], ['no', 'No']], 'q-work')}
        ${ls.working === 'yes' ? `<div class="follow"><p class="small" id="q-workdays">What days and times do you usually work?</p>${dayChecks('workDays', ls.workDays, 'q-workdays')}
          <div class="row time-range"><input type="time" value="${ls.workStart}" data-bind="ob.ls.workStart" aria-label="Work start"><span>to</span><input type="time" value="${ls.workEnd}" data-bind="ob.ls.workEnd" aria-label="Work end"></div></div>` : ''}
      </div>
      <div class="q">
        <h2 id="q-org">Are you in a school organization?</h2>
        ${chips('ls.org', ls.org, [['yes', 'Yes'], ['no', 'No']], 'q-org')}
        ${ls.org === 'yes' ? `<div class="follow"><p class="small">When does your org usually meet?</p>
          <div class="row time-range"><select data-bind="ob.ls.orgDay" data-type="int" aria-label="Org day">${[1, 2, 3, 4, 5, 6, 0].map((d) => `<option value="${d}" ${d === ls.orgDay ? 'selected' : ''}>${T.DAY_NAMES[d]}</option>`).join('')}</select>
          <input type="time" value="${ls.orgStart}" data-bind="ob.ls.orgStart" aria-label="Org start"><span>to</span><input type="time" value="${ls.orgEnd}" data-bind="ob.ls.orgEnd" aria-label="Org end"></div></div>` : ''}
      </div>
      <div class="q">
        <h2 id="q-end">Latest you want anything scheduled?</h2>
        ${chips('ls.dayEnd', ls.dayEnd, [['21:00', '9:00 PM'], ['22:00', '10:00 PM'], ['23:00', '11:00 PM']], 'q-end')}
      </div>
      <div class="ob-nav">
        ${missing.length ? `<p class="nav-reason">Answer the ${missing.join(' and ')} question${missing.length > 1 ? 's' : ''} to continue.</p>` : ''}
        <button class="btn ghost" data-action="obBack">Back</button>
        <button class="btn primary" data-action="obNext" ${missing.length ? 'disabled' : ''}>Continue</button>
      </div>`;
  }

  function obSync() {
    return `
      <h1 class="ob-title">Bring in your due dates</h1>
      <p class="ob-sub">Connect a calendar or class platform to import deadlines. Skip it if you prefer.</p>
      <div class="integrations">${D.INTEGRATIONS.map((i) => integrationRow(i)).join('')}</div>
      ${isJudge() ? '<p class="demo-note"><span class="demo-tag">DEMO</span> Connections are simulated in this build.</p>' : ''}
      <p class="small muted">You can always connect more platforms later in Settings.</p>
      <div class="ob-nav">
        <button class="btn ghost" data-action="obBack">Back</button>
        <button class="btn primary" data-action="obNext">Continue</button>
      </div>`;
  }
  const INT_ICON = { gcal: 'week', canvas: 'doc', teams: 'braindump', classroom: 'tasks' };
  function integrationRow(i) {
    const st = getIntegrationState(i.id);
    const status = st.status; // 'idle' | 'connecting' | 'connected' | 'error' | 'unavailable'
    let info = '';
    let btn = '';

    if (status === 'connecting') {
      info = `<b>${esc(i.name)}</b><br><small class="connecting-text"><span class="int-spinner" aria-hidden="true"></span> Connecting…</small>`;
      btn = `<button class="btn small ghost" aria-label="Cancel connecting ${esc(i.name)}" data-action="cancelIntegration" data-id="${i.id}">Cancel</button>`;
    } else if (status === 'connected') {
      const syncInfo = st.lastSync ? esc(st.lastSync) : 'Connected';
      const acct = st.account ? `<span class="int-account">${esc(st.account)}</span> · ` : '';
      info = `<b>${esc(i.name)}</b><br><small class="int-meta">${acct}${syncInfo}</small>`;
      btn = `<button class="btn small ghost danger-hover" aria-label="Disconnect ${esc(i.name)}" data-action="disconnectIntegration" data-id="${i.id}">Disconnect</button>`;
    } else if (status === 'error') {
      const errMsg = st.error ? esc(st.error) : 'Connection failed.';
      info = `<b>${esc(i.name)}</b><br><small class="int-error" role="alert">${errMsg}</small>`;
      btn = `<button class="btn small" aria-label="Try connecting ${esc(i.name)} again" data-action="connectIntegration" data-id="${i.id}">Try again</button>`;
    } else if (status === 'unavailable') {
      info = `<b>${esc(i.name)}</b><br><small class="muted">${esc(i.desc)}</small>`;
      btn = `<button class="btn small ghost" disabled aria-disabled="true">Coming soon</button>`;
    } else { // 'idle'
      info = `<b>${esc(i.name)}</b><br><small class="muted">${esc(i.desc)}</small>`;
      btn = `<button class="btn small" aria-label="Connect ${esc(i.name)}" data-action="connectIntegration" data-id="${i.id}">Connect</button>`;
    }

    return `<div class="integration" data-id="${i.id}" data-state="${status}"><span class="int-icon" aria-hidden="true">${ICON[i.icon] || ICON[INT_ICON[i.id]] || ICON.doc}</span><div class="int-info">${info}</div>${btn}</div>`;
  }

  function obDump() {
    const ob = ui.ob;
    if (ob.review) return obReview();
    return `
      <h1 class="ob-title">Brain dump</h1>
      <p class="ob-sub">What's on your plate right now? Don't worry about formatting. Just dump it.</p>
      ${dictaphone('ob.dumpText')}
      <label class="divider" for="dump-ob"><span>or type it out</span></label>
      <textarea id="dump-ob" rows="5" data-bind="ob.dumpText" placeholder="e.g. Database proposal due Friday, about 3 hours. Study for my math quiz on Wednesday…">${esc(ob.dumpText)}</textarea>
      ${isJudge() ? '<button class="demo-link" data-action="obSampleDump"><span class="demo-tag">DEMO</span> Use Alex\'s example</button>' : ''}
      <div class="ob-nav">
        <button class="btn ghost" data-action="obBack">Back</button>
        <button class="btn primary" data-action="obParseDump" ${ob.parsingDump ? 'disabled aria-disabled="true"' : ''}>${ob.parsingDump ? '<span class="int-spinner" aria-hidden="true"></span> Extracting…' : 'Extract tasks'}</button>
      </div>`;
  }

  /** Items that still need the student's answer are listed first (design.md §12.6). */
  const needsAnswer = (it) => (it.kind === 'task' && (it.ambiguous || it.task.deadline == null)) || it.kind === 'contradiction' || it.kind === 'unclear' ||
    (it.kind === 'event' && it.conflicts.hard.length && !it.resolution) || (it.kind === 'recurring' && it.conflicts.length && !it.resolution);
  // Order is fixed when the review opens, so answering a question doesn't make cards jump.
  const answerFirst = (items) => items.map((it, n) => {
    if (it.askFirst === undefined) it.askFirst = !!needsAnswer(it);
    return [it, n];
  }).sort((x, y) => (y[0].askFirst ? 1 : 0) - (x[0].askFirst ? 1 : 0) || x[1] - y[1]);
  const estLegend = () => `<p class="legend small"><span class="est-dur">≈ 2 hrs</span> <span class="chip est">AI estimate</span> means SIKAD guessed the time from the task type. Change it if you know better.</p>`;

  /** The confirmed baseline, shown again before the first plan so it can be corrected (brief Stage 3). */
  function baselineSummary() {
    const b = state.baseline;
    const ftf = [...new Set(b.classes.filter((c) => c.mode === 'FTF').map((c) => c.day))].sort().map((d) => T.DAY_SHORT[d]);
    return `
      <section class="card baseline-sum" aria-labelledby="bs-title">
        <h2 id="bs-title">Your baseline</h2>
        <ul class="plain">
          <li><span>${ICON.lock}<b>${b.classes.length} weekly class${b.classes.length === 1 ? '' : 'es'}</b> (fixed)${ftf.length ? ` · face-to-face on ${ftf.join(', ')}` : ''}</span><button class="btn small" data-action="obGoto" data-step="1" aria-label="Edit classes">Edit</button></li>
          <li><span class="num"><b>Planning day</b> ${T.hmLabel(b.dayStart)}–${T.hmLabel(b.dayEnd)} · commute ${b.commuteMins ? T.dur(b.commuteMins) : 'none'} · 15 min buffer around tasks</span><button class="btn small" data-action="obGoto" data-step="2" aria-label="Edit routine">Edit</button></li>
          <li><span class="num">${b.recurring.length ? b.recurring.map((r) => `${ICON.lock}<b>${esc(r.title)}</b> every ${T.DAY_SHORT[r.day]} ${T.hmLabel(r.start)}–${T.hmLabel(r.end)}`).join('<br>') : 'No other weekly commitments'}</span><button class="btn small" data-action="obGoto" data-step="2" aria-label="Edit weekly commitments">Edit</button></li>
        </ul>
      </section>`;
  }

  function obReview() {
    const items = ui.ob.review;
    const tasks = items.filter((it) => it.kind === 'task');
    const skipped = items.filter((it) => it.kind !== 'task' && !['stress', 'unclear', 'duplicate'].includes(it.kind)).length;
    const unclear = items.find((it) => it.kind === 'unclear');
    return `
      <h1 class="ob-title">Review before planning</h1>
      <p class="ob-sub">Check your baseline and each task. Nothing is scheduled until you generate the plan.</p>
      ${baselineSummary()}
      <h2 class="list-h">Tasks I caught (${tasks.length})</h2>
      ${tasks.some((t) => t.task.isAiEstimate) ? estLegend() : ''}
      <div class="review-list">${answerFirst(items).map(([it, n]) => it.kind === 'task' ? taskReviewCard(it, `ob.review.${n}`, n, 'ob') : '').join('')}</div>
      ${!tasks.length ? (unclear
        ? `<div class="status-panel s-clarify">${ICON.question}<div><b>Can you be more specific?</b><p>${esc(P.unclearQuestion(unclear))}</p></div></div>`
        : `<div class="status-panel s-neutral">${ICON.info}<div><b>No tasks found</b><p>Try listing what's due and when.</p></div></div>`) : ''}
      ${skipped ? `<p class="small muted">${skipped} other item(s), like schedule changes, can be added from the dashboard after setup.</p>` : ''}
      <div class="ob-nav">
        ${tasks.some((t) => t.include) ? '' : '<p class="nav-reason">Include at least one task to continue.</p>'}
        <button class="btn ghost" data-action="obEditDump">Edit text</button>
        <button class="btn primary" data-action="obGenerate" ${tasks.some((t) => t.include) ? '' : 'disabled'}>Generate my schedule</button>
      </div>`;
  }

  function obGenerating() {
    const steps = ['Analyzing your class schedule…', 'Calculating commute buffers…', 'Finding your best time gaps…', 'Prioritizing tasks by deadline & difficulty…', 'Building your plan…'];
    const cur = Math.min(ui.ob.genStep, steps.length - 1);
    return `
      <div class="generating">
        ${LOGO}
        <h1 class="ob-title">Building your plan</h1>
        <ol class="gen-steps">${steps.map((st, i) => `<li class="${i < ui.ob.genStep ? 'done' : i === ui.ob.genStep ? 'doing' : ''}">
          <span class="gen-mark" aria-hidden="true">${i < ui.ob.genStep ? ICON.check : i === ui.ob.genStep ? '<span class="gen-dot"></span>' : ''}</span>
          <span>${st}</span><span class="sr-only">${i < ui.ob.genStep ? '(done)' : i === ui.ob.genStep ? '(in progress)' : ''}</span></li>`).join('')}</ol>
        <p class="sr-only" aria-live="polite">${esc(steps[cur])}</p>
      </div>`;
  }

  // ------------------------------------------------------------ dictaphone --
  // Voice capture (brief §7): ready → recording (Stop / Cancel) → transcript lands in the
  // editable text field → the same review/confirm workflow as typed input. It only
  // captures and transcribes; interpreting and replanning happen elsewhere. No audio is
  // stored or uploaded by SIKAD: the browser's own speech recognition does the work.
  const speechSupported = () => !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  const VOICE_ERRORS = {
    'not-allowed': 'Microphone access was blocked. Allow it in your browser\'s site settings, or type instead.',
    'service-not-allowed': 'Microphone access was blocked. Allow it in your browser\'s site settings, or type instead.',
    network: 'The browser\'s speech service could not be reached. It needs an internet connection. You can type instead.',
    'no-speech': 'No speech was heard. Try again a little closer to the microphone, or type instead.',
    'audio-capture': 'No microphone was found. Connect one, or type instead.',
  };
  function dictaphone(path) {
    const d = ui.dict && ui.dict.path === path ? ui.dict : null;
    if (d && d.state === 'recording') {
      return `<div class="dict recording">
        <div class="dict-status" role="status"><span class="rec-dot" aria-hidden="true"></span><b>Recording</b><span id="dict-time" class="num">0:00</span></div>
        <p id="dict-interim" class="dict-interim" aria-live="polite">${esc(d.final + d.interim) || 'Listening…'}</p>
        <div class="row dict-controls"><button class="btn" data-action="dictStop">Stop and use text</button><button class="btn ghost" data-action="dictCancel">Cancel</button></div>
      </div>`;
    }
    const note = d && d.note === 'transcribed' ? `<p class="voice-note">${ICON.check}<span>Transcribed by your browser. Check the text below before sending.</span></p>`
      : d && d.note === 'demo' ? `<p class="voice-note">${isJudge() ? '<span class="demo-tag">DEMO</span>' : ''}<span>Sample transcript inserted. It did not come from your microphone.</span></p>`
      : d && d.note === 'cancelled' ? `<p class="voice-note">${ICON.info}<span>Recording cancelled. Nothing was added.</span></p>`
      : d && d.error ? `<p class="voice-note is-error" role="alert">${ICON.alert}<span>${esc(d.error)}</span></p>` : '';
    if (!speechSupported()) {
      return `<div class="dict unsupported">
        <p class="voice-note">${ICON.info}<span>Voice capture needs a browser with speech recognition (Chrome or Edge). This browser does not have it, so type below instead.</span></p>
        ${isJudge() ? `<button class="demo-link" data-action="dictDemo" data-path="${path}"><span class="demo-tag">DEMO</span> Insert a sample transcript</button>` : ''}
        ${note}
      </div>`;
    }
    return `<div class="dict ready">
      <button class="mic" data-action="dictStart" data-path="${path}" aria-label="Start recording">${ICON.mic}</button>
      <div class="mic-label">Start recording</div>
      ${note}
      ${isJudge() && d && d.error ? `<button class="demo-link" data-action="dictDemo" data-path="${path}"><span class="demo-tag">DEMO</span> Insert a sample transcript</button>` : ''}
    </div>`;
  }
  /**
   * Show a validation error directly under its field, link it with aria-describedby,
   * mark the field invalid and focus it. Cleared when the student edits the field.
   */
  function flagField(input, message) {
    if (!input) return;
    clearFieldError(input);
    const id = `err-${input.id || input.name || input.dataset.bind || 'field'}`.replace(/[^\w-]/g, '-');
    const p = document.createElement('p');
    p.className = 'field-error'; p.id = id; p.setAttribute('role', 'alert');
    p.innerHTML = `${ICON.alert}<span>${esc(message)}</span>`;
    (input.closest('label') || input).insertAdjacentElement('afterend', p);
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', id);
    input.focus();
  }
  function clearFieldError(input) {
    const id = input.getAttribute && input.getAttribute('aria-describedby');
    if (!input.hasAttribute || !input.hasAttribute('aria-invalid')) return;
    const p = id && document.getElementById(id);
    if (p) p.remove();
    input.removeAttribute('aria-invalid'); input.removeAttribute('aria-describedby');
  }

  /** Editable card for an extracted task (used in onboarding + brain dump review). */
  function taskReviewCard(it, path, n, scope) {
    const t = it.task;
    const needsDate = t.deadline == null;
    const qid = `q-${scope}-${n}`;
    return `
      <article class="review-card ${it.include ? '' : 'excluded'}">
        <div class="rc-head">
          <input class="rc-title" value="${esc(t.title)}" data-bind="${path}.task.title" aria-label="Task name">
          <label class="toggle"><input type="checkbox" ${it.include ? 'checked' : ''} data-bind="${path}.include" data-rerender> Add to plan</label>
        </div>
        ${t.context ? `<div class="rc-context">${esc(t.context)}</div>` : ''}
        ${t.dependsOnTitle ? `<p class="small rc-note">${ICON.chevron}Starts after: <b>${esc(t.dependsOnTitle)}</b> is finished.</p>` : ''}
        ${it.ambiguous ? `<div class="clarify" tabindex="-1" data-question>${ICON.question}<div><p id="${qid}"><b>${esc(it.clarification)}</b></p>
          <div class="chips" role="radiogroup" aria-labelledby="${qid}">${it.ambiguous.map((o, k) =>
            `<button class="chip-btn" role="radio" aria-checked="false" data-action="pickAmbiguous" data-scope="${scope}" data-n="${n}" data-k="${k}">${esc(o.label)}</button>`).join('')}</div></div></div>`
          : needsDate ? `<div class="clarify" tabindex="-1" data-question>${ICON.question}<div><p id="${qid}"><b>${esc(it.clarification || 'When is this due? I need the date to schedule it.')}</b></p>
            <p class="small">SIKAD won't guess a deadline. Without one, this is saved but not scheduled. Set the due date below.</p></div></div>` : ''}
        <div class="rc-grid">
          <label class="${needsDate && !it.ambiguous ? 'needs-answer' : ''}">Due
            <input type="datetime-local" value="${t.deadline != null ? T.toInput(t.deadline) : ''}" data-bind="${path}.task.deadline" data-type="dt" data-rerender ${needsDate ? `aria-describedby="${qid}"` : ''}>
          </label>
          <label>Time needed ${t.isAiEstimate ? estChip() : ''}
            <span class="hrs-input ${t.isAiEstimate ? 'is-est' : ''}">${t.isAiEstimate ? '<span aria-hidden="true">≈</span>' : ''}<input type="number" min="0.25" step="0.25" value="${hrs(t.durationMins)}" data-bind="${path}.task.durationMins" data-type="hrs" data-est="${path}.task.isAiEstimate"> hrs</span>
          </label>
          <label>Priority
            <select data-bind="${path}.task.priority">${['high', 'medium', 'low'].map((p) => `<option value="${p}" ${p === t.priority ? 'selected' : ''}>${PRI_LABEL[p]}</option>`).join('')}</select>
          </label>
        </div>
        ${t.parts && t.parts.length ? `<div class="rc-parts"><span class="small">${t.parts.some((p) => p.aiSuggested) ? 'Suggested steps' : 'Parts'}:</span> ${t.parts.map((p) => `<span class="chip">${esc(p.title)} · ${T.dur(p.mins)}</span>`).join(' ')}</div>` : ''}
      </article>`;
  }


  // ============================================================== APP SHELL ==
  function judgeDock() {
    if (!isJudge()) return '';
    const isOpen = !!ui.judgeDockOpen;
    const obStep = !state.onboarded ? ui.ob.step : -1;
    let sampleButtons = '';
    if (obStep === 0) {
      sampleButtons = '<button class="btn small" data-action="loadDemo">Load Alex\'s week</button>';
    } else if (obStep === 1) {
      sampleButtons = '<button class="btn small" data-action="obSampleCor">Use sample COR</button>';
    } else if (obStep === 4) {
      sampleButtons = '<button class="btn small" data-action="obSampleDump">Use Alex\'s example</button>';
    }
    const dictShortcut = (ui.dict || ui.sheet) ? `<button class="btn small" data-action="dictDemo" data-path="${ui.sheet ? 'sheet.text' : 'ob.dumpText'}">Sample transcript</button>` : '';
    const focusSkipShortcut = (state.active && state.active.status === 'running') ? '<button class="btn small" data-action="focusSkip" data-mins="5">Skip 5m</button>' : '';

    return `
      <div class="judge-dock" id="judge-dock">
        ${isOpen ? `
          <div class="judge-dock-panel" role="region" aria-label="Judge tools panel">
            <div class="judge-dock-header">
              <span class="judge-title">Judge tools</span>
              <button class="icon-btn small" data-action="toggleJudgeDock" aria-label="Close judge tools">${ICON.close}</button>
            </div>
            <div class="judge-dock-section">
              <span class="judge-label">Clock (${T.DAY_SHORT[T.dow(now())]} ${T.time(now())})</span>
              <div class="judge-clock-row">
                <button class="clock-step" data-action="advance" data-mins="15" aria-label="Advance 15 minutes">+15m</button>
                <button class="clock-step" data-action="advance" data-mins="60" aria-label="Advance 1 hour">+1h</button>
                <button class="clock-step" data-action="nextMorning" aria-label="Next day">Next day</button>
                <button class="clock-step" data-action="openClock" aria-label="Set demo clock">Set time</button>
              </div>
            </div>
            <div class="judge-dock-section judge-actions-row">
              <button class="btn small" data-action="loadDemo">Load Alex's week</button>
              <button class="btn small" data-action="loadDemoConfirm">Reset demo</button>
              <button class="btn small ghost" data-action="openEngine">View engine JSON</button>
            </div>
            ${sampleButtons || dictShortcut || focusSkipShortcut ? `
              <div class="judge-dock-section">
                <span class="judge-label">Shortcuts</span>
                <div class="judge-actions-row">
                  ${sampleButtons}
                  ${dictShortcut}
                  ${focusSkipShortcut}
                </div>
              </div>` : ''}
          </div>` : ''}
        <button class="judge-dock-toggle" data-action="toggleJudgeDock" aria-expanded="${isOpen}">
          <span>Judge tools</span>
        </button>
      </div>`;
  }

  function shell() {
    const views = { home: homeView, week: weekView, tasks: tasksView, profile: profileView };
    return `
      <div class="screen app">
        <button class="skip-link" data-action="skipToMain">Skip to main content</button>
        ${isJudge() ? judgeDock() : ''}
        <main class="view" id="main" tabindex="-1">${views[ui.tab]()}</main>
        <nav class="bottom-nav" aria-label="Main">
          <div class="rail-brand" aria-hidden="true">${LOGO}<span class="rail-title">SIKAD</span></div>
          ${navBtn('home', 'Home', ICON.home)}
          ${navBtn('week', 'Overview', ICON.week)}
          <button class="fab" data-action="openDump" aria-label="Ask SIKAD: ask about your plan, add a task or report a change"><span class="fab-circle">${ICON.braindump}</span><span class="fab-label">Ask SIKAD</span></button>
          ${navBtn('tasks', 'Tasks', ICON.tasks)}
          ${navBtn('profile', 'Profile', ICON.user)}
        </nav>
      </div>`;
  }
  const navBtn = (tab, label, icon) => `<button class="nav-btn ${ui.tab === tab ? 'on' : ''}" data-action="tab" data-tab="${tab}" ${ui.tab === tab ? 'aria-current="page"' : ''}>${icon}<span>${label}</span></button>`;

  /** Demo-only chrome (design.md §7.12): dashed, mono-labelled, never mistaken for product UI. */
  function clockBar() {
    return `
      <div class="clock-bar" role="group" aria-label="Demo clock (demo only)">
        <span class="demo-tag" aria-hidden="true">DEMO</span>
        <button class="clock-now" data-action="openClock" aria-label="Set the demo clock, now ${T.short(now())} ${T.time(now())}"><b class="num">${T.DAY_SHORT[T.dow(now())]} ${T.time(now())}</b></button>
        <button class="clock-step" data-action="advance" data-mins="15" aria-label="Advance demo clock 15 minutes">+15m</button>
        <button class="clock-step" data-action="advance" data-mins="60" aria-label="Advance demo clock 1 hour">+1h</button>
        <button class="clock-step" data-action="nextMorning" aria-label="Jump demo clock to next morning">Next day</button>
      </div>`;
  }

  // ------------------------------------------------------------------ HOME --
  function homeView() {
    if (ui.focusOnly) {
      return `<header class="home-head"><div class="eyebrow">${T.date(now())}</div><h1>One thing at a time</h1></header>
        ${focusCard()}
        <button class="btn ghost block" data-action="showFullPlan" data-flip="full-plan">Show my full plan</button>`;
    }
    return `
      <header class="home-head">
        <div class="eyebrow">${T.date(now())}</div>
        <h1>Hey, ${esc(state.user.name || 'there')}</h1>
      </header>
      ${updateCard()}
      ${checkinCards()}
      <div class="home-cols">
        <div class="home-col-left">
          ${focusCard()}
          <div id="attention" tabindex="-1">${attentionBlock()}</div>
          ${weekCard()}
        </div>
        <div class="home-col-right">
          <section class="section">
            <div class="section-head" data-flip="tl-head">
              <h2>${ui.dayView === 'today' ? "Today's timeline" : "Tomorrow's preview"}</h2>
              <div class="seg" role="tablist" aria-label="Day to show">
                <button role="tab" aria-selected="${ui.dayView === 'today'}" class="${ui.dayView === 'today' ? 'on' : ''}" data-action="dayView" data-v="today">Today</button>
                <button role="tab" aria-selected="${ui.dayView === 'tomorrow'}" class="${ui.dayView === 'tomorrow' ? 'on' : ''}" data-action="dayView" data-v="tomorrow">Tomorrow</button>
              </div>
            </div>
            ${timeline(T.dayStart(now()) + (ui.dayView === 'tomorrow' ? T.DAY : 0))}
          </section>
        </div>
      </div>`;
  }

  const ACTION_WORD = { RESCHEDULE: 'Moved', SCHEDULE: 'Added', COMPLETE: 'Completed', CANCEL: 'Removed', UNSCHEDULED: "Couldn't fit" };
  /** One before → after row of the replan summary (design.md §7.8). */
  function changeLine(c) {
    const n = now();
    const when = (x) => `${T.rel(x.start, n)} ${T.timeShort(x.start)}`;
    let detail = '';
    const resized = c.action === 'RESCHEDULE' && c.from.start === c.to.start;
    if (resized) detail = `<b>${when(c.to)}</b> · now ${T.dur(c.to.mins)}`;
    else if (c.action === 'RESCHEDULE') detail = `<s><span class="sr-only">was </span>${when(c.from)}</s> <span aria-hidden="true">→</span><span class="sr-only">now</span> <b>${when(c.to)}</b>`;
    else if (c.action === 'SCHEDULE') detail = `<b>${when(c.to)}</b>`;
    else if (c.action === 'UNSCHEDULED') detail = 'see "Not enough time" below';
    return `<span class="ch-title">${esc(c.title)}</span><span class="ch-detail num">${detail}</span><span class="chip ch-${c.action.toLowerCase()}">${resized ? 'Resized' : ACTION_WORD[c.action] || c.action}</span>`;
  }

  let updateDismissTimer = null;
  function updateCard() {
    const u = state.lastUpdate;
    if (!u) {
      if (updateDismissTimer) { clearTimeout(updateDismissTimer); updateDismissTimer = null; }
      return '';
    }
    if (!updateDismissTimer) {
      updateDismissTimer = setTimeout(() => {
        state.lastUpdate = null;
        updateDismissTimer = null;
        render();
      }, 8000);
    }
    const next = E.nextSession(state.plan, now());
    const shown = u.changes.slice(0, 6);
    const short = u.status === 'INFEASIBLE';
    const skipped = /cancel|skip/i.test(u.trigger + ' ' + u.notes.join(' '));
    return `
      <section class="status-card ${short ? 's-neutral' : 's-success'} update" role="status" aria-labelledby="upd-title" data-flip="upd" data-flip-exit>
        <div class="sc-head">${ICON.check}<h2 id="upd-title">Plan updated</h2><button class="icon-btn" data-action="dismissUpdate" aria-label="Dismiss plan update">${ICON.close}</button></div>
        <p class="small">Because: ${esc(u.trigger)}</p>
        ${u.notes.map((x) => `<p class="small">${esc(x)}</p>`).join('')}
        ${shown.length ? `<ul class="changes">${shown.map((c) => `<li>${changeLine(c)}</li>`).join('')}</ul>${u.changes.length > shown.length ? `<p class="small">+${u.changes.length - shown.length} more</p>` : ''}`
          : '<p class="small">Nothing else needed to move.</p>'}
        ${short ? `<p class="small upd-warn">${ICON.hourglass}<span>Some work doesn't fit. See "Not enough time" below.</span></p>` : ''}
        <p class="small upd-fixed">${ICON.lock}<span>Fixed commitments unchanged${skipped ? ', except the one you chose to cancel or skip' : ''}.</span></p>
        ${next ? `<p class="small upd-next">${ICON.step}<span>Next: <b>${esc(next.title)}</b> · <span class="num">${T.rel(next.start, now())} ${T.timeShort(next.start)}</span></span></p>` : ''}
      </section>`;
  }

  function checkinCards() {
    return state.checkins.slice(-2).map((c) => {
      const moved = state.plan.find((x) => x.unitId === c.unitId);
      return `
        <section class="status-card s-clarify checkin" aria-labelledby="ci-${esc(c.id)}" data-flip="ci:${esc(c.id)}" data-flip-exit>
          <div class="sc-head">${ICON.undo}<h2 id="ci-${esc(c.id)}">Did you finish ${esc(c.title)}?</h2></div>
          <p class="num">It was planned for ${T.rel(c.start, now()).toLowerCase()}, ${T.range(c.start, c.end)}.</p>
          <p>${moved ? `In case you didn't, it's already moved to <b class="num">${T.rel(moved.start, now())} ${T.timeShort(moved.start)}</b>.` : "In case you didn't, it's back in your queue."}</p>
          <div class="row"><button class="btn small" data-action="checkinDone" data-id="${c.id}">${ICON.check} Yes, done</button><button class="btn small ghost" data-action="checkinNo" data-id="${c.id}">Not yet</button></div>
        </section>`;
    }).join('');
  }

  // "Start Database Proposal" reads well; "Start Study for…" doesn't (copy only).
  const STARTS_WITH_VERB = /^(study|buy|review|write|read|prepare|finish|do|practice|submit|pay|clean|pick|call|email|send|make|work|plan|draft|build|test|rehearse|outline)\b/i;

  function focusCard() {
    const n = now();
    const active = state.active ? state.plan.find((x) => x.id === state.active.sessionId) : null;
    const next = active || E.nextSession(state.plan, n);
    const pendingTasks = state.tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress');
    if (!next) {
      const stuck = pendingTasks.length > 0;
      return `<section class="focus empty" aria-labelledby="focus-title" data-flip="focus"><div class="focus-label">${ICON.step}<span>What to do next</span></div>
        <h2 id="focus-title" tabindex="-1">${stuck ? 'Nothing fits right now' : "You're all clear."}</h2>
        <p>${stuck ? 'Some tasks need a deadline or more time. <button class="link on-dark-link" data-action="scrollAttention">See what needs attention</button>.' : 'No pending tasks. Open Ask SIKAD when something new comes up.'}</p></section>`;
    }
    const task = taskById(next.taskId);
    const [main, part] = next.title.split(' — ');
    const nowFixed = E.currentFixed(state, n);
    const beforeNext = E.occurrences(state, T.dayStart(n)).find((o) => !o.soft && o.start > n && o.start < next.start);
    const startsNow = next.start <= n + 15 * T.MIN;
    const why = E.explain(state, state.plan, next, n);
    const durLabel = task && task.isAiEstimate ? `<span class="est-dur">≈ ${T.dur(next.mins)}</span>` : T.dur(next.mins);
    const sessionMeta = next.sessions > 1 ? ` · Session ${next.session}/${next.sessions}` : '';
    const longMeta = next.mins >= 90 ? ' · Long session' : '';
    const focusChips = [];
    if (task && task.source) focusChips.push(`<span class="chip src-chip">${esc(task.source)}</span>`);
    if (task && task.context) focusChips.push(`<span class="chip">${esc(task.context)}</span>`);
    if (task) focusChips.push(priChip(task.priority));
    if (task && task.isAiEstimate && focusChips.length < 3) focusChips.push(estChip());
    return `
      <section class="focus ${active ? 'active' : ''}" aria-labelledby="focus-title" data-flip="focus" data-sid="${esc(next.id)}">
        <div class="focus-head" data-enter="fh:${esc(next.id)}">
        <div class="focus-label">${active ? `<span class="live-dot ${state.active.status === 'running' ? '' : 'is-still'}" aria-hidden="true"></span><span>${state.active.status === 'paused' ? 'Paused' : state.active.status === 'awaiting' ? 'Session ended' : 'In progress'}</span>` : `${ICON.step}<span>What to do next</span>`}</div>
        ${nowFixed && !active ? `<div class="focus-now">${ICON.lock}<span>Right now: ${esc(nowFixed.title)} until <span class="num">${T.timeShort(nowFixed.end)}</span></span></div>` : ''}
        <h2 id="focus-title" tabindex="-1"><span class="strike">${!active && startsNow && !STARTS_WITH_VERB.test(main) ? 'Start ' : ''}${esc(main)}</span></h2>
        ${part ? `<div class="focus-part"><span class="strike">— ${esc(part)}</span></div>` : ''}
        <div class="focus-time num">${ICON.clock}<span><span class="nowrap">${T.rel(next.start, n)} · ${T.range(next.start, next.end)}</span> · <span class="nowrap">${durLabel}</span>${sessionMeta}${longMeta}</span></div>
        <div class="focus-tags">${focusChips.slice(0, 3).join('')}</div>
        ${beforeNext && !active ? `<div class="focus-before">${ICON.lock}<span>Before that: ${esc(beforeNext.title)} · <span class="num">${T.range(beforeNext.start, beforeNext.end)}</span></span></div>` : ''}
        </div>
        ${ui.focusPick === next.id ? focusPicker(next, task) : active ? focusActive(next, task) : `<div data-enter="fm:idle:${esc(next.id)}">
          ${why ? `<div class="why"><b>Why this?</b> ${esc(why)}</div>` : ''}
          <div class="focus-actions">
            <button class="btn primary" data-action="start" data-id="${next.id}">${ICON.play} Start task</button>
            <button class="btn on-dark" data-action="done" data-id="${next.id}" aria-label="Done: mark ${esc(next.title)} complete">${ICON.check} Done</button>
            <button class="btn on-dark" data-action="snooze" data-id="${next.id}" aria-label="Snooze: move to your next open block">Snooze</button>
          </div></div>`}
      </section>`;
  }

  // ------------------------------------------------------------ Focus Mode --
  /** Facts the working-method suggestion is based on (all read from the current plan). */
  function focusContext(session, task) {
    const n = now();
    const ref = Math.max(n, session.start);
    const day = T.dayStart(ref);
    const busy = E.occurrences(state, day).filter((o) => o.start > ref).sort((x, y) => x.start - y.start)[0];
    const dayEnd = T.at(day, state.baseline.dayEnd);
    const windowEnd = busy ? busy.start - state.baseline.bufferMins * T.MIN : dayEnd;
    const nextFixed = E.occurrences(state, day).filter((o) => !o.soft && o.start >= session.end).sort((x, y) => x.start - y.start)[0] || null;
    return {
      sessionMins: session.mins, windowMins: Math.max(0, Math.round((windowEnd - ref) / T.MIN)),
      remainingTaskMins: task ? S.taskRemaining(task) : session.mins, taskType: task ? task.type : 'task', nextFixed,
      pendingSteps: task ? task.parts.filter((p) => !p.done).map((p) => ({ title: p.title, mins: p.remainingMins })) : [],
    };
  }

  /** Step 1 of Focus Mode: suggest a working method, explain why, and let the student pick another or none. */
  function focusPicker(session, task) {
    const rec = F.recommend(focusContext(session, task));
    const chosen = ui.focusMethod || (state.active ? state.active.method : rec.method);
    const last = state.prefs.focusMethod;
    const inProgress = state.active && state.active.sessionId === session.id;
    return `
      <div class="method" role="group" aria-labelledby="method-title" data-enter="fm:picker">
        <div class="method-rec">
          <div class="method-eyebrow">Suggested way to work</div>
          <h3 id="method-title">${esc(rec.name)}</h3>
          <p>${esc(rec.reason)}</p>
          <p class="num method-structure">${esc(rec.structure)}</p>
        </div>
        <div class="method-options" role="radiogroup" aria-label="Working method">
          ${rec.options.map((o) => `<button class="method-opt ${chosen === o.method ? 'on' : ''}" role="radio" aria-checked="${chosen === o.method}" data-action="focusMethod" data-v="${o.method}">
            <span class="mo-name">${chosen === o.method ? ICON.check : ''}${esc(o.name)}${o.recommended ? ' <span class="mo-tag">Suggested</span>' : ''}${last === o.method && !o.recommended ? ' <span class="mo-tag">Last used</span>' : ''}</span>
            <span class="mo-desc num">${esc(o.structure)}</span></button>`).join('')}
        </div>
        <p class="method-note">A suggestion from this session's length and your schedule. Pick whatever suits you.</p>
        <div class="focus-actions">
          ${inProgress
            ? `<button class="btn primary" data-action="focusApplyMethod" data-id="${session.id}">${ICON.check} Apply method</button>
               <button class="btn on-dark" data-action="focusCancel">Back to session</button>`
            : `<button class="btn primary" data-action="focusBegin" data-id="${session.id}">${ICON.play} Start session</button>
               <button class="btn on-dark" data-action="focusCancel">Back</button>`}
        </div>
      </div>`;
  }

  /** Step 2: the running session (timer, Pause/Resume, End), then the "is it complete?" question. */
  function focusActive(session, task) {
    const a = state.active;
    const t = F.timer(a, S.focusElapsedMs(a));
    const m = F.METHODS[a.method] || F.METHODS.none;
    if (a.status === 'awaiting') {
      const partial = ui.focusPartial;
      const guess = Math.max(15, Math.round(Math.max(0, session.mins - t.focusedMins) / 15) * 15);
      return `
        <div class="outcome" role="group" aria-labelledby="outcome-title" data-enter="fm:outcome">
          <h3 id="outcome-title" tabindex="-1">Is this piece of work complete?</h3>
          <p>${t.finished ? 'The timer finished. ' : ''}You focused for <b class="num">${T.dur(Math.max(1, t.focusedMins))}</b> using ${esc(m.name.toLowerCase())}. A finished timer does not mark the task done. You decide.</p>
          ${partial ? `
            <label class="on-dark-label" for="focus-left">Time still needed for ${esc(session.title.split(' — ').pop())}</label>
            <span class="hrs-input"><input id="focus-left" type="number" min="0.25" step="0.25" value="${hrs(guess)}"> hrs</span>
            <div class="focus-actions">
              <button class="btn primary" data-action="focusSavePartial">Save and replan</button>
              <button class="btn on-dark" data-action="focusPartialBack">Back</button>
            </div>` : `
            <div class="focus-actions outcome-actions">
              <button class="btn primary" data-action="focusOutcome" data-v="complete">${ICON.check} Yes, it's complete</button>
              <button class="btn on-dark" data-action="focusOutcome" data-v="partial">Partly done</button>
              <button class="btn on-dark" data-action="focusOutcome" data-v="unfinished">Not yet</button>
            </div>
            <button class="link on-dark-link" data-action="focusKeepWorking">Keep working instead</button>`}
        </div>`;
    }
    const steps = a.method === 'chunking' && a.steps ? a.steps : null;
    const paused = a.status === 'paused';
    return `
      <div class="session" data-enter="fm:session">
        <div class="session-method"><span>Method: <b>${esc(m.name)}</b> · <button class="link on-dark-link" data-action="openFocusPicker" data-id="${session.id}">Change</button></span><span id="focus-phase">${esc(paused ? 'Paused' : t.label)}</span></div>
        <div class="timer-row"><span id="focus-timer" class="num" role="timer" aria-label="${t.remainingMs == null ? 'Time focused' : 'Time left'}">${F.clock(t.remainingMs == null ? t.elapsedMs : t.remainingMs)}</span>
          <span class="timer-note">${t.remainingMs == null ? 'focused so far' : t.phase === 'break' ? 'of break left' : 'left'}</span></div>
        ${steps ? `<ol class="session-steps">${steps.map((st) => `<li>${esc(st.title)} <span class="num">${T.dur(st.mins)}</span></li>`).join('')}</ol>` : ''}
        <div class="focus-actions">
          ${paused ? `<button class="btn primary" data-action="focusResume">${ICON.play} Resume</button>` : ''}
          <button class="btn ${paused ? 'on-dark' : 'primary'}" data-action="focusOutcome" data-v="complete" aria-label="Mark done: ${esc(session.title)} is complete">${ICON.check} Mark done</button>
          ${paused ? '' : '<button class="btn on-dark" data-action="focusPause">Pause</button>'}
          <button class="btn on-dark" data-action="focusEnd" aria-label="Stop early: end this session and say how it went">Stop early</button>
        </div>
        <button class="link on-dark-link spot-toggle" data-action="spotlightToggle" aria-pressed="${!ui.spotlightOff}">${ui.spotlightOff ? 'Dim everything else' : 'Show my plan'}</button>
        ${isJudge() ? '<button class="demo-skip" data-action="focusSkip" data-mins="5"><span class="demo-tag">DEMO</span> Skip ahead 5 min</button>' : ''}
      </div>`;
  }

  /** Engine statuses that need the student (design.md §8): ERROR, needs-deadline, INFEASIBLE, warnings, info. */
  function attentionBlock() {
    const out = [];
    if (ui.error) {
      out.push(`
        <section class="status-card s-critical" role="alert" aria-labelledby="err-title" data-flip="err" data-flip-exit>
          <div class="sc-head">${ICON.alert}<h2 id="err-title">Couldn't update your plan</h2></div>
          <p>Your plan hasn't changed. ${esc(ui.error.detail || '')}</p>
          <div class="row">${ui.error.retrySheet ? '<button class="btn small" data-action="retryError">Try again</button>' : ''}<button class="btn small ghost" data-action="dismissError">Dismiss</button></div>
        </section>`);
    }
    for (const id of state.needsDeadline || []) {
      const t = taskById(id);
      if (!t) continue;
      out.push(`
        <section class="status-card s-clarify" aria-labelledby="nd-${t.id}" data-flip="nd:${t.id}" data-flip-exit>
          <div class="sc-head">${ICON.question}<h2 id="nd-${t.id}">When is "${esc(t.title)}" due?</h2></div>
          <p>SIKAD won't guess a deadline. Add the date and it gets scheduled.</p>
          <div class="row"><label class="sr-only" for="dl-${t.id}">Deadline for ${esc(t.title)}</label><input type="datetime-local" id="dl-${t.id}"><button class="btn small" data-action="setDeadline" data-id="${t.id}">Schedule it</button></div>
        </section>`);
    }
    const unsched = state.unscheduled || [];
    if (unsched.length) {
      const crit = (state.alerts || []).find((a) => a.level === 'CRITICAL');
      const lows = unsched.filter((u) => (taskById(u.taskId) || {}).priority === 'low');
      out.push(`
        <section class="status-card s-critical infeasible" aria-labelledby="inf-title" data-flip="inf" data-flip-exit>
          <div class="sc-head">${ICON.hourglass}<h2 id="inf-title">Not enough time</h2></div>
          ${crit ? `<p class="num">${esc(crit.message)}</p>` : ''}
          <ul class="unsched">${unsched.map((u) => `<li>
            <div><b>${esc(u.title)}</b><span class="num"> · ${T.dur(u.mins)}${u.deadline ? ` · due ${T.short(u.deadline)}` : ''}</span>
            <div class="small">${u.reason === 'blocked' ? `Waiting on: ${esc(u.waitingOn || 'an earlier step')}` : 'No open block before the deadline'}</div></div>
            <button class="btn small" data-action="openTask" data-id="${u.taskId}" aria-label="Adjust ${esc(u.title)}">Adjust</button></li>`).join('')}</ul>
          <details class="triage"><summary>${ICON.chevron}Review options</summary>
            <ul class="options">
              <li>Shorten a task's scope (Adjust → Time needed)</li>
              <li>Check if a deadline can move, then update it</li>
              ${lows.length ? `<li>Defer low-priority work like "${esc(lows[0].title)}"</li>` : ''}
              <li>Free up time by cancelling or moving a commitment you control</li>
            </ul>
          </details>
          <p class="small">SIKAD won't squeeze work into time you don't have, or push it past a deadline.</p>
        </section>`);
    }
    const warns = (state.alerts || []).filter((a) => a.level === 'WARNING' && !/needs a deadline|waiting on/.test(a.message));
    if (warns.length) out.push(`<section class="status-card s-clarify alerts" data-flip="warn" data-flip-exit>${warns.map((w) => `<p class="alert-line">${ICON.alert}<span>${esc(w.message)}</span></p>`).join('')}</section>`);
    const infos = (state.alerts || []).filter((a) => a.level === 'INFO');
    if (infos.length) out.push(`<section class="status-panel s-info" data-flip="info" data-flip-exit>${ICON.info}<div>${infos.map((w) => `<p>${esc(w.message)}</p>`).join('')}</div></section>`);
    return out.join('');
  }

  /**
   * Weekly progress (brief §10). Metric, from S.weeklyProgress: work credited this week
   * against work credited + still planned this week (Mon–Sun). Rescheduling changes the
   * plan side only. No streaks, points or badges.
   */
  function weekCard() {
    const w = S.weeklyProgress(state);
    const cap = E.capacity(state, now());
    const short = cap.required > cap.free;
    const unsched = (state.unscheduled || []).length > 0;
    const verdict = short ? `${T.dur(cap.required - cap.free)} short` : unsched ? 'Not all fits' : 'Fits';
    const from = ui.prevPct == null ? w.percent : ui.prevPct;
    const sessions = state.focusLog.slice(-5).reverse();
    const win = ui.celebrate;
    const outcomeWord = { complete: 'Completed', partial: 'Partly done', unfinished: 'Not finished yet' };
    const totalHrs = w.totalMins ? T.dur(w.totalMins) : '0 hrs';
    const doneHrs = T.dur(w.doneMins);
    const summaryLine = `${doneHrs} of ${totalHrs} done · ${w.focusSessions} session${w.focusSessions === 1 ? '' : 's'} · ${verdict}`;
    return `
      <section class="card week ${win ? 'win' : ''}" aria-labelledby="week-title" data-flip="week">
        <div class="fit-head"><h2 id="week-title">This week</h2>${w.totalMins ? `<span class="week-pct num">${win ? ICON.check : ''}${w.percent}%</span>` : ''}</div>
        <div class="bar week-bar" role="img" aria-label="${T.dur(w.doneMins)} done of ${T.dur(w.totalMins)} planned this week"><span style="--from:${from}%;width:${w.percent}%"></span></div>
        <p class="small num week-line"><b>${esc(summaryLine)}</b></p>
        ${sessions.length ? `<details class="session-log"><summary>${ICON.chevron}Recent focus sessions (${state.focusLog.length})</summary>
          <ul class="plain small num">${sessions.map((f) => `<li><span><b>${esc(f.title)}</b><br>${T.short(f.at)} · ${esc((F.METHODS[f.method] || F.METHODS.none).name)} · ${T.dur(Math.max(1, f.focusedMins))} focused · ${outcomeWord[f.outcome] || f.outcome}</span></li>`).join('')}</ul></details>` : ''}
      </section>`;
  }

  /** "Does it all fit?" — optional workload visual (story §22), kept below the Focus Card (design.md §7.7). */
  function fitCard() {
    const cap = E.capacity(state, now());
    const short = cap.required > cap.free;
    // Weekly totals can fit while a single deadline doesn't; never say "Fits" when work is unscheduled.
    const unsched = (state.unscheduled || []).length > 0;
    const pct = cap.free ? Math.min(100, Math.round((cap.required / cap.free) * 100)) : 100;
    const verdict = short ? `${ICON.alert}${T.dur(cap.required - cap.free)} short` : unsched ? `${ICON.hourglass}Not all of it` : `${ICON.check}Fits`;
    return `
      <section class="card fit" aria-labelledby="fit-title" data-flip="fit">
        <div class="fit-head"><h2 id="fit-title">Does it all fit?</h2><span class="fit-verdict ${short || unsched ? 'bad' : 'good'}">${verdict}</span></div>
        <div class="bar ${short || unsched ? 'over' : ''}" role="img" aria-label="${T.dur(cap.required)} of work against ${approx(cap.free)} of open time"><span style="width:${pct}%"></span></div>
        <div class="fit-legend small num"><span><b>${T.dur(cap.required)}</b> of work due by ${T.DAY_SHORT[T.dow(cap.until)]}</span><span><b>${approx(cap.free)}</b> open</span></div>
      </section>`;
  }

  // -------------------------------------------------------------- timeline --
  function timeline(dayMs) {
    const n = now();
    const b = state.baseline;
    const items = [];
    for (const o of E.occurrences(state, dayMs)) items.push({ kind: o.kind, fixed: !o.soft, soft: o.soft, title: o.title, start: o.start, end: o.end, mode: o.mode, occ: o });
    for (const s of state.plan.filter((x) => T.dayStart(x.start) === dayMs)) items.push({ kind: 'task', title: s.title, start: s.start, end: s.end, session: s });
    for (const h of state.history.filter((x) => T.dayStart(x.start) === dayMs)) items.push({ kind: 'done', title: h.title, start: h.start, end: h.end, taskId: h.taskId, id: h.id, partial: !!h.partial });
    for (const c of state.checkins.filter((x) => T.dayStart(x.start) === dayMs)) items.push({ kind: 'missed', title: c.title, start: c.start, end: c.end, unitId: c.unitId, id: c.id });
    // Open gaps worth knowing about.
    let free = E.freeSlots(state, Math.max(n, T.at(dayMs, b.dayStart)), T.at(dayMs, b.dayEnd));
    for (const s of state.plan) free = free.flatMap((f) => (s.end + 15 * T.MIN <= f.start || s.start - 15 * T.MIN >= f.end) ? [f]
      : [{ start: f.start, end: s.start - 15 * T.MIN }, { start: s.end + 15 * T.MIN, end: f.end }].filter((x) => x.end - x.start >= 45 * T.MIN));
    for (const f of free) if (f.end - f.start >= 45 * T.MIN) items.push({ kind: 'free', title: 'Open time', start: f.start, end: f.end });
    items.sort((a, c) => a.start - c.start || (a.kind === 'done' ? -1 : 0));
    if (!items.length) return '<p class="muted empty-tl">Nothing on this day.</p>';

    const nextId = (state.active && state.active.sessionId) || (E.nextSession(state.plan, n) || {}).id;
    const isToday = dayMs === T.dayStart(n);
    let nowPlaced = !isToday;
    const nowLine = `<li class="tl-now" data-flip="now"><span class="num">Now · ${T.time(n)}</span></li>`;
    const rows = [];
    for (const it of items) {
      if (!nowPlaced && it.start > n) { rows.push(nowLine); nowPlaced = true; }
      rows.push(tlRow(it, n, nextId));
    }
    if (!nowPlaced) rows.push(nowLine);
    return `<ol class="timeline" aria-label="Schedule for ${T.date(dayMs)}">${rows.join('')}</ol>`;
  }

  /** The latest replan's RESCHEDULE entry for this session, if any (marks it "Moved" until dismissed). */
  function movedInfo(session) {
    const u = state.lastUpdate;
    if (!u) return null;
    return u.changes.find((c) => c.action === 'RESCHEDULE' && c.to && c.title === session.title && c.to.start === session.start) || null;
  }

  /**
   * Stable identity for a timeline row across renders, so a replan can slide the same card to its new
   * slot (motion-spec §4). A completed session keeps its session's key: the row turns into its Done row.
   */
  function flipKey(it) {
    if (it.kind === 'task') return `s:${it.session.id}`;
    if (it.kind === 'done') return it.partial || !it.id ? `h:${it.id || it.start}` : `s:${String(it.id).split('@')[0]}`;
    if (it.kind === 'missed') return `m:${it.id}`;
    if (it.occ) return `f:${it.occ.id}:${it.start}`;
    return `o:${it.kind}:${it.start}`;
  }

  /** One step on the day's path (design.md §7.4): square node = fixed, round = flexible, Butter ring = next. */
  function tlRow(it, n, nextId) {
    const past = it.end <= n && !['done', 'missed'].includes(it.kind);
    const current = it.start <= n && n < it.end;
    const range = T.range(it.start, it.end);
    let title = esc(it.title), meta = range, action = '', icon = '', node = 'n-soft', label = '', chips = '';
    if (it.fixed) {
      icon = ICON.lock; node = 'n-fixed';
      const type = it.kind === 'class' ? `Class · ${it.mode === 'FTF' ? 'Face-to-face' : 'Online'}` : it.occ.source === 'temporary' ? 'One-time' : 'Weekly';
      meta += ` · ${type}`;
      action = `data-action="openFixed" data-id="${esc(it.occ.id)}" data-day="${T.dayStart(it.start)}"`;
      label = `${it.title}, ${type}, fixed, ${range}`;
    } else if (it.kind === 'task') {
      const t = taskById(it.session.taskId);
      const isNext = it.session.id === nextId;
      node = isNext ? 'n-next' : 'n-flex';
      icon = ICON.task;
      action = `data-action="openTask" data-id="${it.session.taskId}"`;
      const est = t && t.isAiEstimate;
      meta += ` · ${est ? `<span class="est-dur">≈ ${T.dur(it.session.mins)}</span>` : T.dur(it.session.mins)}`;
      if (it.session.sessions > 1) meta += ` · part ${it.session.session}/${it.session.sessions}`;
      const moved = movedInfo(it.session);
      if (moved) meta = `<s><span class="sr-only">was </span>${T.rel(moved.from.start, n)} ${T.timeShort(moved.from.start)}</s> → ${meta}`;
      if (state.active && state.active.sessionId === it.session.id) chips += '<span class="chip live">In progress</span>';
      else if (isNext) chips += '<span class="chip now">Next</span>';
      if (moved) chips += '<span class="chip moved">Moved</span>';
      if (t && t.source) chips += `<span class="chip src-chip">${esc(t.source)}</span>`;
      if (t) chips += priChip(t.priority);
      if (est) chips += estChip();
      label = `${it.title}, task${est ? ', AI estimate' : ''}, ${range}`;
    } else if (it.kind === 'done') {
      icon = ICON.check; node = 'n-done';
      meta = it.start === it.end ? `Completed · ${T.time(it.start)}` : `${range} · Done`;
    } else if (it.kind === 'missed') {
      icon = ICON.undo; node = 'n-missed';
      const moved = state.plan.find((x) => x.unitId === it.unitId);
      meta += ` · Not marked done${moved ? ` — moved to ${T.rel(moved.start, n)} ${T.timeShort(moved.start)}` : ''}`;
    } else if (it.kind === 'free') {
      node = 'n-free';
      meta = `${range} · ${T.dur((it.end - it.start) / T.MIN)} free`;
    } else {
      icon = { commute: ICON.bus, lunch: ICON.meal, routine: ICON.sunrise }[it.kind] || '';
    }
    const cls = ['tl-item', `k-${it.kind}`, it.fixed ? 'fixed' : '', past ? 'past' : '', current ? 'current' : '', it.session && movedInfo(it.session) ? 'just-moved' : ''].join(' ');
    const tag = action ? 'button' : 'div';
    const leaves = it.kind === 'task' || it.kind === 'missed';
    return `<li class="${cls}" data-flip="${esc(flipKey(it))}" ${leaves ? 'data-flip-exit' : ''} ${it.session ? `data-sid="${esc(it.session.id)}"` : ''}><div class="tl-time num">${T.timeShort(it.start)}</div><div class="tl-rail" aria-hidden="true"><span class="tl-node ${node}"></span></div>
      <${tag} class="tl-card" ${action} ${label ? `aria-label="${esc(label)}${current ? ', happening now' : ''}"` : ''}>
        <div class="tl-title">${icon ? `<span class="tl-icon" aria-hidden="true">${icon}</span>` : ''}<span class="tl-name">${title}</span>${current ? '<span class="chip now">Now</span>' : ''}</div>
        <div class="tl-meta num">${meta}</div>${chips ? `<div class="tl-chips">${chips}</div>` : ''}</${tag}></li>`;
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
    const over = cap.required > cap.free;
    const pct = cap.free ? Math.min(100, Math.round((cap.required / cap.free) * 100)) : 100;
    const compact = (m) => (m ? `${Math.round((m / 60) * 10) / 10}h` : '—');
    return `
      <header class="home-head"><h1>Overview</h1></header>
      <section class="card fit" aria-labelledby="cap-title" data-flip="cap">
        <div class="fit-head"><h2 id="cap-title">Available vs. required</h2><span class="fit-verdict ${over ? 'bad' : 'good'}">${over ? `${ICON.alert}Over capacity` : `${ICON.check}Fits`}</span></div>
        <div class="bar ${over ? 'over' : ''}" role="img" aria-label="${T.dur(cap.required)} of tasks against ${approx(cap.free)} of usable time"><span style="width:${pct}%"></span></div>
        <p class="small num">You have <b>${approx(cap.free)}</b> of usable time in the next 7 days and <b>${T.dur(cap.required)}</b> of tasks due in that window.</p>
      </section>
      <div class="daystrip" role="tablist" aria-label="Pick a day">
        ${stats.map((st) => {
          const load = st.planned + st.free ? Math.round((st.planned / (st.planned + st.free)) * 100) : 0;
          const name = st.d === today ? 'Today' : T.DAY_SHORT[T.dow(st.d)];
          return `<button class="daychip ${st.d === sel ? 'on' : ''}" data-action="pickDay" data-day="${st.d}" role="tab" aria-selected="${st.d === sel}"
            aria-label="${T.date(st.d)}: ${st.planned ? T.dur(st.planned) + ' planned' : 'nothing planned'}, ${approx(st.free)} open">
            <span>${name}</span><b class="num">${T.parts(st.d).d}</b>
            <i class="load" style="--load:${load}%"></i><small class="num">${compact(st.planned)}</small></button>`;
        }).join('')}
      </div>
      <p class="small muted strip-legend">Bar and hours = time planned for tasks that day.</p>
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
      <header class="home-head"><h1>Tasks</h1></header>
      <button class="btn block" data-action="newTask">${ICON.plus} Add a task manually</button>
      ${attention.length ? `<h2 class="list-h" data-flip="lh:attention">Needs attention</h2>${attention.map(taskCard).join('')}` : ''}
      ${upcoming.length ? `<h2 class="list-h" data-flip="lh:next">Up next</h2>${upcoming.map(taskCard).join('')}` : ''}
      ${!open.length ? '<p class="muted empty-tl">No open tasks. Open Ask SIKAD to add one.</p>' : ''}
      ${done.length ? `<details class="done-list" data-flip="done-list"><summary>Completed (${done.length})</summary>${done.map(taskCard).join('')}</details>` : ''}`;
  }

  function taskCard(t) {
    const n = now();
    const total = S.taskTotal(t), rem = S.taskRemaining(t);
    const next = state.plan.filter((s) => s.taskId === t.id).sort((a, b) => a.start - b.start)[0];
    const unsched = (state.unscheduled || []).some((u) => u.taskId === t.id);
    const isExam = t.type === 'exam' || t.type === 'quiz';
    const overdue = t.deadline != null && t.deadline <= n && t.status !== 'done';
    const status = t.status === 'done' ? 'Done' : t.status === 'in_progress' ? 'In progress' : t.deadline == null ? 'Needs a deadline' : unsched ? "Doesn't fit yet" : 'Scheduled';
    const statusCls = t.status === 'done' ? 'st-done' : t.deadline == null ? 'st-clarify' : unsched ? 'st-critical' : '';
    const est = t.isAiEstimate ? `<span class="est-dur">≈ ${T.dur(total)}</span> ${estChip()}` : T.dur(total);
    return `
      <button class="task-card ${t.status}" data-action="openTask" data-id="${t.id}" data-flip="t:${t.id}">
        <div class="tc-head"><h3><span class="tc-icon" aria-hidden="true">${t.status === 'done' ? ICON.check : ICON.task}</span>${esc(t.title)}</h3>${t.source ? `<span class="chip src-chip">${esc(t.source)}</span>` : ''}${t.status === 'done' ? '' : priChip(t.priority)}</div>
        ${t.context ? `<div class="tc-context">${esc(t.context)}</div>` : ''}
        <dl class="tc-meta num">
          <div><dt>${isExam ? 'Exam' : 'Due'}</dt><dd class="${overdue ? 'overdue' : ''}">${overdue ? `${ICON.alert}<b>Overdue</b> · ` : ''}${t.deadline != null ? (isExam ? T.short(t.deadline) : `${T.short(t.deadline)}, ${T.time(t.deadline)}`) : 'Not set'}</dd></div>
          <div><dt>Est</dt><dd>${est}${rem < total && t.status !== 'done' ? ` <span class="muted">(${T.dur(rem)} left)</span>` : ''}</dd></div>
          <div><dt>Status</dt><dd class="${statusCls}">${status}${t.doFirst ? ' · Do first (your choice)' : ''}</dd></div>
          ${next ? `<div><dt>Next</dt><dd>${T.rel(next.start, n)}, ${T.timeShort(next.start)}</dd></div>` : ''}
        </dl>
        ${t.parts && t.parts.length ? `<ul class="subtasks">${t.parts.map((p) => `<li class="${p.done ? 'is-done' : ''}"><span class="st-box" aria-hidden="true">${p.done ? ICON.check : ''}</span>${esc(p.title)} <span class="muted num">${T.dur(p.mins)}</span><span class="sr-only">${p.done ? '(done)' : ''}</span></li>`).join('')}</ul>` : ''}
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
    const daysOrder = [1, 2, 3, 4, 5, 6, 0];
    const dayGroups = daysOrder.map((d) => {
      const dayClasses = b.classes
        .filter((c) => c.day === d)
        .sort((a, b) => T.hmToMins(a.start) - T.hmToMins(b.start));
      if (!dayClasses.length) return null;
      const totalMins = dayClasses.reduce((sum, c) => sum + (T.hmToMins(c.end) - T.hmToMins(c.start)), 0);
      const countLabel = `${dayClasses.length} ${dayClasses.length === 1 ? 'class' : 'classes'}`;
      const hrsLabel = T.dur(totalMins);
      return {
        day: d,
        dayName: T.DAY_NAMES[d],
        header: `${T.DAY_NAMES[d]} · ${countLabel} · ${hrsLabel}`,
        classes: dayClasses,
      };
    }).filter(Boolean);
    const upcomingEvents = state.events.filter((e) => e.end > now()).sort((a, c) => a.start - c.start);
    return `
      <header class="home-head"><h1>${esc(state.user.name || 'You')}</h1></header>
      ${appearanceCard()}
      <div class="profile-cols">
        <div class="profile-col-left">
          <section class="card settings sec-classes">
            <div class="list-head"><h2>Class schedule</h2><span class="fixed-tag">${ICON.lock}Fixed</span></div>
            ${dayGroups.length ? dayGroups.map((g) => `
              <h3 class="class-day-header">${esc(g.header)}</h3>
              <ul class="plain fixed-list">
                ${g.classes.map((c) => `
                  <li>
                    <span class="num">${ICON.lock}<b>${esc(c.title)}</b> · ${T.hmLabel(c.start)}–${T.hmLabel(c.end)} · <small class="muted">${c.mode === 'FTF' ? 'Face-to-face' : 'Online'}</small></span>
                    <button class="remove-btn" aria-label="Remove ${esc(c.title)} on ${esc(g.dayName)}" data-action="removeClass" data-id="${c.id}">Remove</button>
                  </li>
                `).join('')}
              </ul>
            `).join('') : '<p class="muted">No classes.</p>'}
            <details class="add"><summary>${ICON.plus}Add a class</summary>
              <div class="grid2 add-form" id="add-class">
                <label>Subject<input name="title" placeholder="e.g. IT 302"></label>
                <label>Day<select name="day">${[1, 2, 3, 4, 5, 6, 0].map((d) => `<option value="${d}">${T.DAY_NAMES[d]}</option>`).join('')}</select></label>
                <label>Start<input type="time" name="start" value="08:00"></label>
                <label>End<input type="time" name="end" value="10:00"></label>
                <label>Mode<select name="mode"><option>FTF</option><option>Online</option></select></label>
                <button class="btn small" data-action="addClass">Add class</button>
              </div>
            </details>
          </section>
        </div>
        <div class="profile-col-right">
          <section class="card settings sec-your-day">
            <h2>Your day</h2>
            <div class="grid2">
              <label>Day starts<select data-setting="dayStart">${timeOpts(b.dayStart, 240, 600)}</select></label>
              <label>Latest scheduling<select data-setting="dayEnd">${timeOpts(b.dayEnd, 1140, 1410)}</select></label>
              <label>Commute (FTF days)<select data-setting="commuteMins" data-type="int">${[0, 15, 30, 45, 60, 75, 90, 120].map((m) => `<option value="${m}" ${m === b.commuteMins ? 'selected' : ''}>${m ? T.dur(m) : 'None'}</option>`).join('')}</select></label>
              <label>Morning routine<select data-setting="routineMins" data-type="int">${[0, 15, 30, 45, 60].map((m) => `<option value="${m}" ${m === b.routineMins ? 'selected' : ''}>${m ? T.dur(m) : 'None'}</option>`).join('')}</select></label>
            </div>
            <label class="toggle"><input type="checkbox" data-setting="protectLunch" ${b.protectLunch ? 'checked' : ''}> Protect a lunch hour (12–1 PM) when free</label>
            <p class="small muted">SIKAD keeps a ${b.bufferMins}-minute transition buffer around every task. Changes here recalculate your plan, and you can undo them.</p>
          </section>

          <section class="card settings sec-recurring">
            <div class="list-head"><h2>Recurring commitments</h2><span class="fixed-tag">${ICON.lock}Fixed</span></div>
            <ul class="plain fixed-list">${b.recurring.map((r) => `<li><span class="num">${ICON.lock}<b>${esc(r.title)}</b> · Weekly · ${T.DAY_NAMES[r.day]} ${T.hmLabel(r.start)}–${T.hmLabel(r.end)}</span><button class="remove-btn" aria-label="Remove ${esc(r.title)}" data-action="removeRecurring" data-id="${r.id}">Remove</button></li>`).join('') || '<li class="muted">None yet.</li>'}</ul>
            <details class="add"><summary>${ICON.plus}Add a weekly commitment</summary>
              <div class="grid2 add-form" id="add-rec">
                <label>Name<input name="title" placeholder="e.g. Org meeting"></label>
                <label>Type<select name="kind"><option value="work">Work</option><option value="org">Organization</option><option value="event">Other</option></select></label>
                <label>Day<select name="day">${[1, 2, 3, 4, 5, 6, 0].map((d) => `<option value="${d}">${T.DAY_NAMES[d]}</option>`).join('')}</select></label>
                <label>Start<input type="time" name="start" value="17:00"></label>
                <label>End<input type="time" name="end" value="19:00"></label>
                <button class="btn small" data-action="addRecurringForm">Add</button>
              </div>
            </details>
            ${upcomingEvents.length ? `<h3>One-time commitments</h3><ul class="plain fixed-list">${upcomingEvents.map((e) => `<li><span class="num">${ICON.lock}<b>${esc(e.title)}</b> · One-time · ${T.short(e.start)} ${T.range(e.start, e.end)}</span><button class="remove-btn" aria-label="Remove ${esc(e.title)}" data-action="removeEvent" data-id="${e.id}">Remove</button></li>`).join('')}</ul>` : ''}
            ${state.cancellations.length ? `<h3>Cancelled sessions</h3><ul class="plain">${state.cancellations.map((c) => `<li><span>${esc(cancellationLabel(c))}</span><button class="btn small" data-action="restoreOcc" data-id="${esc(c)}" aria-label="Restore ${esc(cancellationLabel(c))}">Restore</button></li>`).join('')}</ul>` : ''}
          </section>

          <section class="card settings sec-integrations">
            <h2>Connected platforms</h2>
            <div class="integrations">${D.INTEGRATIONS.map(integrationRow).join('')}</div>
            ${isJudge() ? '<p class="demo-note"><span class="demo-tag">DEMO</span> Connections are simulated in this build.</p>' : ''}
          </section>

          <section class="card settings sec-limits">
            <h2>How SIKAD plans & its limits</h2>
            <ul class="plain limits-list">
              <li>SIKAD plans your time. It doesn't do your schoolwork or write graded work for you.</li>
              <li>It isn't a counselor or a health tool, and it doesn't judge your stress. If things feel like too much, talk to someone you trust or your school's guidance office.</li>
              <li>Times marked ≈ are guesses. Change them anytime.</li>
              <li>A plan isn't a promise. SIKAD can't guarantee grades or that everything fits. It shows you when it doesn't.</li>
              <li>Your classes and fixed commitments never move unless you change them. You decide.</li>
              <li>Your data stays on this device, unless you connect an account.</li>
            </ul>
          </section>

          <section class="card settings sec-guide">
            <div class="list-head">
              <h2>App guide & tutorial</h2>
              <span class="fixed-tag" style="background:var(--sage-tint); color:var(--forest);">${ICON.step}4 slides</span>
            </div>
            <p class="small">Review how SIKAD works: fixed baseline protection, the single-task Focus Card, and guilt-free replanning.</p>
            <button class="btn block" data-action="openTutorial">${ICON.play}Revisit app tour</button>
          </section>

          ${isJudge() ? `
          <section class="card settings demo-section sec-engine">
            <div class="list-head"><h2>Under the hood</h2><span class="demo-tag">DEMO</span></div>
            <p class="small">Every extraction and replan produces the JSON contract from prompt.md (Phase 1–3).</p>
            <button class="btn block" data-action="openEngine">View engine output (JSON)</button>
            <button class="btn block" data-action="loadDemoConfirm">Reset demo to the initial scenario</button>
          </section>` : ''}

          <section class="card settings sec-reset">
            <h2>Reset</h2>
            <p class="small">Erases everything on this device and restarts setup.</p>
            <button class="btn small danger" data-action="resetAll">Reset & restart setup</button>
          </section>
          <p class="muted small center version-text" data-action="versionTap" style="margin-top:24px; cursor:pointer; user-select:none; text-align:center;">SIKAD v1.0</p>
        </div>
      </div>`;
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
    const inner = { dump: dumpSheet, proposal: proposalSheet, task: taskSheet, fixed: fixedSheet, clock: clockSheet, engine: engineSheet, import: importSheet }[sh.type]();
    return `<div class="sheet-backdrop" data-action="backdrop"><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
      <div class="sheet-grip" aria-hidden="true"></div><button class="icon-btn sheet-close" data-action="closeSheet" aria-label="Close">${ICON.close}</button>${inner}</div></div>`;
  }

  // ---------- Brain dump (capture + review) ----------
  /** One answered question in the Ask SIKAD thread. The answer text comes from js/assistant.js. */
  function askEntry(e, i, lastIdx) {
    const a = e.a;
    return `<div class="ask-item">
      <p class="ask-q"><span class="sr-only">You asked: </span>${esc(e.q)}</p>
      <div class="ask-a ${a.missing ? 'is-missing' : ''}" ${i === lastIdx ? 'id="ask-latest" tabindex="-1"' : ''}>
        <h3>${esc(a.title)}</h3>
        ${a.lines.map((l) => `<p>${esc(l)}</p>`).join('')}
        ${a.facts.length ? `<dl class="ask-facts num">${a.facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}
      </div>
    </div>`;
  }

  /** Ask SIKAD (brief §8): a supporting panel for questions and updates, not a full-screen chat. */
  function dumpSheet() {
    const sh = ui.sheet;
    if (sh.mode === 'review') return dumpReview();
    const form = sh.input === 'form';
    const thread = ui.askThread.slice(-2);
    return `
      <h2 id="sheet-title"><span class="title-icon">${ICON.braindump}</span>Ask SIKAD</h2>
      <p class="sheet-sub">Ask about your plan, add a task, or say what changed. Nothing in your plan changes until you confirm it.</p>
      ${thread.length ? `<div class="ask-thread" aria-label="Recent answers">${thread.map((e, i) => askEntry(e, i, thread.length - 1)).join('')}</div>` : ''}
      <div class="tabs" role="tablist" aria-label="Input method">
        <button role="tab" aria-selected="${!form}" class="${!form ? 'on' : ''}" data-action="dumpInput" data-v="text">Speak or type</button>
        <button role="tab" aria-selected="${form}" class="${form ? 'on' : ''}" data-action="dumpInput" data-v="form">Form</button>
      </div>
      ${form ? manualForm() : `
        ${dictaphone('sheet.text')}
        <label class="divider" for="dump-text"><span>or type it</span></label>
        <textarea id="dump-text" rows="3" data-bind="sheet.text" placeholder="e.g. How much usable time do I have tomorrow?">${esc(sh.text || '')}</textarea>
        ${sh.restored ? '<p class="small muted">Picked up the text you left here.</p>' : ''}
        <button class="btn primary block" data-action="processDump">Send</button>
        <div class="ask-examples"><p class="small" id="ask-ex">Try asking</p>
          <div class="chips" aria-labelledby="ask-ex">${D.QUESTIONS.map((q, i) => `<button class="chip-btn" data-action="askExample" data-i="${i}">${esc(q)}</button>`).join('')}</div></div>
        ${isJudge() ? `
        <details class="scenarios" open>
          <summary><span class="demo-tag">DEMO</span> Demo scenarios</summary>
          <div class="chips">${D.SCENARIOS.map((sc, i) => `<button class="chip-btn" data-action="scenario" data-i="${i}">${esc(sc.label)}</button>`).join('')}</div>
        </details>` : ''}
        <p class="small muted">Answers are worked out from your current plan using fixed rules. No AI model is connected in this demo.</p>`}`;
  }

  function manualForm() {
    const f = ui.sheet.form || (ui.sheet.form = { title: '', deadline: null, durationMins: 60, priority: 'medium', notes: '' });
    return `
      <div class="form">
        <label>Task name <span class="req">(required)</span><input value="${esc(f.title)}" data-bind="sheet.form.title" placeholder="e.g. ADET report" required aria-required="true"></label>
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
      <h2 id="sheet-title">Here's what changed</h2>
      <blockquote class="quote">“${esc(sh.text)}”</blockquote>
      ${sh.items.some((it) => it.kind === 'task' && it.task.isAiEstimate) ? estLegend() : ''}
      <div class="review-list">${answerFirst(sh.items).map(([it, n]) => reviewItem(it, n)).join('')}</div>
      <div class="sheet-actions">
        ${blocking ? `<p class="nav-reason" id="apply-reason">${esc(blocking)}</p>` : ''}
        <button class="btn ghost" data-action="dumpEdit">Edit text</button>
        ${actionable ? `<button class="btn primary" data-action="applyDump" ${blocking ? 'disabled aria-describedby="apply-reason"' : ''}>See plan changes</button>` : '<button class="btn primary" data-action="closeSheet">Done</button>'}
      </div>`;
  }

  function dumpBlocking() {
    for (const it of ui.sheet.items) {
      if (!it.include) continue;
      if (it.kind === 'event' && it.conflicts.hard.length && !it.resolution) return 'Choose how to handle the conflict first.';
      if (it.kind === 'recurring' && it.conflicts.length && !it.resolution) return 'Choose how to handle the conflict first.';
      if (it.kind === 'contradiction' && !it.answer) return 'Answer the question above first.';
      if (it.kind === 'refuse' && it.addAsTask && it.deadline == null) return 'Add a due date so I can schedule the steps.';
      if (it.kind === 'partial' && !(it.remainingMins > 0)) return 'Enter how much time is still needed.';
    }
    return '';
  }

  const rcKind = (icon, text, cls = '') => `<div class="rc-kind ${cls}">${icon}<span>${text}</span></div>`;
  const choice = (n, action, current, v, label) =>
    `<button class="chip-btn ${current === v ? 'on' : ''}" role="radio" aria-checked="${current === v}" data-action="${action}" data-n="${n}" data-v="${v}">${current === v ? ICON.check : ''}${label}</button>`;

  /** CONFLICT (design.md §8): "Decision needed" — both commitments shown with locks; the student chooses. */
  function decisionBlock(n, it, body, options) {
    const qid = `decide-${n}`;
    return `<div class="decision" tabindex="-1" data-question>
      <div class="decision-head">${ICON.overlap}<b id="${qid}">Decision needed</b></div>
      <p>${body}</p>
      <div class="chips" role="radiogroup" aria-labelledby="${qid}">${options.map(([v, label]) => choice(n, 'resolve', it.resolution, v, label)).join('')}</div>
      <p class="small">SIKAD never skips a class or shift on its own. It only does that if you choose it here.</p></div>`;
  }

  function reviewItem(it, n) {
    const p = `sheet.items.${n}`;
    const n0 = now();
    switch (it.kind) {
      case 'task': return taskReviewCard(it, p, n, 'sheet');
      case 'extend': {
        const t = taskById(it.taskId); const left = t ? S.taskRemaining(t) : 0;
        return `<article class="review-card">${rcKind(ICON.clock, 'More time needed')}<p class="num"><b>${esc(it.title)}</b>: ${T.dur(left)} left → <b>${T.dur(left + it.addMins)} left</b> (+${T.dur(it.addMins)})</p>
          <p class="small rc-note">The plan will be recalculated around your fixed commitments. If it no longer fits before the deadline, SIKAD will say so.</p></article>`;
      }
      case 'complete_part':
        return `<article class="review-card">${rcKind(ICON.check, 'Part finished', 'k-success')}<p><b>${esc(it.title)} — ${esc(it.partTitle)}</b> will be marked done. The rest of the task stays on your plan.</p></article>`;
      case 'partial': {
        const t = taskById(it.taskId); const left = t ? S.taskRemaining(t) : 0;
        return `<article class="review-card">${rcKind(ICON.check, 'Part finished', 'k-success')}<p><b>${esc(it.title)}</b> has no named steps, so tell me what is left. It currently shows ${T.dur(left)}.</p>
          <label class="${it.remainingMins > 0 ? '' : 'needs-answer'}">Time still needed<span class="hrs-input"><input type="number" min="0.25" step="0.25" value="${it.remainingMins > 0 ? hrs(it.remainingMins) : ''}" data-bind="${p}.remainingMins" data-type="hrs" data-rerender> hrs</span></label></article>`;
      }
      case 'event': {
        const e = it.event;
        const hard = it.conflicts.hard;
        const range = `${T.short(e.start)}, ${T.range(e.start, e.end)}`;
        return `
          <article class="review-card fixed">
            ${rcKind(ICON.lock, 'New fixed commitment', 'k-fixed')}
            <div class="rc-head"><input class="rc-title" value="${esc(e.title)}" data-bind="${p}.event.title" aria-label="Commitment name"></div>
            <p class="small num"><b>${range}</b>${it.durationEstimated ? ' <span class="chip est">≈ 1 hr assumed</span>' : ''}</p>
            <p class="small rc-note"><b>${it.makeRecurring ? 'Weekly' : 'One-time'}</b>: ${it.makeRecurring ? `every ${T.DAY_NAMES[T.dow(e.start)]} from now on.` : `only affects ${T.short(e.start)}. Your regular schedule stays the same.`}
              <button class="link" data-action="toggleRecurring" data-n="${n}">${it.makeRecurring ? 'Make it one-time' : 'This happens every week'}</button></p>
            ${hard.length ? decisionBlock(n, it,
              `You already have ${hard.map((o) => `${ICON.lock}<b>${esc(o.title)}</b> (${T.range(o.start, o.end)})`).join(', ')}. ${esc(e.title)} overlaps it. Which one takes priority?`,
              [['keep', `Keep ${esc(hard[0].title)}`], ['prioritize', `Go to ${esc(e.title)} instead`], ['both', "Keep both (I'll sort it out)"]]) : ''}
            ${it.conflicts.soft.length ? `<p class="small rc-note">Note: overlaps your ${it.conflicts.soft.map((o) => o.title.toLowerCase()).join(' and ')}.</p>` : ''}
          </article>`;
      }
      case 'recurring': {
        const e = it.event;
        return `
          <article class="review-card fixed">
            ${rcKind(ICON.lock, 'New weekly commitment', 'k-fixed')}
            <p class="num"><b>${esc(e.title)}</b> · every ${e.days.map((d) => T.DAY_NAMES[d]).join(' & ')}, ${T.hmLabel(e.start)}–${T.hmLabel(e.end)}</p>
            <p class="small rc-note">Added to your baseline, so all future weeks plan around it.</p>
            ${it.conflicts.length ? decisionBlock(n, it,
              `It overlaps ${it.conflicts.map((c) => `${ICON.lock}<b>${esc(c.title)}</b> on ${c.dayName}s (${T.hmLabel(c.start)}–${T.hmLabel(c.end)})`).join(', ')}.`,
              [['both', 'Add anyway'], ['keep', "Don't add"]]) : ''}
          </article>`;
      }
      case 'cancel_occurrence':
        return `<article class="review-card">${rcKind(ICON.close, 'Cancelled (you said so)')}${it.occurrences.map((o) => `<p class="num">${ICON.lock}<b>${esc(o.title)}</b> · ${T.short(o.start)}, ${T.range(o.start, o.end)}</p>`).join('')}
          <p class="small rc-note">That frees ${T.dur(it.occurrences.reduce((a, o) => a + (o.end - o.start) / T.MIN, 0))}. Only this date changes; your weekly schedule stays the same.</p></article>`;
      case 'cancel_task': return `<article class="review-card">${rcKind(ICON.close, 'Remove task')}<p><b>${esc(it.title)}</b> will be removed from your plan.</p></article>`;
      case 'complete': return `<article class="review-card">${rcKind(ICON.check, 'Completed', 'k-success')}<p><b>${esc(it.title)}</b> will be marked done.</p></article>`;
      case 'missed': return `<article class="review-card">${rcKind(ICON.undo, "Didn't finish")}<p>No problem. The remaining work on <b>${esc(it.title)}</b> moves to your next open block.</p></article>`;
      case 'deadline_change': return `<article class="review-card">${rcKind(ICON.clock, `Deadline ${it.oldDeadline == null ? 'set' : 'changed'}`)}<p class="num"><b>${esc(it.title)}</b>: ${it.oldDeadline != null ? `<s><span class="sr-only">was </span>${T.short(it.oldDeadline)}</s> → ` : ''}<b>${T.short(it.deadline)}</b></p></article>`;
      case 'contradiction': {
        const qid = `contra-${n}`;
        return `<article class="review-card"><div class="clarify" tabindex="-1" data-question>${ICON.question}<div><p id="${qid}"><b>${esc(it.question)}</b></p>
          <div class="chips" role="radiogroup" aria-labelledby="${qid}">${choice(n, 'answer', it.answer, 'update', `It changed to ${T.short(it.deadline)}`)}${choice(n, 'answer', it.answer, 'keep', `Keep ${T.short(it.oldDeadline)}`)}</div></div></div></article>`;
      }
      case 'duplicate': {
        const t = taskById(it.taskId);
        return `<article class="review-card neutral">${rcKind(ICON.info, 'Already planned')}<p>“${esc(it.title)}” is already in your plan${t && t.deadline ? ` (due ${T.short(t.deadline)})` : ''}. Nothing to change.</p></article>`;
      }
      case 'refuse':
        return `<article class="review-card neutral">
          <p>I can't write your ${esc(it.noun)}, since that's your work to own. But I can help you get it done without the overwhelm. Here's how I'd break it down:</p>
          <ol class="steps">${it.breakdown.map(([st, m]) => `<li>${esc(st)} <span class="muted num">(${m} min)</span></li>`).join('')}</ol>
          <label class="toggle"><input type="checkbox" ${it.addAsTask ? 'checked' : ''} data-bind="${p}.addAsTask" data-rerender> Schedule these steps into my free time</label>
          ${it.addAsTask ? `<label class="${it.deadline == null ? 'needs-answer' : ''}">When is it due?<input type="datetime-local" value="${it.deadline != null ? T.toInput(it.deadline) : ''}" data-bind="${p}.deadline" data-type="dt" data-rerender></label>` : ''}
        </article>`;
      case 'stress': {
        const cap = E.capacity(state, n0);
        const due = state.tasks.filter((t) => t.status !== 'done' && t.status !== 'cancelled' && t.deadline != null && t.deadline <= cap.until).length;
        return `<article class="review-card neutral"><p>Let's look at your schedule and see what we can do. You have <b>${due} task${due === 1 ? '' : 's'}</b> due this week: about ${T.dur(cap.required)} of work, with ${approx(cap.free)} of open time.</p>
          <p>Want me to show you just the most urgent thing first?</p><button class="btn small" data-action="focusOnly">Show me just my next step</button></article>`;
      }
      case 'next': return `<article class="review-card neutral"><p>Your next step is always on the Focus Card at the top of Home.</p><button class="btn small" data-action="focusOnly">Show me</button></article>`;
      default:
        return `<article class="review-card"><div class="clarify" tabindex="-1" data-question>${ICON.question}<div><p><b>${esc(P.unclearQuestion(it))}</b></p>
          <div class="chips"><button class="chip-btn" data-action="template" data-v="I wasn't able to finish ">I missed a task</button>
          <button class="chip-btn" data-action="template" data-v="New assignment: ">New assignment</button>
          <button class="chip-btn" data-action="template" data-v="I have to ">Schedule change</button>
          <button class="chip-btn" data-action="template" data-v="Cancelled: ">Something got cancelled</button></div></div></div></article>`;
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

  /** Apply the confirmed items to the CURRENT `state` and replan. Returns false when there is nothing to do. */
  function applyItems(items) {
    const triggers = [], notes = [];
    for (const it of items) {
      if (!it.include) continue;
      const t = it.taskId ? taskById(it.taskId) : null;
      switch (it.kind) {
        case 'task': {
          const task = S.makeTask(state, it.task);
          if (it.task.dependsOnTitle && !task.dependencies.length) {
            const dep = state.tasks.find((x) => x.title === it.task.dependsOnTitle && x.status !== 'done' && x.status !== 'cancelled');
            if (dep) task.dependencies = [dep.id];
            else notes.push(`I could not link "${task.title}" to "${it.task.dependsOnTitle}". You can set that in the task's details.`);
          }
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
        case 'complete': if (t) { S.completeTask(state, t.id); triggers.push(`Completed: ${t.title}`); } break;
        case 'complete_part': if (t) { S.completePart(state, t.id, it.partId); triggers.push(`Finished: ${t.title} — ${it.partTitle}`); } break;
        case 'partial': if (t) { S.setTaskRemaining(state, t.id, it.remainingMins); triggers.push(`Partly done: ${t.title} (${T.dur(S.taskRemaining(t))} left)`); } break;
        case 'extend': if (t) { S.extendTask(state, t.id, it.addMins); triggers.push(`More time for ${t.title} (+${T.dur(it.addMins)})`); } break;
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
    if (!triggers.length && !notes.length) return false;
    S.replan(state, triggers.join(' · ') || 'Brain dump', { notes });
    return true;
  }

  /**
   * Student control (brief §3D, Stage 6): the confirmed input is applied to a COPY of the
   * state and replanned there. The student then sees the proposed plan changes and accepts
   * or rejects them. The real state (and what is saved) only changes on Accept.
   */
  function applyDump() {
    const sh = ui.sheet;
    const committed = state;
    let draft = null, changed = false;
    state = S.clone(committed);
    try { changed = applyItems(sh.items); draft = state; } finally { state = committed; }
    if (!changed) { ui.sheet = null; render(); return; }
    committed.engineLog = draft.engineLog.slice(); // the engine produced this output; keep it inspectable even if rejected
    ui.sheet = { type: 'proposal', draft, review: sh };
    render();
  }

  function proposalSheet() {
    const d = ui.sheet.draft, u = d.lastUpdate, n = d.now;
    const next = E.nextSession(d.plan, n);
    const short = d.status === 'INFEASIBLE';
    const crit = (d.alerts || []).find((x) => x.level === 'CRITICAL');
    const skipped = /cancel|skip/i.test(u.trigger + ' ' + u.notes.join(' '));
    return `
      <h2 id="sheet-title" tabindex="-1">Review the updated plan</h2>
      <p class="sheet-sub">This is a proposal. Nothing is saved until you accept it.</p>
      <p class="small">Because: ${esc(u.trigger)}</p>
      ${u.notes.map((x) => `<p class="small">${esc(x)}</p>`).join('')}
      <h3 class="list-h">What would change</h3>
      ${u.changes.length ? `<ul class="changes on-sheet">${u.changes.map((c) => `<li>${changeLine(c)}</li>`).join('')}</ul>` : '<p class="small">No other task needs to move.</p>'}
      ${short ? `<div class="status-panel s-critical" role="status">${ICON.hourglass}<div><b>Not enough time</b><p>${esc(crit ? crit.message : 'Some work would not fit before its deadline.')}</p>
        <p>Not fitting: ${(d.unscheduled || []).map((x) => `${esc(x.title)} (${T.dur(x.mins)})`).join(', ')}. No deadline or duration was changed to hide this.</p></div></div>` : ''}
      <p class="small upd-fixed">${ICON.lock}<span>Fixed commitments unchanged${skipped ? ', except the one you chose to cancel or skip' : ''}.</span></p>
      ${next ? `<p class="small upd-next">${ICON.step}<span>Next would be: <b>${esc(next.title)}</b> · <span class="num">${T.rel(next.start, n)} ${T.timeShort(next.start)}</span></span></p>` : ''}
      <div class="sheet-actions">
        <button class="btn" data-action="rejectProposal">Reject</button>
        <button class="btn ghost" data-action="editProposal">Edit</button>
        <button class="btn primary" data-action="acceptProposal">Accept changes</button>
      </div>`;
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
      <h2 id="sheet-title" tabindex="-1">Task details</h2>
      <p class="sheet-sub">Everything here is your call. Saving recalculates the plan.</p>
      <div class="form">
        <label>Task name<input value="${esc(d.title)}" data-bind="${p}.title"></label>
        <div class="grid2">
          <label>Deadline<input type="datetime-local" value="${d.deadline != null ? T.toInput(d.deadline) : ''}" data-bind="${p}.deadline" data-type="dt"></label>
          <label>Time needed ${d.isAiEstimate ? estChip() : ''}<span class="hrs-input ${d.isAiEstimate ? 'is-est' : ''}">${d.isAiEstimate ? '<span aria-hidden="true">≈</span>' : ''}<input type="number" min="0.25" step="0.25" value="${hrs(d.total)}" data-bind="${p}.total" data-type="hrs"> hrs</span></label>
          <label>Priority<select data-bind="${p}.priority">${['high', 'medium', 'low'].map((x) => `<option value="${x}" ${x === d.priority ? 'selected' : ''}>${PRI_LABEL[x]}</option>`).join('')}</select></label>
          <label>Schedule at (optional)<input type="datetime-local" value="${d.pinnedStart ? T.toInput(d.pinnedStart) : ''}" data-bind="${p}.pinnedStart" data-type="dt"></label>
        </div>
        <label class="toggle"><input type="checkbox" ${d.doFirst ? 'checked' : ''} data-bind="${p}.doFirst"> Do this first (overrides SIKAD's priority)</label>
        ${d.parts.length ? `<fieldset><legend>Steps</legend>${d.parts.map((x, i) => `
          <div class="part-row"><label class="toggle"><input type="checkbox" ${x.done ? 'checked' : ''} data-bind="${p}.parts.${i}.done" aria-label="Mark ${esc(x.title)} done"></label>
          <input value="${esc(x.title)}" data-bind="${p}.parts.${i}.title" aria-label="Step name"><span class="muted small nowrap">${T.dur(x.mins)}</span></div>`).join('')}</fieldset>` : ''}
        ${others.length ? `<label>Can only start after…<select data-bind="${p}.depSingle"><option value="">(no dependency)</option>${others.map((o) => `<option value="${o.id}" ${d.dependencies.includes(o.id) ? 'selected' : ''}>${esc(o.title)}</option>`).join('')}</select></label>` : ''}
        <label>Notes<textarea rows="2" data-bind="${p}.notes">${esc(d.notes)}</textarea></label>
      </div>
      ${sessions.length ? `<div class="sessions"><b class="small">Scheduled</b><ul class="plain small num">${sessions.map((s) => `<li>${T.short(s.start)}, ${T.range(s.start, s.end)}${s.partId ? ' · ' + esc(s.title.split(' — ').pop()) : ''}</li>`).join('')}</ul></div>` : ''}
      <div class="sheet-actions">
        ${t.status !== 'done' ? '<button class="btn danger" data-action="deleteTask">Remove task</button><button class="btn" data-action="completeTask">Mark whole task done</button>' : ''}
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
      if (p.done && !tp.done) { S.completePart(state, t.id, tp.id); changes.push(`${tp.title} done`); }
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
      <h2 id="sheet-title" tabindex="-1">${ICON.lock}${esc(o.title)}</h2>
      <p class="num"><b>${T.date(o.start)}</b><br>${T.range(o.start, o.end)}${o.mode ? ` · ${o.mode === 'FTF' ? 'Face-to-face' : 'Online'}` : ''}</p>
      <p><span class="fixed-tag">${ICON.lock}Fixed · ${o.source === 'temporary' ? 'One-time' : 'Weekly'}</span></p>
      <div class="status-panel s-info">${ICON.info}<div><p>Fixed commitments are protected. SIKAD plans your tasks around them and never moves, shortens or skips them on its own. Only you can mark one as cancelled.</p></div></div>
      <div class="sheet-actions">
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
      <h2 id="sheet-title" tabindex="-1">Demo clock</h2>
      <p class="sheet-sub">SIKAD is stateless about time: everything is computed from this clock. Move it forward to walk through the week. Sessions that pass without "Done" become check-ins and get rescheduled.</p>
      <label>Jump to<input type="datetime-local" id="clock-input" value="${T.toInput(now())}"></label>
      <div class="row end"><button class="btn" data-action="setClock">Set time</button></div>
      <div class="row end"><button class="btn small" data-action="loadDemoConfirm">Reset demo to the initial scenario</button></div>
      ${presets.length ? `<p class="small"><b>Story checkpoints</b></p><div class="chips">${presets.map(([l, ms]) => `<button class="chip-btn" data-action="jump" data-ms="${ms}">${esc(l)}</button>`).join('')}</div>` : ''}`;
  }

  // ---------- Engine output ----------
  function engineSheet() {
    const log = state.engineLog;
    return `
      <h2 id="sheet-title" tabindex="-1">Engine output</h2>
      <p class="sheet-sub">The structured JSON the engine returns for each request, following the contracts in prompt.md. Newest first.</p>
      ${log.map((e, i) => `
        <details class="log" ${i === 0 ? 'open' : ''}>
          <summary><b>${esc(e.phase)}</b> <span class="muted small">· ${T.short(e.at)} ${T.time(e.at)}</span>${e.output.status ? ` <span class="chip status-${e.output.status}">${e.output.status}</span>` : ''}</summary>
          <p class="small muted">Input: ${esc(String(e.input).slice(0, 220))}</p>
          <pre tabindex="0" aria-label="${esc(e.phase)} JSON output">${esc(JSON.stringify(e.output, null, 2))}</pre>
        </details>`).join('') || '<p class="muted">Nothing yet.</p>'}`;
  }

  // ---------- Import sheet (Batch 6: F12) ----------
  function importSheet() {
    const sh = ui.sheet;
    const items = sh.items || [];
    const selCount = items.filter((x) => x.selected).length;
    return `
      <h2 id="sheet-title" tabindex="-1">Import from ${esc(sh.sourceName || 'Calendar')}</h2>
      <p class="sheet-sub">Review items to add to your plan. You can edit titles or deadlines.</p>
      <div class="import-list" role="list">
        ${items.length ? items.map((it, idx) => `
          <div class="import-item ${it.selected ? 'selected' : ''}" role="listitem">
            <label class="toggle import-toggle">
              <input type="checkbox" ${it.selected ? 'checked' : ''} data-bind="sheet.items.${idx}.selected" data-rerender aria-label="Select ${esc(it.title)}">
            </label>
            <div class="import-fields">
              <div class="import-top">
                <span class="chip src-chip">${esc(it.source || sh.sourceName || 'Imported')}</span>
                <input class="import-title-input" value="${esc(it.title)}" data-bind="sheet.items.${idx}.title" placeholder="Task title">
              </div>
              <label class="small muted inline import-due-label">Due:
                <input type="datetime-local" value="${it.due ? T.toInput(typeof it.due === 'number' ? it.due : new Date(it.due).getTime()) : ''}" data-bind="sheet.items.${idx}.due" data-type="dt">
              </label>
            </div>
          </div>
        `).join('') : '<p class="muted">No items found.</p>'}
      </div>
      <div class="sheet-actions">
        <button class="btn ghost" data-action="closeSheet">Cancel</button>
        <button class="btn primary" data-action="addImportedTasks" ${selCount > 0 ? '' : 'disabled'}>Add ${selCount} to plan</button>
      </div>`;
  }

  // =============================================================== ACTIONS ==
  const A = {
    toggleJudgeDock() { ui.judgeDockOpen = !ui.judgeDockOpen; render(); },
    versionTap() { recordVersionTap(); },
    // --- onboarding
    obNext() {
      const ob = ui.ob;
      if (ob.step === 0) state.user.name = (ob.name || '').trim();
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
      focusHeading();
    },
    obBack() { ui.ob.step = Math.max(0, ui.ob.step - 1); render(); focusHeading(); },
    obGoto(ds) { ui.ob.step = Number(ds.step); render(); window.scrollTo(0, 0); focusHeading(); },
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
      if (ob.extracting) return;
      ob.extracting = true;
      render();
      setTimeout(() => {
        try {
          const p1 = P.parseSchedule(ob.corText);
          S.log(state, 'Phase 1 · Schedule extraction', ob.corText.slice(0, 200), p1);
          if (p1.clarification_needed) { ob.analysis = p1.clarification_needed; ob.analysisError = true; ob.extracted = true; ob.extracting = false; render(); return; }
          ob.analysisError = false;
          ob.classes = p1.extracted_commitments.map((c) => ({ title: c.title, day: T.DAY_NAMES.indexOf(c.day_of_week), start: c.start_time, end: c.end_time, mode: c.mode === 'Online' ? 'Online' : 'FTF' }));
          ob.analysis = E.analyzeBaseline(ob.classes);
          ob.extracted = true;
        } finally {
          ob.extracting = false;
          render();
        }
      }, 50);
    },
    obAddClass() { ui.ob.classes.push({ title: '', day: 1, start: '08:00', end: '10:00', mode: 'FTF' }); ui.ob.extracted = true; render(); },
    obRemoveClass(ds) { ui.ob.classes.splice(Number(ds.i), 1); ui.ob.analysis = E.analyzeBaseline(ui.ob.classes); render(); },
    obSampleDump() { ui.ob.dumpText = D.SAMPLE_BRAIN_DUMP; render(); },
    obParseDump() {
      const ob = ui.ob;
      if (ob.parsingDump) return;
      const text = (ob.dumpText || '').trim();
      if (!text) { flagField(document.getElementById('dump-ob'), 'Nothing to extract yet. Type or say what is on your plate, e.g. "Math homework due tomorrow".'); return; }
      ob.parsingDump = true;
      render();
      setTimeout(() => {
        try {
          const parsed = P.parse(text, S.parseContext(state));
          S.log(state, 'Phase 2 · Brain dump', text, P.toPhase2(parsed));
          ob.review = parsed.intents.map(intentToItem);
          render();
          focusFirstQuestion();
        } finally {
          ob.parsingDump = false;
          render();
        }
      }, 50);
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
    // --- tutorial
    tutorialNext() {
      if (ui.tutorialSlide < TUTORIAL_SLIDES.length - 1) {
        ui.tutorialSlide++;
        render();
      } else {
        A.tutorialFinish();
      }
    },
    tutorialPrev() {
      if (ui.tutorialSlide > 0) {
        ui.tutorialSlide--;
        render();
      }
    },
    tutorialGoto(ds) {
      const s = Number(ds.slide);
      if (s >= 0 && s < TUTORIAL_SLIDES.length) {
        ui.tutorialSlide = s;
        render();
      }
    },
    tutorialSkip() {
      markTutorialSeen();
      ui.tutorialOpen = false;
      render();
    },
    tutorialFinish() {
      markTutorialSeen();
      ui.tutorialOpen = false;
      render();
    },
    openTutorial() {
      ui.tutorialSlide = 0;
      ui.tutorialOpen = true;
      render();
    },

    loadDemo() {
      markTutorialSeen();
      state = S.loadDemo(S.reset());
      ui.ob = freshOnboarding(); ui.tab = 'home'; undoSnap = null;
      ui.tutorialOpen = false;
      ui.sheet = null; ui.askThread = []; ui.dict = null; ui.dumpDraft = null; ui.focusPick = null; ui.focusPartial = false; ui.prevPct = null; ui.error = null;
      render();
      toast("Loaded Alex's week. Try Ask SIKAD, or move the demo clock.", { ms: 6000 });
    },
    loadDemoConfirm() { if (confirm('Reset the demo? This replaces all saved data with the initial Alex scenario.')) A.loadDemo(); },
    resetAll() {
      if (!confirm('Erase all data and restart setup?')) return;
      try { localStorage.removeItem(TUTORIAL_KEY); } catch (e) {}
      state = S.reset(); ui.ob = freshOnboarding(); ui.sheet = null; undoSnap = null;
      ui.askThread = []; ui.dict = null; ui.dumpDraft = null; ui.focusPick = null; ui.prevPct = null; ui.error = null; ui.integrationState = {};
      ui.tutorialOpen = true;
      ui.tutorialSlide = 0;
      render();
    },
    connectIntegration(ds) {
      const id = ds.id;
      const adapter = window.SikadIntegrations && window.SikadIntegrations[id];
      const st = getIntegrationState(id);
      if (!adapter) {
        st.status = 'unavailable';
        render();
        return;
      }
      st.status = 'connecting';
      st.error = null;
      render();

      let cancelled = false;
      st._cancel = () => { cancelled = true; };

      adapter.connect().then((res) => {
        if (cancelled) return;
        st.status = 'connected';
        st.account = res.account || '';
        const nowTime = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        const count = res.items ? res.items.length : 0;
        st.lastSync = `Synced ${nowTime} · ${count} ${count === 1 ? 'item' : 'items'}`;
        st.imported = res.items || [];
        state.integrations[id] = true;
        S.save(state);
        if (res.items && res.items.length) {
          const intMeta = D.INTEGRATIONS.find((x) => x.id === id);
          ui.sheet = {
            type: 'import',
            id,
            sourceName: (intMeta && intMeta.name) || 'Google Calendar',
            items: res.items.map((it, idx) => ({
              ...it,
              idx,
              selected: true,
              due: it.due || null
            }))
          };
        }
        render();
      }).catch((err) => {
        if (cancelled) return;
        st.status = 'error';
        st.error = (err && err.message) || 'Connection failed. Check network or credentials.';
        state.integrations[id] = false;
        S.save(state);
        render();
      });
    },
    cancelIntegration(ds) {
      const id = ds.id;
      const st = getIntegrationState(id);
      if (st && st._cancel) st._cancel();
      st.status = 'idle';
      st.error = null;
      render();
    },
    disconnectIntegration(ds) {
      const id = ds.id;
      const st = getIntegrationState(id);
      st.status = 'idle';
      st.account = '';
      st.lastSync = '';
      st.imported = [];
      st.error = null;
      state.integrations[id] = false;
      S.save(state);
      render();
    },
    addImportedTasks() {
      const sh = ui.sheet;
      if (!sh || sh.type !== 'import') return;
      const selected = (sh.items || []).filter((x) => x.selected);
      if (!selected.length) { ui.sheet = null; render(); return; }
      snapshot('Import tasks');
      let count = 0;
      for (const it of selected) {
        let deadline = null;
        if (it.due != null) {
          deadline = typeof it.due === 'number' ? it.due : new Date(it.due).getTime();
          if (isNaN(deadline)) deadline = null;
        }
        const title = P.titleCase((it.title || 'Untitled task').trim());
        const task = S.makeTask(state, {
          title,
          type: 'assignment',
          deadline,
          durationMins: 60,
          priority: 'medium',
          source: it.source || sh.sourceName || 'Google Calendar',
          notes: `Imported from ${it.source || sh.sourceName || 'Google Calendar'}`
        });
        task.source = it.source || sh.sourceName || 'Google Calendar';
        state.tasks.push(task);
        count++;
      }
      ui.sheet = null;
      S.replan(state, `Imported ${count} ${count === 1 ? 'task' : 'tasks'} from ${sh.sourceName || 'calendar'}`);
      render();
    },

    // --- navigation
    tab(ds) { ui.tab = ds.tab; ui.focusOnly = false; render(); window.scrollTo(0, 0); },
    dayView(ds) { ui.dayView = ds.v; render(); },
    pickDay(ds) { ui.weekDay = Number(ds.day); render(); },
    showFullPlan() { ui.focusOnly = false; render(); },
    focusOnly() { ui.sheet = null; ui.tab = 'home'; ui.focusOnly = true; render(); window.scrollTo(0, 0); },
    dismissUpdate() {
      if (updateDismissTimer) { clearTimeout(updateDismissTimer); updateDismissTimer = null; }
      state.lastUpdate = null;
      render();
    },
    skipToMain() { const m = document.getElementById('main'); if (m) m.focus(); },
    setTheme(ds) { setThemeSetting(ds.theme); },
    toggleTheme() {
      setThemeSetting(currentTheme() === 'dark' ? 'light' : 'dark');
    },
    dismissError() { ui.error = null; render(); },
    retryError() { const sh = ui.error && ui.error.retrySheet; ui.error = null; ui.sheet = sh; render(); },
    undo() {
      if (!undoSnap) return;
      if (updateDismissTimer) { clearTimeout(updateDismissTimer); updateDismissTimer = null; }
      const log = state.engineLog;
      state = Object.assign(S.initialState(), JSON.parse(undoSnap.json));
      state.engineLog = log;
      state.lastUpdate = null;
      undoSnap = null; ui.toast = null;
      render();
      toast('Change undone.');
    },

    // --- focus card
    start(ds) {
      const s = S.findSession(state, ds.id);
      if (!s) return;
      const rec = F.recommend(focusContext(s, taskById(s.taskId)));
      const opt = rec.options.find((o) => o.method === rec.method) || rec.options[0];
      snapshot('Start session');
      S.startSession(state, ds.id, opt.setup);
      ui.focusPick = null; ui.focusMethod = null; ui.focusPartial = false; ui.spotlightOff = false;
      render();
    },
    openFocusPicker(ds) {
      ui.focusPick = ds.id;
      ui.focusMethod = state.active ? state.active.method : null;
      render();
      const h = document.getElementById('method-title');
      if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    },
    focusMethod(ds) { ui.focusMethod = ds.v; render(); },
    focusCancel() { ui.focusPick = null; ui.focusMethod = null; render(); },
    focusApplyMethod(ds) {
      const s = S.findSession(state, ds.id);
      if (!s || !state.active) return;
      const rec = F.recommend(focusContext(s, taskById(s.taskId)));
      const chosen = ui.focusMethod || rec.method;
      const opt = rec.options.find((o) => o.method === chosen) || rec.options[0];
      Object.assign(state.active, opt.setup);
      if (opt.setup.method) state.prefs.focusMethod = opt.setup.method;
      ui.focusPick = null; ui.focusMethod = null;
      render();
    },
    focusBegin(ds) {
      const s = S.findSession(state, ds.id);
      if (!s) return;
      const rec = F.recommend(focusContext(s, taskById(s.taskId)));
      const opt = rec.options.find((o) => o.method === (ui.focusMethod || rec.method));
      snapshot('Start session');
      S.startSession(state, ds.id, opt.setup);
      ui.focusPick = null; ui.focusMethod = null; ui.focusPartial = false; ui.spotlightOff = false;
      render();
    },
    // Leaving the spotlight only un-dims the screen. The session and its timer are untouched.
    spotlightOff() { ui.spotlightOff = true; render(); },
    spotlightToggle() { ui.spotlightOff = !ui.spotlightOff; render(); },
    focusPause() { S.pauseSession(state); render(); },
    focusResume() { S.resumeSession(state); render(); },
    focusSkip(ds) { S.skipSession(state, Number(ds.mins)); render(); tickTimer(); },
    focusEnd() {
      if (!state.active) return;
      S.pauseSession(state); state.active.status = 'awaiting'; ui.focusPartial = false;
      render();
      const q = document.getElementById('outcome-title');
      if (q) q.focus({ preventScroll: true });
    },
    focusKeepWorking() {
      const a = state.active;
      if (!a) return;
      if (F.timer(a, S.focusElapsedMs(a)).finished) a.method = 'none';   // the set structure is used up; carry on with a plain timer
      a.status = 'paused'; S.resumeSession(state); ui.focusPartial = false;
      render();
    },
    focusPartialBack() { ui.focusPartial = false; render(); },
    focusOutcome(ds) {
      if (ds.v === 'partial') { ui.focusPartial = true; render(); const i = document.getElementById('focus-left'); if (i) i.focus({ preventScroll: true }); return; }
      endFocusSession(ds.v);
    },
    focusSavePartial() {
      const input = document.getElementById('focus-left');
      const mins = Math.round(Number(input.value) * 60);
      if (!(mins > 0)) { flagField(input, 'Enter how much time is still needed, e.g. 0.5 for half an hour.'); return; }
      endFocusSession('partial', mins);
    },
    done(ds) {
      snapshot('Done');
      const s = S.findSession(state, ds.id);
      S.completeSession(state, ds.id);
      ui.celebrate = true;
      settle(ds.id, () => toast(`"${s.title}" is done. Your plan has been updated.`, { undo: true }));
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
      if (!v) { flagField(el, 'No date picked yet. Choose the due date and time, then tap Schedule it.'); return; }
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
    openDump() { ui.sheet = { type: 'dump', mode: 'input', text: ui.dumpDraft || '', input: 'text', restored: !!ui.dumpDraft }; render(); setTimeout(() => { const el = document.getElementById('dump-text'); if (el) el.focus(); }, 60); },
    dumpInput(ds) { ui.sheet.input = ds.v; render(); },
    scenario(ds) { ui.sheet.text = D.SCENARIOS[Number(ds.i)].text; render(); },
    processDump() {
      const text = (ui.sheet.text || '').trim();
      if (!text) { flagField(document.getElementById('dump-text'), 'Nothing to send yet. Ask a question or say what changed, e.g. "I have to work tonight 6 to 10".'); return; }
      stopVoice();
      // A question is answered from the current plan; anything else goes to interpret → review → confirm.
      const ans = Assistant.answer(state, text);
      if (ans) {
        ui.askThread.push({ q: text, a: ans });
        S.log(state, 'Ask SIKAD · answer (rule-based, not a model)', text, { kind: ans.kind, title: ans.title, lines: ans.lines, facts: ans.facts });
        ui.sheet.text = ''; ui.sheet.restored = false; ui.dumpDraft = null; ui.dict = null;
        render();
        const latest = document.getElementById('ask-latest');
        if (latest) { latest.focus({ preventScroll: true }); latest.scrollIntoView({ block: 'nearest' }); }
        return;
      }
      processDump(text);
      render();
      focusFirstQuestion();
    },
    askExample(ds) { ui.sheet.text = D.QUESTIONS[Number(ds.i)]; A.processDump(); },
    acceptProposal() {
      const draft = ui.sheet.draft;
      snapshot('Ask SIKAD');
      draft.engineLog = state.engineLog;
      state = draft;
      ui.dumpDraft = null; ui.dict = null;
      ui.sheet = null; ui.tab = 'home'; ui.focusOnly = false;
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    rejectProposal() { ui.sheet = null; ui.dumpDraft = null; render(); toast('No changes were made. Your plan is as it was.'); },
    editProposal() { ui.sheet = ui.sheet.review; render(); },
    scrollAttention() { const el = document.getElementById('attention'); if (el) { el.scrollIntoView({ block: 'start' }); el.focus({ preventScroll: true }); } },
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
      if (!f.title.trim()) { flagField(document.querySelector('[data-bind="sheet.form.title"]'), 'Task name is missing. Type a short name, e.g. "ADET report".'); return; }
      snapshot('Manual task');
      const { type, est } = P.classify(f.title);
      const task = S.makeTask(state, { title: P.titleCase(f.title.trim()), type, deadline: f.deadline, durationMins: f.durationMins || est,
        isAiEstimate: !f.durationMins, priority: f.priority, notes: f.notes, parts: P.suggestParts(type, f.durationMins || est) });
      state.tasks.push(task);
      ui.sheet = null;
      S.replan(state, `New task: ${task.title}`, { notes: task.deadline == null ? [`"${task.title}" needs a deadline before it can be scheduled.`] : [] });
      render();
    },
    dictStart(ds) { dictStart(ds.path); },
    dictStop() { if (recog) { try { recog.stop(); } catch (e) { finishDictation(); } } },
    dictCancel() { if (ui.dict) ui.dict.cancelled = true; if (recog) { try { recog.abort(); } catch (e) { /* already stopped */ } } finishDictation(); },
    dictDemo(ds) {
      const text = ds.path === 'ob.dumpText' ? D.SAMPLE_BRAIN_DUMP : D.SAMPLE_TRANSCRIPT;
      setPath(ui, ds.path, text);
      ui.dict = { path: ds.path, state: 'ready', final: '', interim: '', note: 'demo' };
      render();
    },

    // --- tasks
    openTask(ds) { openTask(ds.id); },
    newTask() { ui.sheet = { type: 'dump', mode: 'input', input: 'form', text: '' }; render(); },
    saveTask() { saveTask(); },
    completeTask() {
      const t = taskById(ui.sheet.id);
      snapshot('Complete task');
      S.completeTask(state, t.id);
      ui.sheet = null;
      S.replan(state, `Completed: ${t.title}`);
      ui.celebrate = true;
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
    removeClass(ds) {
      const cls = state.baseline.classes.find((c) => c.id === ds.id);
      const title = cls ? cls.title : 'class';
      baselineChange(`Removed ${title}`, () => { state.baseline.classes = state.baseline.classes.filter((c) => c.id !== ds.id); }, `Removed ${title}`);
    },
    removeRecurring(ds) {
      const rec = state.baseline.recurring.find((r) => r.id === ds.id);
      const title = rec ? rec.title : 'weekly commitment';
      baselineChange(`Removed ${title}`, () => { state.baseline.recurring = state.baseline.recurring.filter((r) => r.id !== ds.id); }, `Removed ${title}`);
    },
    removeEvent(ds) {
      const ev = state.events.find((e) => e.id === ds.id);
      const title = ev ? ev.title : 'one-time commitment';
      baselineChange(`Removed ${title}`, () => { state.events = state.events.filter((e) => e.id !== ds.id); }, `Removed ${title}`);
    },
    restoreOcc(ds) { baselineChange('Restored a cancelled session', () => { state.cancellations = state.cancellations.filter((c) => c !== ds.id); }); },
    addClass() {
      const f = formValues('add-class');
      if (!f.title.trim()) { flagField(document.querySelector('#add-class [name="title"]'), 'Subject is missing. Type the class name or code, e.g. "IT 302".'); return; }
      if (f.end <= f.start) { flagField(document.querySelector('#add-class [name="end"]'), 'End time must be later than the start time.'); return; }
      baselineChange(`Added class ${f.title}`, () => state.baseline.classes.push({ id: S.uid(state, 'c'), title: f.title.trim(), day: Number(f.day), start: f.start, end: f.end, mode: f.mode }));
    },
    addRecurringForm() {
      const f = formValues('add-rec');
      if (!f.title.trim()) { flagField(document.querySelector('#add-rec [name="title"]'), 'Name is missing. Type what the commitment is, e.g. "Org meeting".'); return; }
      if (f.end <= f.start) { flagField(document.querySelector('#add-rec [name="end"]'), 'End time must be later than the start time.'); return; }
      baselineChange(`Added weekly ${f.title}`, () => S.addRecurring(state, { title: f.title.trim(), kind: f.kind, days: [Number(f.day)], start: f.start, end: f.end }));
    },
    openEngine() { ui.sheet = { type: 'engine' }; render(); },

    // --- sheet chrome
    closeSheet() { stopVoice(); keepDraft(); ui.sheet = null; render(); },
    backdrop(ds, el, e) { if (e.target === el) A.closeSheet(); },
  };

  /** Dismissing Ask SIKAD must not throw away what the student typed. */
  function keepDraft() {
    if (!ui.sheet) return;
    if (ui.sheet.type === 'dump') ui.dumpDraft = (ui.sheet.text || '').trim() || null;
    if (ui.sheet.type === 'proposal') ui.dumpDraft = (ui.sheet.review.text || '').trim() || null;
  }

  /** The student has said how the session went: record it, update the task and replan. */
  function endFocusSession(outcome, remainingMins) {
    const a = state.active;
    if (!a) return;
    const s = S.findSession(state, a.sessionId);
    const focusedMins = F.timer(a, S.focusElapsedMs(a)).focusedMins;
    snapshot('End session');
    S.endFocus(state, { outcome, remainingMins, focusedMins });
    ui.focusPartial = false;
    const say = () => toast(outcome === 'complete' ? `"${s.title}" is done. Your plan has been updated.`
      : outcome === 'partial' ? `Progress saved. ${T.dur(remainingMins)} is back in your plan.`
      : 'Session recorded. The work is still on your plan.', { undo: true });
    if (outcome === 'complete') { ui.celebrate = true; settle(s.id, say); return; }
    render();
    say();
  }

  function formValues(id) {
    const out = {};
    document.querySelectorAll(`#${id} [name]`).forEach((el) => { out[el.name] = el.value; });
    return out;
  }

  function baselineChange(trigger, fn, customToast) {
    snapshot(trigger);
    fn();
    S.replan(state, trigger);
    render();
    toast(customToast || 'Baseline updated — plan recalculated.', { undo: true });
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
  function dictStart(path) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { render(); return; }                        // the panel already shows the fallback
    const field = document.querySelector(`[data-bind="${path}"]`);
    ui.dict = { path, state: 'recording', final: '', interim: '', base: field && field.value.trim() ? field.value.trim() + ' ' : '', startedReal: Date.now() };
    recog = new SR();
    recog.lang = 'en-PH';
    recog.continuous = true;
    recog.interimResults = true;
    recog.onresult = (e) => {
      if (!ui.dict) return;
      let fin = '', interim = '';
      for (let i = 0; i < e.results.length; i++) { if (e.results[i].isFinal) fin += e.results[i][0].transcript + ' '; else interim += e.results[i][0].transcript; }
      ui.dict.final = fin; ui.dict.interim = interim;
      const live = document.getElementById('dict-interim');
      if (live) live.textContent = (fin + interim) || 'Listening…';
    };
    recog.onerror = (e) => { if (ui.dict) ui.dict.errorCode = e.error; };
    recog.onend = finishDictation;
    try { recog.start(); } catch (err) { ui.dict.errorCode = 'start-failed'; finishDictation(); return; }
    render();
    const stop = document.querySelector('[data-action="dictStop"]');
    if (stop) stop.focus({ preventScroll: true });
  }
  /** Recording ended (Stop, Cancel, silence or an error): put the transcript in the editable field, or explain why there is none. */
  function finishDictation() {
    const d = ui.dict;
    recog = null;
    if (!d || d.state !== 'recording') return;
    const text = (d.final + d.interim).trim();
    d.state = 'ready';
    if (d.cancelled) d.note = 'cancelled';
    else if (text) { setPath(ui, d.path, d.base + text); d.note = 'transcribed'; }
    else d.error = VOICE_ERRORS[d.errorCode] || 'Nothing was transcribed. Try again, or type instead.';
    render();
    const field = document.querySelector(`[data-bind="${d.path}"]`);
    if (field && !d.cancelled && text) field.focus({ preventScroll: true });
  }
  /** Leaving the panel while recording discards the recording quietly. */
  function stopVoice() {
    if (!ui.dict || ui.dict.state !== 'recording') return;
    const r = recog;
    recog = null; ui.dict = null;
    if (r) { r.onend = null; try { r.abort(); } catch (e) { /* already stopped */ } }
  }

  // ---------------------------------------------------------------- events --
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el || el.disabled) return;
    const fn = A[el.dataset.action];
    if (!fn) return;
    // A completion is still settling: show its result now. A tap on a control that no longer exists is dropped.
    if (pending) { render(); if (!el.isConnected) return; }
    if (el.dataset.action !== 'backdrop') e.preventDefault();
    // ERROR state (design.md §8): if an action throws, put the plan back exactly as it was and say so.
    const before = undoSnap, sheetBefore = ui.sheet ? JSON.parse(JSON.stringify(ui.sheet)) : null;
    try {
      fn(el.dataset, el, e);
    } catch (err) {
      console.warn('SIKAD action failed:', el.dataset.action, err);
      if (undoSnap && undoSnap !== before) {
        const log = state.engineLog;
        state = Object.assign(S.initialState(), JSON.parse(undoSnap.json));
        state.engineLog = log;
        undoSnap = before;
      }
      ui.error = { detail: '', retrySheet: sheetBefore };
      ui.sheet = null; ui.tab = 'home';
      render();
      toast("Couldn't update your plan. Nothing was changed.");
    }
  });

  document.addEventListener('input', (e) => {
    const el = e.target;
    clearFieldError(el);
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
    if (ui.tutorialOpen) {
      if (e.key === 'ArrowRight') { e.preventDefault(); A.tutorialNext(); return; }
      if (e.key === 'ArrowLeft') { e.preventDefault(); A.tutorialPrev(); return; }
      if (e.key === 'Escape') { e.preventDefault(); A.tutorialSkip(); return; }
    }
    if (e.key === 'Tab' && ui.sheet) {
      // checkVisibility() also excludes content of closed <details> (offsetParent alone does not).
      const visible = (x) => (x.checkVisibility ? x.checkVisibility() : x.offsetParent !== null);
      const f = [...$sheet.querySelectorAll('button:not([disabled]), input:not([disabled]), select, textarea, summary, [tabindex="0"]')].filter(visible);
      if (f.length) {
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && (document.activeElement === first || !$sheet.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    if (e.key === 'Escape' && ui.sheet) A.closeSheet();
    else if (e.key === 'Escape' && document.body.classList.contains('spotlight')) A.spotlightOff();
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && ui.sheet && ui.sheet.type === 'dump' && ui.sheet.mode === 'input') A.processDump();
  });

  // Touch swipe support for tutorial carousel
  let touchStartX = null;
  document.addEventListener('touchstart', (e) => {
    if (!ui.tutorialOpen) return;
    const c = e.target.closest('#tutorial-carousel');
    if (c) touchStartX = e.touches[0].clientX;
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    if (!ui.tutorialOpen || touchStartX === null) return;
    const c = e.target.closest('#tutorial-carousel');
    if (c && e.changedTouches && e.changedTouches.length) {
      const diff = e.changedTouches[0].clientX - touchStartX;
      touchStartX = null;
      if (diff < -45) A.tutorialNext();
      else if (diff > 45) A.tutorialPrev();
    }
  }, { passive: true });

  // Keep the toggle's icon in sync when following the OS setting and it changes.
  if (darkQuery && darkQuery.addEventListener) darkQuery.addEventListener('change', () => { if (!document.documentElement.dataset.theme) render(); });

  // Tell the student if saved data was unreadable and had to be replaced.
  if (state.loadNotice) { const msg = state.loadNotice; delete state.loadNotice; setTimeout(() => toast(msg, { ms: 7000 }), 300); }

  // Listen to connectivity changes to show/hide offline banner
  window.addEventListener('online', () => { ui.isOffline = false; render(); });
  window.addEventListener('offline', () => { ui.isOffline = true; render(); });

  render();
})();
