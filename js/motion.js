/*
 * SIKAD — motion layer (motion-spec.md). Presentation only: it never reads or changes the plan.
 *
 * The UI rebuilds its HTML on every render, so motion is a FLIP around that rebuild:
 *   const snap = capture(root);   // where things are
 *   root.innerHTML = ...;         // the real, already-saved state
 *   play(root, snap, opts);       // slide from where they were to where they are
 *
 *   data-flip="key"   same key before and after: slide. New key: enter.
 *   data-flip-exit    key gone after the render: leave as a ghost.
 *   data-enter="key"  enter only.
 */
(function (root) {
  'use strict';
  const EASE_OUT = 'cubic-bezier(.2,.7,.2,1)', EASE_SNAP = 'cubic-bezier(.3,1.25,.5,1)', EASE_SPRING = 'cubic-bezier(.34,1.4,.64,1)';
  const DUR = { micro: 120, enter: 200, strike: 240, move: 360, spring: 420 };
  const SETTLE = 320;   // strike + a short hold before the completed state renders

  const query = root.matchMedia ? root.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const reduced = () => !!(query && query.matches) || typeof Element === 'undefined' || !Element.prototype.animate;

  let running = [];

  function capture(el) {
    const rects = new Map(), entered = new Set();
    if (!el || reduced()) return { rects, entered, scrollY: 0 };
    el.querySelectorAll('[data-flip]').forEach((n) => {
      const r = n.getBoundingClientRect();
      if (!r.width && !r.height) return;                 // hidden (e.g. inside a closed <details>)
      rects.set(n.dataset.flip, { x: r.left + root.scrollX, y: r.top + root.scrollY, w: r.width, h: r.height, el: n });
    });
    el.querySelectorAll('[data-enter]').forEach((n) => entered.add(n.dataset.enter));
    return { rects, entered, scrollY: root.scrollY };
  }

  const track = (anim) => { running.push(anim); return anim; };
  function cancelAll() {
    for (const a of running) { try { a.cancel(); } catch (e) { /* already finished */ } }
    running = [];
    document.querySelectorAll('.flip-ghosts').forEach((g) => g.remove());
  }

  function enter(el, delay, rise = 8) {
    track(el.animate([{ opacity: 0, transform: `translateY(${rise}px)` }, { opacity: 1, transform: 'none' }],
      { duration: DUR.enter, easing: EASE_OUT, delay, fill: 'backwards' }));
  }

  /**
   * opts.sameView  false → the whole view changed (tab, step): one entrance on opts.viewEl, no FLIP.
   * opts.washNew   true  → a new plan update: stagger the moved rows and play their Butter wash once.
   */
  function play(el, snap, opts = {}) {
    cancelAll();
    if (!el || reduced()) return;
    if (!opts.sameView) {
      if (opts.viewEl) track(opts.viewEl.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: DUR.enter, easing: EASE_OUT }));
      return;
    }
    const vh = root.innerHeight, sy = root.scrollY;
    const onScreen = (y, h) => y + h > sy - 80 && y < sy + vh + 80;

    // Read everything, then write: one layout pass.
    const nodes = [...el.querySelectorAll('[data-flip]')].map((n) => {
      const r = n.getBoundingClientRect();
      return { n, key: n.dataset.flip, x: r.left + root.scrollX, y: r.top + sy, w: r.width, h: r.height };
    });
    const seen = new Set();
    const focusNow = nodes.find((x) => x.key === 'focus'), focusWas = snap.rects.get('focus');
    const focusResized = !!(focusNow && focusWas && Math.abs(focusWas.h - focusNow.h) > 4);
    let entering = 0, shuffled = 0;
    for (const it of nodes) {
      if (!it.w && !it.h) continue;
      seen.add(it.key);
      const was = snap.rects.get(it.key);
      if (!was) {
        if (onScreen(it.y, it.h)) enter(it.n, Math.min(entering++, 6) * 24);
        continue;
      }
      const dx = was.x - it.x, dy = was.y - it.y, dh = was.h - it.h;
      if (it.key === 'focus' && focusResized) {
        // The Spotlight: the card's background (a pseudo-element) springs from the old height to the new one.
        track(it.n.animate([{ bottom: `${-dh}px` }, { bottom: '0px' }], { duration: DUR.spring, easing: EASE_SPRING, pseudoElement: '::before' }));
      }
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
      if (!onScreen(it.y, it.h) && !onScreen(was.y, was.h)) continue;
      const replanned = opts.washNew && it.n.classList.contains('just-moved');
      const delay = replanned ? Math.min(shuffled++, 5) * 30 : 0;
      if (replanned) it.n.style.zIndex = '2';
      // Content pushed by the Focus Card follows the card's spring; replanned rows snap into their slots.
      const pushed = focusResized && !replanned;
      const a = track(it.n.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],
        { duration: pushed ? DUR.spring : DUR.move, easing: pushed ? EASE_SPRING : EASE_SNAP, delay, fill: 'backwards' }));
      if (replanned) a.finished.then(() => { it.n.style.zIndex = ''; }, () => {});
    }

    el.querySelectorAll('[data-enter]').forEach((n) => {
      if (!snap.entered.has(n.dataset.enter)) enter(n, 80);
    });
    if (opts.washNew) el.querySelectorAll('.tl-item.just-moved').forEach((n) => n.classList.add('wash-on'));

    // Exits: show the old element once more, out of flow and inert, and let it leave.
    let layer = null;
    const base = el.getBoundingClientRect();
    for (const [key, was] of snap.rects) {
      if (seen.has(key) || !was.el.hasAttribute('data-flip-exit') || !onScreen(was.y, was.h)) continue;
      if (!layer) {
        layer = document.createElement('div');
        layer.className = 'flip-ghosts';
        layer.setAttribute('aria-hidden', 'true');
        layer.inert = true;
        el.appendChild(layer);
      }
      const g = was.el;
      g.removeAttribute('data-flip'); g.removeAttribute('id');
      g.querySelectorAll('[id], [data-flip], [data-enter], [data-action]').forEach((c) => { c.removeAttribute('id'); c.removeAttribute('data-flip'); c.removeAttribute('data-enter'); c.removeAttribute('data-action'); });
      Object.assign(g.style, { position: 'absolute', margin: '0', left: `${was.x - (base.left + root.scrollX)}px`, top: `${was.y - (base.top + sy)}px`, width: `${was.w}px`, height: `${was.h}px` });
      layer.appendChild(g);
      const slide = g.classList.contains('tl-item') ? 'translateX(16px)' : 'scale(.98)';
      const a = track(g.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: slide }], { duration: DUR.micro, easing: 'ease-in', fill: 'forwards' }));
      a.finished.then(() => g.remove(), () => {});
    }
  }

  /** The Satisfaction: draw a line through the given titles. Returns how long to wait before rendering the result. */
  function strike(els) {
    const list = (els || []).filter(Boolean);
    if (reduced() || !list.length) return 0;
    for (const n of list) n.classList.add('is-striking');
    return SETTLE;
  }

  root.TempoMotion = { reduced, capture, play, strike, cancelAll, DUR, SETTLE };
})(typeof window !== 'undefined' ? window : globalThis);
