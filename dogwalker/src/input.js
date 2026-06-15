/* DOGWALKER — input (keyboard + touch joystick/buttons) */
window.DW = window.DW || {};

DW.Input = (function () {
  const keys = {};
  let touchUntangle = false; // set by on-screen UNTANGLE button
  const state = {
    move: { x: 0, y: 0 },   // normalized move vector (-1..1)
    bag: false,             // edge-triggered, consumed by game
  };

  // ---- keyboard ----
  const MOVE_KEYS = {
    ArrowUp: [0, -1], KeyW: [0, -1],
    ArrowDown: [0, 1], KeyS: [0, 1],
    ArrowLeft: [-1, 0], KeyA: [-1, 0],
    ArrowRight: [1, 0], KeyD: [1, 0],
  };
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    keys[e.code] = true;
    if (MOVE_KEYS[e.code] || ['Space', 'KeyE', 'ShiftLeft', 'ShiftRight'].includes(e.code)) e.preventDefault();
    if (e.code === 'KeyE' || e.code === 'Space') state.bag = true;
    if (DW.onAnyKey) DW.onAnyKey(e.code);
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

  function pollKeyboard() {
    let x = 0, y = 0;
    for (const code in MOVE_KEYS) {
      if (keys[code]) { x += MOVE_KEYS[code][0]; y += MOVE_KEYS[code][1]; }
    }
    return { x, y };
  }

  // ---- touch joystick ----
  let touchVec = { x: 0, y: 0 };
  let stickId = null;
  const stick = document.getElementById('stick');
  const nub = document.getElementById('nub');

  function setupTouch() {
    const showTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    if (!showTouch) return;
    document.getElementById('touch').classList.add('show');

    const R = 45;
    function place(cx, cy) {
      nub.style.left = (40 + cx) + 'px';
      nub.style.top = (40 + cy) + 'px';
    }
    stick.addEventListener('touchstart', (e) => {
      stickId = e.changedTouches[0].identifier; e.preventDefault();
    }, { passive: false });
    stick.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier !== stickId) continue;
        const r = stick.getBoundingClientRect();
        let dx = t.clientX - (r.left + r.width / 2);
        let dy = t.clientY - (r.top + r.height / 2);
        const d = Math.hypot(dx, dy) || 1;
        const cl = Math.min(d, R);
        const nx = (dx / d) * cl, ny = (dy / d) * cl;
        place(nx, ny);
        touchVec = { x: nx / R, y: ny / R };
      }
      e.preventDefault();
    }, { passive: false });
    function end(e) {
      for (const t of e.changedTouches) {
        if (t.identifier === stickId) { stickId = null; touchVec = { x: 0, y: 0 }; place(0, 0); }
      }
    }
    stick.addEventListener('touchend', end);
    stick.addEventListener('touchcancel', end);

    const bag = document.getElementById('btnBag');
    bag.addEventListener('touchstart', (e) => { state.bag = true; e.preventDefault(); }, { passive: false });
    const unt = document.getElementById('btnUntangle');
    unt.addEventListener('touchstart', (e) => { touchUntangle = true; e.preventDefault(); }, { passive: false });
    unt.addEventListener('touchend', () => { touchUntangle = false; });
    unt.addEventListener('touchcancel', () => { touchUntangle = false; });
  }

  function update() {
    const kb = pollKeyboard();
    let x = kb.x + touchVec.x;
    let y = kb.y + touchVec.y;
    const m = Math.hypot(x, y);
    if (m > 1) { x /= m; y /= m; }
    state.move.x = x; state.move.y = y;
  }

  // consume the one-shot bag press
  function takeBag() { const b = state.bag; state.bag = false; return b; }
  function untangleHeld() { return touchUntangle || !!(keys.ShiftLeft || keys.ShiftRight); }

  return { state, update, takeBag, untangleHeld, setupTouch };
})();
