/* DOGWALKER — asset loader.
 *
 * Art + audio are generated with Higgsfield and served from its CDN; the URL
 * map below is filled in by the build. Sprites are generated on a flat white
 * background, so on load we key the background out IN THE BROWSER (edge
 * flood-fill into a canvas) to get clean transparency — no server round-trip.
 *
 * Everything is optional & defensive:
 *  - images load with crossOrigin first (needed to read pixels); if CORS is
 *    refused we reload without it and just draw the raw image (white box) — the
 *    game still runs.
 *  - if an URL is missing entirely, game.js falls back to drawn shapes.
 */
window.DW = window.DW || {};

DW.Assets = (function () {
  // ---- CDN url map (filled by build; empty entries => shape fallback) ----
  const CDN = 'https://d8j0ntlcm91z4.cloudfront.net/user_33OO3vKsKDtpmjLQShIWOTRxc3s/';
  const URLS = {
    // sprites (background keyed out)
    player:    CDN + 'hf_20260615_013757_3e09ebe1-a73f-499d-9c75-c5e291cc7b67.png',
    dog_pug:   CDN + 'hf_20260615_013759_e31be2fd-990e-4efb-82da-e45173a69d43.png',
    dog_golden:CDN + 'hf_20260615_013800_56e19d08-65e6-406c-9a20-994705d87e52.png',
    dog_dal:   CDN + 'hf_20260615_013802_8797f891-71b9-414b-bfda-f986ba73e287.png',
    karen:     CDN + 'hf_20260615_013805_ec945f88-d66c-4a30-9802-0d3d890c081f.png',
    squirrel:  CDN + 'hf_20260615_013806_bcb04a9d-637e-429e-a50b-2d0cd6ebf3b5.png',
    poop:      CDN + 'hf_20260615_013808_bd4370bd-7e22-45ae-8a02-9165a53c7cc1.png',
    truck:     CDN + 'hf_20260615_014649_0182a223-0ab3-4350-8cdd-113b8d1d1731.png',
    mailman:   CDN + 'hf_20260615_014651_4cc66fe4-bbec-498b-811c-2893f6565f5b.png',
    hydrant:   CDN + 'hf_20260615_014647_1532f12c-a65d-44af-bbeb-535749048f9f.png',
    trashcan:  CDN + 'hf_20260615_014648_c21972f4-27f2-43d6-8050-123ca9e9dfae.png',
    tree:      CDN + 'hf_20260615_014646_9359a456-611d-4ed5-b597-f3f127b94dc8.png',
    house1:    CDN + 'hf_20260615_014641_adf08abe-63ff-4610-9538-b22e28dad541.png',
    house2:    CDN + 'hf_20260615_014643_acd55728-d728-4ca5-b0c7-091f3ffda60e.png',
    house3:    CDN + 'hf_20260615_014644_c66bb9fa-796b-4a1e-8f73-6f0b0656faf9.png',
    finish:    '',
    // tiles (full-bleed textures, NOT keyed)
    tile_grass: CDN + 'hf_20260615_014637_64c8fe2e-989d-40e5-9359-8771b71ad48d.png',
    tile_road:  CDN + 'hf_20260615_014638_a43246d3-f204-42a8-9156-368371e84ba1.png',
    tile_walk:  CDN + 'hf_20260615_014639_85e3d6a0-f9f5-42ba-a7c5-f5f2bed9281d.png',
    // ui
    logo: '',
  };
  const SOUND_URLS = { music: '', tension: '', bark: '', camera: '', cash: '', rip: '' };

  // keys that are full-bleed textures (do not remove background)
  const NOBG = new Set(['tile_grass', 'tile_road', 'tile_walk']);

  const drawables = {}; // key -> canvas | HTMLImageElement
  const sounds = {};

  // ---- background keying (flood fill near-white from the borders) ----
  function keyOut(img) {
    const w = img.naturalWidth, h = img.naturalHeight;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    let data;
    try { data = g.getImageData(0, 0, w, h); }
    catch (e) { return img; } // tainted (no CORS) -> use raw image
    const px = data.data;
    const isBg = (i) => px[i] > 232 && px[i + 1] > 232 && px[i + 2] > 232 &&
      Math.max(px[i], px[i + 1], px[i + 2]) - Math.min(px[i], px[i + 1], px[i + 2]) < 22;
    const stack = [];
    const seen = new Uint8Array(w * h);
    for (let x = 0; x < w; x++) { stack.push(x); stack.push((h - 1) * w + x); }
    for (let y = 0; y < h; y++) { stack.push(y * w); stack.push(y * w + w - 1); }
    while (stack.length) {
      const p = stack.pop();
      if (seen[p]) continue; seen[p] = 1;
      const i = p * 4;
      if (!isBg(i)) continue;
      px[i + 3] = 0;
      const x = p % w, y = (p / w) | 0;
      if (x > 0) stack.push(p - 1);
      if (x < w - 1) stack.push(p + 1);
      if (y > 0) stack.push(p - w);
      if (y < h - 1) stack.push(p + w);
    }
    // soften 1px halo: dim alpha of pixels next to transparency
    g.putImageData(data, 0, 0);

    // autocrop to non-transparent bounds for tight, consistent sprites
    let minX = w, minY = h, maxX = 0, maxY = 0, any = false;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (px[(y * w + x) * 4 + 3] > 12) { any = true;
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y; }
    }
    if (!any) return c;
    const pad = 4;
    minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
    maxX = Math.min(w - 1, maxX + pad); maxY = Math.min(h - 1, maxY + pad);
    const cw = maxX - minX + 1, ch = maxY - minY + 1;
    const out = document.createElement('canvas'); out.width = cw; out.height = ch;
    out.getContext('2d').drawImage(c, minX, minY, cw, ch, 0, 0, cw, ch);
    return out;
  }

  function loadImage(key, url) {
    if (!url) return;
    const attempt = (useCors) => {
      const img = new Image();
      if (useCors) img.crossOrigin = 'anonymous';
      img.onload = () => {
        drawables[key] = (useCors && !NOBG.has(key)) ? keyOut(img) : img;
      };
      img.onerror = () => { if (useCors) attempt(false); };
      img.src = url;
    };
    // tiles don't need pixel access; load plainly. sprites try CORS first.
    attempt(!NOBG.has(key));
  }

  function loadSounds() {
    Object.keys(SOUND_URLS).forEach((key) => {
      const url = SOUND_URLS[key]; if (!url) return;
      const a = new Audio(); a.src = url; a.preload = 'auto';
      sounds[key] = { el: a, ok: false };
      a.addEventListener('canplaythrough', () => { sounds[key].ok = true; }, { once: true });
      a.addEventListener('error', () => { sounds[key].ok = false; });
    });
  }

  function img(key) { return drawables[key] || null; }

  let muted = false, curMusic = null;
  function playSfx(key, vol = 0.7) {
    if (muted) return; const s = sounds[key]; if (!s || !s.ok) return;
    try { const c = s.el.cloneNode(); c.volume = vol; c.play().catch(() => {}); } catch (e) {}
  }
  function playMusic(key, vol = 0.32) {
    if (muted) return; const s = sounds[key]; if (!s || !s.ok) return;
    if (curMusic === s.el) return; stopMusic();
    s.el.loop = true; s.el.volume = vol; curMusic = s.el; s.el.play().catch(() => {});
  }
  function stopMusic() { if (curMusic) { try { curMusic.pause(); } catch (e) {} curMusic = null; } }
  function setMuted(m) { muted = m; if (m) stopMusic(); }

  function init() {
    Object.keys(URLS).forEach((k) => loadImage(k, URLS[k]));
    loadSounds();
  }

  return { init, img, playSfx, playMusic, stopMusic, setMuted, URLS, SOUND_URLS };
})();
