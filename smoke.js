/* Headless smoke test for DOGWALKER: stubs a browser DOM + canvas, loads the
 * game scripts, and drives many frames through menu -> play -> end to surface
 * runtime errors. Not shipped (lives outside dogwalker/). */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const rafQueue = [];
function makeGradient() { return { addColorStop() {} }; }
function makeCtx() {
  const noop = () => {};
  return new Proxy({
    canvas: { width: 800, height: 600 },
    setTransform: noop, clearRect: noop, save: noop, restore: noop,
    translate: noop, scale: noop, rotate: noop, fillRect: noop, strokeRect: noop,
    beginPath: noop, closePath: noop, arc: noop, ellipse: noop, moveTo: noop,
    lineTo: noop, quadraticCurveTo: noop, stroke: noop, fill: noop, fillText: noop,
    setLineDash: noop, drawImage: noop, clip: noop, rect: noop,
    createPattern: () => ({}), createRadialGradient: makeGradient, createLinearGradient: makeGradient,
    getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }),
    putImageData: noop,
  }, { get(t, k) { return k in t ? t[k] : undefined; }, set(t, k, v) { t[k] = v; return true; } });
}
function makeEl(tag) {
  const listeners = {};
  const el = {
    tag, style: {}, _text: '', innerHTML: '', children: [],
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    appendChild(c) { el.children.push(c); return c; },
    addEventListener(t, fn) { (listeners[t] = listeners[t] || []).push(fn); },
    removeEventListener() {},
    getBoundingClientRect() { return { left: 0, top: 0, width: 130, height: 130 }; },
    getContext() { return ctx; },
    width: 800, height: 600, onclick: null,
    dispatch(t, e) { (listeners[t] || []).forEach((fn) => fn(e || {})); },
  };
  Object.defineProperty(el, 'textContent', { get() { return el._text; }, set(v) { el._text = v; } });
  return el;
}
const ctx = makeCtx();
const elements = {};
const getEl = (id) => (elements[id] = elements[id] || makeEl(id));

const winListeners = {};
// seed a save that unlocks the hardest level (5 dogs, 3 Karens, garbage truck)
const store = { dogwalker_save_v1: JSON.stringify({ money: 500, unlocked: 4, upgrades: { bags: 2, stam: 1, hands: 1, shoes: 1, treat: 1 } }) };
const sandbox = {
  console,
  performance: { now: () => Date.now() },
  requestAnimationFrame: (fn) => { rafQueue.push(fn); return rafQueue.length; },
  cancelAnimationFrame() {},
  localStorage: {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  },
  navigator: { maxTouchPoints: 0, userAgent: 'node' },
  Image: class { set src(v) { this._src = v; setTimeout(() => this.onload && this.onload(), 0); } },
  Audio: class { constructor() { this.play = () => Promise.resolve(); this.pause = () => {}; } addEventListener() {} cloneNode() { return new sandbox.Audio(); } },
  setTimeout, clearTimeout,
  innerWidth: 800, innerHeight: 600, devicePixelRatio: 1,
  addEventListener(t, fn) { (winListeners[t] = winListeners[t] || []).push(fn); },
};
sandbox.document = {
  getElementById: getEl,
  createElement: (tag) => (tag === 'canvas' ? Object.assign(makeEl('canvas'), { getContext: () => makeCtx() }) : makeEl(tag)),
  addEventListener() {},
};
// make window/self/globalThis all point at the global object, like a browser
sandbox.window = sandbox; sandbox.self = sandbox; sandbox.global = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);

const dir = path.join(__dirname, 'dogwalker');
['src/assets.js', 'src/input.js', 'src/levels.js', 'src/game.js'].forEach((f) => {
  const code = fs.readFileSync(path.join(dir, f), 'utf8');
  vm.runInContext(code, sandbox, { filename: f });
});

function pump(n) { for (let i = 0; i < n && rafQueue.length; i++) { const fn = rafQueue.shift(); fn(performance.now() + i * 16); } }

let failed = false;
try {
  pump(4); // menu frames
  console.log('menu OK; DW keys:', Object.keys(sandbox.DW).join(', '));
  getEl('btnPlay').onclick();            // start level 1
  pump(60);
  // simulate movement + actions via window key events
  const kd = (code) => (winListeners.keydown || []).forEach((fn) => fn({ code, preventDefault() {}, repeat: false }));
  const ku = (code) => (winListeners.keyup || []).forEach((fn) => fn({ code }));
  kd('KeyD'); pump(120); kd('Space'); pump(2); kd('ShiftLeft'); pump(60); ku('ShiftLeft'); ku('KeyD');
  kd('KeyP'); pump(10); kd('KeyP'); pump(10);        // pause + resume
  kd('KeyM'); pump(4); kd('KeyM');                   // mute toggle
  getEl('btnPause').onclick(); pump(6); getEl('btnPause').onclick();
  getEl('btnMute').onclick(); pump(2);
  console.log('play + pause/mute frames OK');
  pump(2200);                            // run out the clock -> summary
  console.log('post-clock frames OK');
  getEl('btnRetry').onclick(); pump(40);
  getEl('btnShop') && getEl('btnShop').onclick(); pump(4);
  // buy an upgrade if possible by invoking shop buttons via re-render side effects
  getEl('btnShopBack').onclick(); pump(4);
  console.log('shop + retry OK');
} catch (e) { failed = true; console.error('RUNTIME ERROR:', e && e.stack || e); }

console.log(failed ? 'SMOKE: FAIL' : 'SMOKE: PASS');
process.exit(failed ? 1 : 0);
