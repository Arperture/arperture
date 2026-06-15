/* DOGWALKER — core game: engine loop, leash physics, tangle, dog & Karen FSMs,
 * economy/shop, levels, rendering. Pure client-side; no build step.
 */
(function () {
  const A = DW.Assets, IN = DW.Input;
  const TILE = 64; DW.TILE = TILE;

  // ---------- tunables ----------
  const PLAYER_SPEED = 235;     // px/s base
  const LEASH_LEN = 96;         // comfortable leash length
  const TENSION_K = 7.5;        // how hard an overstretched leash yanks the player
  const DOG_PULLBACK = 11;      // leash spring pulling an overstretched dog back
  const DOG_PULL = 240;         // distraction pull accel (×personality.pull)
  const AGGRO = 165;            // distraction aggro radius
  const SCARE_R = 150;          // truck scare radius
  const KAREN_SPEED = 72;
  const VISION_RANGE = 250;
  const VISION_HALF = 0.6;      // radians (~34°)
  const RECORD_TIME = 5;
  const POOP_DUR = 3;
  const BAG_RANGE = 62;
  const HAND_R = 13;

  // ---------- helpers ----------
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  function segInt(p1, p2, p3, p4) { // do segments p1p2 & p3p4 cross?
    const d = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x);
    if (Math.abs(d) < 1e-6) return false;
    const t = ((p3.x - p1.x) * (p4.y - p3.y) - (p3.y - p1.y) * (p4.x - p3.x)) / d;
    const u = ((p3.x - p1.x) * (p2.y - p1.y) - (p3.y - p1.y) * (p2.x - p1.x)) / d;
    return t > 0.05 && t < 0.95 && u > 0.05 && u < 0.95;
  }

  // ---------- save / economy ----------
  const SAVE_KEY = 'dogwalker_save_v1';
  let save = loadSave();
  function loadSave() {
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (s && typeof s.money === 'number') return s;
    } catch (e) {}
    return { money: 0, unlocked: 0, upgrades: { bags: 0, stam: 0, hands: 0, shoes: 0, treat: 0 } };
  }
  function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }
  const up = (id) => save.upgrades[id] || 0;

  // derived stats from upgrades
  const stat = {
    startBags: () => 5 + up('bags') * 2,
    maxStam: () => 100 * (1 + up('stam') * 0.20),
    untangleRate: () => 1 + up('hands') * 0.20,
    walkSpeed: () => PLAYER_SPEED * (1 + up('shoes') * 0.10),
    pullMult: () => 1 - up('treat') * 0.12,
  };

  // ---------- canvas ----------
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  let VW = 0, VH = 0, DPR = 1;
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    VW = window.innerWidth; VH = window.innerHeight;
    canvas.width = VW * DPR; canvas.height = VH * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener('resize', resize);

  // ---------- game state ----------
  const ST = { MENU: 'menu', PLAY: 'play', SUMMARY: 'summary' };
  let state = ST.MENU;
  let G = null;        // current level runtime
  let levelIndex = 0;
  let cam = { x: 0, y: 0 };

  // ---------- DOM refs ----------
  const $ = (id) => document.getElementById(id);
  const overlays = { menu: $('menu'), shop: $('shop'), summary: $('summary'), hud: $('hud') };
  function showOverlay(name) {
    ['menu', 'shop', 'summary'].forEach((n) => overlays[n].classList.toggle('show', n === name));
    overlays.hud.classList.toggle('show', name === null && state === ST.PLAY);
  }
  let toastT = 0;
  function toast(msg, dur = 1.6) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); toastT = dur; }

  // ======================================================================
  //  LEVEL SETUP
  // ======================================================================
  function buildLevel(idx) {
    const L = DW.LEVELS[idx];
    const worldW = L.cols * TILE, worldH = L.rows * TILE;
    const px = (t) => t * TILE + TILE / 2;

    const solids = L.houses.map((h) => ({ x: h.x * TILE, y: h.y * TILE, w: h.w * TILE, h: h.h * TILE, sprite: h.sprite }));

    const player = { x: px(L.player.x), y: px(L.player.y), vx: 0, vy: 0, r: 18, face: 1, stam: stat.maxStam(), walkPhase: 0 };

    const dogs = L.dogs.map((id, i) => {
      const d = DW.DOGS[id];
      return {
        def: d, x: player.x - 30 - i * 12, y: player.y + (i - (L.dogs.length - 1) / 2) * 26,
        vx: 0, vy: 0, r: d.size, anchor: i, fsm: 'follow',
        poopT: rand(d.poopEvery[0], d.poopEvery[1]) * 0.6, poopTimer: 0,
        scareTimer: 0, target: null, walkPhase: Math.random() * 6,
      };
    });

    const squirrels = (L.squirrels || []).map((s) => ({ x: px(s.x), y: px(s.y), hx: px(s.x), hy: px(s.y), vx: 0, vy: 0, r: 11, t: Math.random() * 3 }));
    const mailmen = (L.mailmen || []).map((m) => ({ x: px(m.x), y: px(m.y), r: 16 }));

    const karens = L.karens.map((k) => ({
      x: px(k.x), y: px(k.y), r: 17,
      route: k.route.map((w) => ({ x: px(w.x), y: px(w.y) })), wp: 0,
      face: 0, fsm: 'patrol', alertT: 0, recT: 0, target: null, cool: 0, flash: 0,
    }));

    let truck = null;
    if (L.truck) {
      const ty = px(L.truck.row);
      truck = { y: ty, dir: L.truck.dir, period: L.truck.period, timer: L.truck.period * 0.5,
        x: L.truck.dir > 0 ? -120 : worldW + 120, active: false, w: 120, h: 70 };
    }

    G = {
      L, worldW, worldH, solids, player, dogs, squirrels, mailmen, karens, truck,
      finish: { x: px(L.finish.x), y: px(L.finish.y) },
      poops: [], particles: [],
      bags: stat.startBags(), bagged: 0, time: L.time, windT: rand(8, 14),
      tangled: false, untangleProg: 0, recordingAny: false,
      result: null, ended: false, elapsed: 0,
    };
  }

  // ======================================================================
  //  PHYSICS / LEASH
  // ======================================================================
  function handPos(p, idx, n) {
    const a = -Math.PI / 2 + (idx + 0.5 - n / 2) * (Math.PI / Math.max(n, 3));
    return { x: p.x + Math.cos(a) * HAND_R, y: p.y + Math.sin(a) * HAND_R };
  }

  function updatePhysics(dt) {
    const p = G.player, dogs = G.dogs, n = dogs.length;

    // ---- player input & leash tension ----
    let pullX = 0, pullY = 0, tension = 0;
    for (const d of dogs) {
      const dx = d.x - p.x, dy = d.y - p.y, dd = Math.hypot(dx, dy) || 1;
      const over = dd - LEASH_LEN;
      if (over > 0) {
        const f = over * TENSION_K;
        pullX += (dx / dd) * f; pullY += (dy / dd) * f; tension += over;
      }
    }
    const mv = IN.state.move;
    let speed = stat.walkSpeed();
    if (G.tangled) speed *= 0.5;
    if (p.stam <= 0) speed *= 0.6;

    // desired velocity from input; leash pull drags the player's position too
    p.vx = lerp(p.vx, mv.x * speed, 0.22);
    p.vy = lerp(p.vy, mv.y * speed, 0.22);
    p.x += (p.vx + pullX) * dt; p.y += (p.vy + pullY) * dt;
    if (Math.abs(mv.x) > 0.1) p.face = mv.x < 0 ? -1 : 1;
    p.walkPhase += (Math.hypot(mv.x, mv.y)) * dt * 10;

    // stamina: drains while fighting strong pull, regens otherwise
    const fighting = tension > 18 && (mv.x * pullX + mv.y * pullY) < -5;
    p.stam += (fighting ? -34 : 26) * dt;
    p.stam = clamp(p.stam, 0, stat.maxStam());
    if (fighting && Math.random() < dt * 4) spawnParticle(p.x, p.y + 6, 'sweat');

    collideSolids(p, dt);
    p.x = clamp(p.x, p.r, G.worldW - p.r); p.y = clamp(p.y, p.r, G.worldH - p.r);

    // ---- dogs ----
    for (const d of dogs) {
      const hand = handPos(p, d.anchor, n);
      updateDogFSM(d, dt);
      let ax = 0, ay = 0;

      if (d.fsm === 'pooping') {
        d.vx *= 0.7; d.vy *= 0.7; // rooted
      } else {
        // leash spring toward hand (keeps dog near player)
        const hx = hand.x - d.x, hy = hand.y - d.y, hd = Math.hypot(hx, hy) || 1;
        const over = hd - LEASH_LEN * 0.7;
        if (over > 0) { ax += (hx / hd) * over * DOG_PULLBACK; ay += (hy / hd) * over * DOG_PULLBACK; }

        if (d.fsm === 'distracted' && d.target) {
          const tx = d.target.x - d.x, ty = d.target.y - d.y, td = Math.hypot(tx, ty) || 1;
          const f = DOG_PULL * d.def.pull * stat.pullMult();
          ax += (tx / td) * f; ay += (ty / td) * f;
          if (Math.random() < dt * 6) spawnParticle(d.x, d.y, 'dust');
        } else if (d.fsm === 'scared' && G.truck) {
          const tx = d.x - G.truck.x, ty = d.y - G.truck.y, td = Math.hypot(tx, ty) || 1;
          ax += (tx / td) * DOG_PULL * 1.3; ay += (ty / td) * DOG_PULL * 1.3;
        } else {
          // follow: gentle wander
          d.walkPhase += dt;
          ax += Math.cos(d.walkPhase * 2.1) * 14; ay += Math.sin(d.walkPhase * 1.7) * 14;
        }
      }
      d.vx = (d.vx + ax * dt) * 0.86;
      d.vy = (d.vy + ay * dt) * 0.86;
      const sp = Math.hypot(d.vx, d.vy), max = d.def.speed;
      if (sp > max) { d.vx = d.vx / sp * max; d.vy = d.vy / sp * max; }
      d.x += d.vx * dt; d.y += d.vy * dt;

      // hard leash clamp to player (can't run off forever)
      const dx = d.x - p.x, dy = d.y - p.y, dd = Math.hypot(dx, dy) || 1, MAXL = LEASH_LEN * 1.7;
      if (dd > MAXL) { d.x = p.x + dx / dd * MAXL; d.y = p.y + dy / dd * MAXL; }
      collideSolids(d, dt);
      d.x = clamp(d.x, d.r, G.worldW - d.r); d.y = clamp(d.y, d.r, G.worldH - d.r);
    }

    // ---- tangle detection (leashes crossing) ----
    let crossings = 0;
    const leash = dogs.map((d) => ({ a: handPos(p, d.anchor, n), b: { x: d.x, y: d.y } }));
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++)
        if (segInt(leash[i].a, leash[i].b, leash[j].a, leash[j].b)) crossings++;

    const wasTangled = G.tangled;
    G.tangled = crossings > 0;
    if (G.tangled && !wasTangled && Math.random() < 0.10 && G.bags > 0) {
      G.bags--; toast('💥 A leash snag ripped a bag!'); A.playSfx('rip');
    }

    // ---- untangle (hold while nearly still) ----
    if (G.tangled && IN.untangleHeld() && Math.hypot(p.vx, p.vy) < 60) {
      G.untangleProg += dt * stat.untangleRate() * 0.7;
      spawnParticle(p.x + rand(-12, 12), p.y - 14, 'spark');
      if (G.untangleProg >= 1) { reorderLeashes(); G.untangleProg = 0; toast('✨ Untangled!'); }
    } else {
      G.untangleProg = Math.max(0, G.untangleProg - dt * 0.5);
    }
  }

  function reorderLeashes() { // sort dogs by angle around player; assign hands in angular order
    const p = G.player;
    const order = G.dogs.map((d, i) => ({ i, a: Math.atan2(d.y - p.y, d.x - p.x) }))
      .sort((u, v) => u.a - v.a);
    order.forEach((o, slot) => { G.dogs[o.i].anchor = slot; });
  }

  function collideSolids(e, dt) {
    for (const s of G.solids) {
      const nx = clamp(e.x, s.x, s.x + s.w), ny = clamp(e.y, s.y, s.y + s.h);
      const dx = e.x - nx, dy = e.y - ny, d2 = dx * dx + dy * dy;
      if (d2 < e.r * e.r) {
        const d = Math.sqrt(d2) || 0.01;
        const push = e.r - d;
        e.x += (dx / d) * push; e.y += (dy / d) * push;
        if (Math.abs(dx) > Math.abs(dy)) e.vx = 0; else e.vy = 0;
      }
    }
  }

  // ======================================================================
  //  DOG FSM
  // ======================================================================
  function nearestDistraction(d) {
    let best = null, bd = AGGRO;
    for (const s of G.squirrels) { const dd = dist(d.x, d.y, s.x, s.y); if (dd < bd) { bd = dd; best = s; } }
    for (const m of G.mailmen) { const dd = dist(d.x, d.y, m.x, m.y); if (dd < bd) { bd = dd; best = m; } }
    return best;
  }
  function updateDogFSM(d, dt) {
    // scared by truck overrides
    if (G.truck && G.truck.active && dist(d.x, d.y, G.truck.x, G.truck.y) < SCARE_R) {
      d.fsm = 'scared'; d.scareTimer = 0.6; return;
    }
    if (d.scareTimer > 0) { d.scareTimer -= dt; d.fsm = 'scared'; return; }

    if (d.fsm === 'pooping') {
      d.poopTimer -= dt;
      if (d.poopTimer <= 0) {
        G.poops.push({ x: d.x, y: d.y, r: 12, bagged: false, fade: 1, age: 0 });
        d.poopT = rand(d.def.poopEvery[0], d.def.poopEvery[1]);
        d.fsm = 'follow'; A.playSfx('bark', 0.3);
      }
      return;
    }
    // poop timer
    d.poopT -= dt;
    if (d.poopT <= 0) { d.fsm = 'pooping'; d.poopTimer = POOP_DUR; return; }

    const dis = nearestDistraction(d);
    if (dis) { d.fsm = 'distracted'; d.target = dis; if (Math.random() < dt * 1.2) A.playSfx('bark', 0.25); }
    else { d.fsm = 'follow'; d.target = null; }
  }

  // ======================================================================
  //  KAREN FSM + vision
  // ======================================================================
  function losClear(ax, ay, bx, by) { // line of sight not blocked by a house
    for (const s of G.solids) {
      // sample a few points along the ray
      for (let t = 0.1; t < 1; t += 0.12) {
        const x = lerp(ax, bx, t), y = lerp(ay, by, t);
        if (x > s.x && x < s.x + s.w && y > s.y && y < s.y + s.h) return false;
      }
    }
    return true;
  }
  function karenSees(k, poop) {
    const dd = dist(k.x, k.y, poop.x, poop.y);
    if (dd > VISION_RANGE) return false;
    const ang = Math.atan2(poop.y - k.y, poop.x - k.x);
    let diff = Math.abs(((ang - k.face + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    if (diff > VISION_HALF) return false;
    return losClear(k.x, k.y, poop.x, poop.y);
  }
  function updateKaren(k, dt) {
    if (k.flash > 0) k.flash -= dt;
    if (k.cool > 0) k.cool -= dt;

    if (k.fsm === 'recording') {
      k.recT -= dt; k.flash = 0.12;
      const t = k.target;
      if (!t || t.bagged || !karenSees(k, t)) { k.fsm = 'patrol'; k.cool = 1.2; k.target = null; return; }
      if (k.recT <= 0) { endLevel(false, 'busted'); }
      return;
    }
    if (k.fsm === 'alert') {
      k.alertT -= dt;
      if (!k.target || k.target.bagged || !karenSees(k, k.target)) { k.fsm = 'patrol'; return; }
      if (k.alertT <= 0) { k.fsm = 'recording'; k.recT = RECORD_TIME; A.playSfx('camera', 0.8); }
      return;
    }

    // patrol
    const wp = k.route[k.wp];
    const dx = wp.x - k.x, dy = wp.y - k.y, dd = Math.hypot(dx, dy) || 1;
    if (dd < 6) { k.wp = (k.wp + 1) % k.route.length; }
    else {
      k.x += (dx / dd) * KAREN_SPEED * dt; k.y += (dy / dd) * KAREN_SPEED * dt;
      k.face = Math.atan2(dy, dx);
    }
    if (k.cool <= 0) {
      for (const poop of G.poops) {
        if (!poop.bagged && karenSees(k, poop)) { k.fsm = 'alert'; k.alertT = 0.6; k.target = poop; break; }
      }
    }
  }

  // ======================================================================
  //  PARTICLES, SQUIRRELS, TRUCK
  // ======================================================================
  function spawnParticle(x, y, type) {
    const c = { dust: '#cdb38b', sweat: '#7fd3ff', spark: '#ffd23f' }[type];
    G.particles.push({ x, y, vx: rand(-30, 30), vy: rand(-50, -10), life: 0.6, max: 0.6, c, r: rand(2, 5), type });
  }
  function updateParticles(dt) {
    for (const pt of G.particles) { pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vy += 60 * dt; pt.life -= dt; }
    G.particles = G.particles.filter((p) => p.life > 0);
  }
  function updateSquirrels(dt) {
    for (const s of G.squirrels) {
      // flee nearest dog/player if close, else wander near home
      let fx = 0, fy = 0, fled = false;
      const threats = [G.player, ...G.dogs];
      for (const th of threats) {
        const dd = dist(s.x, s.y, th.x, th.y);
        if (dd < 90) { fx += (s.x - th.x) / dd; fy += (s.y - th.y) / dd; fled = true; }
      }
      if (fled) { s.vx = lerp(s.vx, fx * 160, 0.3); s.vy = lerp(s.vy, fy * 160, 0.3); }
      else {
        s.t += dt;
        const hx = s.hx - s.x, hy = s.hy - s.y;
        s.vx = lerp(s.vx, Math.cos(s.t * 1.3) * 40 + hx * 0.6, 0.05);
        s.vy = lerp(s.vy, Math.sin(s.t * 1.1) * 40 + hy * 0.6, 0.05);
      }
      s.x += s.vx * dt; s.y += s.vy * dt;
      s.x = clamp(s.x, s.r, G.worldW - s.r); s.y = clamp(s.y, s.r, G.worldH - s.r);
    }
  }
  function updateTruck(dt) {
    const t = G.truck; if (!t) return;
    if (!t.active) {
      t.timer -= dt;
      if (t.timer <= 0) { t.active = true; t.x = t.dir > 0 ? -120 : G.worldW + 120; }
    } else {
      t.x += t.dir * 230 * dt;
      if ((t.dir > 0 && t.x > G.worldW + 120) || (t.dir < 0 && t.x < -120)) { t.active = false; t.timer = t.period; }
    }
  }

  // ======================================================================
  //  ROUND FLOW
  // ======================================================================
  function tryBag() {
    let best = null, bd = BAG_RANGE;
    for (const poop of G.poops) {
      if (poop.bagged) continue;
      const dd = dist(G.player.x, G.player.y, poop.x, poop.y);
      if (dd < bd) { bd = dd; best = poop; }
    }
    if (!best) return;
    if (G.bags <= 0) { toast('🚫 Out of bags!'); return; }
    best.bagged = true; G.bags--; G.bagged++;
    A.playSfx('cash', 0.5);
    for (let i = 0; i < 6; i++) spawnParticle(best.x, best.y, 'spark');
  }

  function endLevel(success, reason) {
    if (G.ended) return;
    G.ended = true; G.result = success; state = ST.SUMMARY;
    const L = G.L;
    const unbagged = G.poops.filter((p) => !p.bagged).length;
    let pay = 0, stars = 0, title = '';
    if (success) {
      const base = G.bagged * 22;
      const timeBonus = Math.floor(G.time) * 3;
      const clean = unbagged === 0 ? 60 : 0;
      pay = base + timeBonus + clean;
      stars = unbagged === 0 ? 3 : (unbagged <= 1 ? 2 : 1);
      title = stars === 3 ? 'Perfect Walk!' : 'Nice Walk!';
    } else {
      pay = G.bagged * 8;
      stars = 0;
      title = reason === 'busted' ? '📱 You Got Posted!' : "⏰ Out of Time!";
    }
    save.money += pay;
    if (success && levelIndex >= save.unlocked && levelIndex + 1 < DW.LEVELS.length) save.unlocked = levelIndex + 1;
    persist();

    // render summary
    $('sumTitle').textContent = title;
    $('sumStars').textContent = stars ? '★★★★★'.slice(0, stars) + '☆☆☆'.slice(0, 3 - stars) : '☆☆☆';
    const lines = [
      ['💩 Poops bagged', '×' + G.bagged + '  →  $' + (success ? G.bagged * 22 : G.bagged * 8)],
    ];
    if (success) {
      lines.push(['⏱️ Time bonus', '$' + Math.floor(G.time) * 3]);
      if (unbagged === 0) lines.push(['✨ Spotless street', '$60']);
      else lines.push(['🚫 Left ' + unbagged + ' behind', '$0']);
    } else if (reason === 'busted') {
      lines.push(['📱 Karen went viral', 'Reputation hit!']);
    }
    $('sumLines').innerHTML = lines.map((l) =>
      `<div class="summary-line"><span>${l[0]}</span><span>${l[1]}</span></div>`).join('') +
      `<div class="summary-line total"><span>Earned</span><span>$${pay}</span></div>`;
    const next = $('btnNext');
    const last = levelIndex + 1 >= DW.LEVELS.length;
    next.textContent = success ? (last ? '🏆 Finish' : 'Next Level ▶') : 'Back to Menu';
    A.stopMusic();
    A.playSfx(success ? 'cash' : 'camera', 0.8);
    showOverlay('summary');
    updateMenuStats();
  }

  function checkRoundEnd() {
    if (G.ended) return;
    if (dist(G.player.x, G.player.y, G.finish.x, G.finish.y) < TILE * 0.7) { endLevel(true); return; }
    if (G.time <= 0) endLevel(false, 'time');
  }

  // ======================================================================
  //  UPDATE
  // ======================================================================
  function update(dt) {
    if (state !== ST.PLAY || !G || G.ended) return;
    G.elapsed += dt; G.time -= dt;
    IN.update();
    if (IN.takeBag()) tryBag();

    updatePhysics(dt);
    for (const k of G.karens) updateKaren(k, dt);
    updateSquirrels(dt);
    updateTruck(dt);
    updateParticles(dt);

    // poop fade for bagged
    for (const p of G.poops) { if (p.bagged) p.fade -= dt * 2; }
    G.poops = G.poops.filter((p) => p.fade > 0);

    // wind gust event (Notion poop-bag economy loss event)
    G.windT -= dt;
    if (G.windT <= 0) {
      G.windT = rand(10, 16);
      if (G.bags > 0 && Math.random() < 0.5) { G.bags--; toast('💨 A wind gust stole a bag!'); }
    }

    G.recordingAny = G.karens.some((k) => k.fsm === 'recording');
    if (G.recordingAny) A.playMusic('tension', 0.4); else A.playMusic('music', 0.3);

    checkRoundEnd();
    updateHUD();
  }

  function updateHUD() {
    $('hLevel').textContent = levelIndex + 1;
    $('hMoney').textContent = save.money;
    $('hBags').textContent = G.bags;
    $('hTime').textContent = Math.max(0, Math.ceil(G.time));
    $('hStam').style.width = (G.player.stam / stat.maxStam() * 100) + '%';
    $('hStam').style.background = G.player.stam < 25 ? 'var(--danger)' : 'var(--good)';
    const remain = G.poops.filter((p) => !p.bagged).length;
    $('hObjective').textContent = G.recordingAny
      ? '📱 A KAREN IS RECORDING — bag the poop NOW!'
      : (remain ? `Bag ${remain} 💩 & reach the 🏁 finish` : 'Street is clean — reach the 🏁 finish!');
  }

  // ======================================================================
  //  RENDER
  // ======================================================================
  function drawSprite(key, x, y, w, h, flip) {
    const d = A.img(key);
    if (!d) return false;
    const iw = d.naturalWidth || d.width, ih = d.naturalHeight || d.height;
    const s = Math.min(w / iw, h / ih), dw = iw * s, dh = ih * s; // preserve aspect
    ctx.save(); ctx.translate(x, y); if (flip) ctx.scale(-1, 1);
    ctx.drawImage(d, -dw / 2, -dh / 2, dw, dh); ctx.restore();
    return true;
  }
  const _patCache = {};
  function getPattern(key) {
    if (_patCache[key]) return _patCache[key];           // cache only when ready
    const img = A.img(key); if (!img) return null;        // retry next frame
    _patCache[key] = ctx.createPattern(img, 'repeat');
    return _patCache[key];
  }
  function shadow(x, y, r) { ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(x, y + r * 0.7, r, r * 0.45, 0, 0, 7); ctx.fill(); }

  function render() {
    ctx.clearRect(0, 0, VW, VH);
    if (state === ST.MENU) { renderMenuBg(); return; }
    if (!G) return;

    // camera follow + clamp
    cam.x = clamp(G.player.x - VW / 2, 0, Math.max(0, G.worldW - VW));
    cam.y = clamp(G.player.y - VH / 2, 0, Math.max(0, G.worldH - VH));
    if (G.worldW < VW) cam.x = (G.worldW - VW) / 2;
    if (G.worldH < VH) cam.y = (G.worldH - VH) / 2;
    if (G.recordingAny) { cam.x += rand(-4, 4); cam.y += rand(-4, 4); } // shake
    ctx.save(); ctx.translate(-cam.x, -cam.y);

    drawGround();
    // karen vision cones (under entities)
    for (const k of G.karens) drawCone(k);
    // finish
    drawFinish();
    // poops
    for (const p of G.poops) {
      ctx.globalAlpha = p.fade; shadow(p.x, p.y, p.r * 0.8);
      if (!drawSprite('poop', p.x, p.y, p.r * 2.4, p.r * 2.4)) {
        ctx.fillStyle = '#7a4a22'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    // props already drawn in ground; squirrels, mailmen
    for (const s of G.squirrels) { shadow(s.x, s.y, s.r); if (!drawSprite('squirrel', s.x, s.y, s.r * 2.6, s.r * 2.6, s.vx < 0)) { ctx.fillStyle = '#9a9a9a'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill(); } }
    for (const m of G.mailmen) { shadow(m.x, m.y, m.r); if (!drawSprite('mailman', m.x, m.y, m.r * 2.6, m.r * 3)) { ctx.fillStyle = '#3a7bd5'; ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, 7); ctx.fill(); } }

    // truck
    if (G.truck && G.truck.active) {
      const t = G.truck; shadow(t.x, t.y + 10, t.w * 0.4);
      if (!drawSprite('truck', t.x, t.y, t.w, t.h, t.dir < 0)) {
        ctx.fillStyle = '#3c4654'; ctx.fillRect(t.x - t.w / 2, t.y - t.h / 2, t.w, t.h);
        ctx.fillStyle = '#aee1ff'; ctx.fillRect(t.x + t.dir * t.w * 0.28, t.y - t.h / 2 + 6, t.w * 0.18, t.h * 0.4);
      }
    }

    // leashes
    drawLeashes();

    // dogs
    for (const d of G.dogs) {
      shadow(d.x, d.y, d.r);
      const pooping = d.fsm === 'pooping';
      if (!drawSprite(d.def.sprite, d.x, d.y - (pooping ? 0 : Math.abs(Math.sin(d.walkPhase * 6)) * 3), d.r * 2.6, d.r * 2.6, d.vx < 0)) {
        ctx.fillStyle = d.def.color; ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 7); ctx.fill();
        ctx.fillStyle = '#0003'; ctx.beginPath(); ctx.arc(d.x + d.r * 0.4 * Math.sign(d.vx || 1), d.y - d.r * 0.2, 3, 0, 7); ctx.fill();
      }
      if (pooping) { ctx.fillStyle = '#fff'; ctx.font = 'bold 18px sans-serif'; ctx.fillText('💩…', d.x + d.r, d.y - d.r); }
      if (d.fsm === 'distracted') { ctx.fillStyle = '#ffd23f'; ctx.font = 'bold 16px sans-serif'; ctx.fillText('❗', d.x - 4, d.y - d.r - 4); }
    }

    // player
    const p = G.player; shadow(p.x, p.y, p.r);
    const bob = Math.abs(Math.sin(p.walkPhase)) * 3;
    if (!drawSprite('player', p.x, p.y - bob, 56, 64, p.face < 0)) {
      ctx.fillStyle = '#2f6fed'; ctx.beginPath(); ctx.arc(p.x, p.y - bob, p.r, 0, 7); ctx.fill();
      ctx.fillStyle = '#ffd9b3'; ctx.beginPath(); ctx.arc(p.x, p.y - bob - p.r * 0.6, p.r * 0.55, 0, 7); ctx.fill();
    }
    if (G.tangled) { ctx.fillStyle = '#ff4d5e'; ctx.font = 'bold 20px sans-serif'; ctx.fillText('🌀', p.x - 8, p.y - p.r - 18); }

    // karens (over entities)
    for (const k of G.karens) drawKaren(k);

    // particles
    for (const pt of G.particles) {
      ctx.globalAlpha = pt.life / pt.max; ctx.fillStyle = pt.c;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
    }

    ctx.restore();

    // untangle progress ring (screen space)
    if (G.tangled && G.untangleProg > 0) {
      const sx = (G.player.x - cam.x), sy = (G.player.y - cam.y) - 44;
      ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 5; ctx.beginPath();
      ctx.arc(sx, sy, 16, -Math.PI / 2, -Math.PI / 2 + G.untangleProg * Math.PI * 2); ctx.stroke();
    }
  }

  function drawGround() {
    const L = G.L;
    // grass base
    const grass = getPattern('tile_grass');
    if (grass) { ctx.fillStyle = grass; ctx.fillRect(cam.x, cam.y, VW, VH); }
    else { ctx.fillStyle = '#7ec85a'; ctx.fillRect(cam.x, cam.y, VW, VH);
      ctx.fillStyle = '#74bd52'; for (let gx = Math.floor(cam.x / TILE) * TILE; gx < cam.x + VW; gx += TILE) for (let gy = Math.floor(cam.y / TILE) * TILE; gy < cam.y + VH; gy += TILE) if (((gx / TILE + gy / TILE) & 1) === 0) ctx.fillRect(gx, gy, TILE, TILE); }
    // roads
    rects(L.roads, 'tile_road', '#5b6470');
    // sidewalks
    rects(L.walks, 'tile_walk', '#cfc7b6');
    // road dashes
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 4; ctx.setLineDash([18, 16]);
    for (const r of L.roads) {
      if (r.w >= r.h) { const y = (r.y + r.h / 2) * TILE; ctx.beginPath(); ctx.moveTo(r.x * TILE, y); ctx.lineTo((r.x + r.w) * TILE, y); ctx.stroke(); }
      else { const x = (r.x + r.w / 2) * TILE; ctx.beginPath(); ctx.moveTo(x, r.y * TILE); ctx.lineTo(x, (r.y + r.h) * TILE); ctx.stroke(); }
    }
    ctx.setLineDash([]);
    // props
    for (const pr of (L.props || [])) {
      const x = pr.x * TILE + TILE / 2, y = pr.y * TILE + TILE / 2;
      shadow(x, y, 14);
      if (!drawSprite(pr.t, x, y, 40, 48)) {
        ctx.fillStyle = pr.t === 'tree' ? '#3f9a4f' : pr.t === 'hydrant' ? '#e0463c' : '#5b8a4a';
        ctx.beginPath(); ctx.arc(x, y, 14, 0, 7); ctx.fill();
      }
    }
    // houses
    for (const s of G.solids) {
      if (!drawSprite(s.sprite, s.x + s.w / 2, s.y + s.h / 2, s.w, s.h)) {
        ctx.fillStyle = '#d98c5f'; ctx.fillRect(s.x, s.y, s.w, s.h);
        ctx.fillStyle = '#a85d3a'; ctx.fillRect(s.x, s.y, s.w, 14);
        ctx.fillStyle = '#7a4226'; ctx.fillRect(s.x + s.w / 2 - 8, s.y + s.h - 22, 16, 22);
      }
    }
  }
  function rects(list, key, color) {
    const pat = getPattern(key);
    ctx.fillStyle = pat || color;
    for (const r of (list || [])) ctx.fillRect(r.x * TILE, r.y * TILE, r.w * TILE, r.h * TILE);
  }
  function drawFinish() {
    const f = G.finish;
    if (!drawSprite('finish', f.x, f.y, 54, 64)) {
      ctx.fillStyle = '#fff'; ctx.fillRect(f.x - 3, f.y - 30, 6, 60);
      ctx.fillStyle = '#222'; for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) if ((i + j) & 1) ctx.fillRect(f.x + 3 + i * 9, f.y - 30 + j * 9, 9, 9);
    }
    ctx.fillStyle = 'rgba(255,210,63,.25)'; ctx.beginPath(); ctx.arc(f.x, f.y, TILE * 0.7, 0, 7); ctx.fill();
  }
  function drawCone(k) {
    const rec = k.fsm === 'recording', al = k.fsm === 'alert';
    ctx.save(); ctx.translate(k.x, k.y); ctx.rotate(k.face);
    const g = ctx.createRadialGradient(0, 0, 10, 0, 0, VISION_RANGE);
    const col = rec ? '255,60,80' : al ? '255,160,40' : '255,235,120';
    g.addColorStop(0, `rgba(${col},.35)`); g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.arc(0, 0, VISION_RANGE, -VISION_HALF, VISION_HALF); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function drawKaren(k) {
    shadow(k.x, k.y, k.r);
    const flip = Math.cos(k.face) < 0;
    if (!drawSprite('karen', k.x, k.y, k.r * 2.6, k.r * 3, flip)) {
      ctx.fillStyle = k.fsm === 'recording' ? '#ff4d5e' : '#b06ad0';
      ctx.beginPath(); ctx.arc(k.x, k.y, k.r, 0, 7); ctx.fill();
      ctx.fillStyle = '#222'; ctx.fillRect(k.x + Math.cos(k.face) * 16 - 4, k.y + Math.sin(k.face) * 16 - 6, 8, 12);
    }
    if (k.fsm === 'recording') {
      ctx.fillStyle = '#ff2d44'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('📱 ' + Math.ceil(k.recT), k.x, k.y - k.r - 14); ctx.textAlign = 'left';
    } else if (k.fsm === 'alert') { ctx.fillStyle = '#ff9a28'; ctx.font = 'bold 20px sans-serif'; ctx.fillText('❓', k.x - 6, k.y - k.r - 10); }
  }
  function drawLeashes() {
    const p = G.player, n = G.dogs.length;
    ctx.lineWidth = 3; ctx.lineCap = 'round';
    const colors = ['#ff5a5f', '#3fa9ff', '#ffb13f', '#7bdb5a', '#c46aff'];
    G.dogs.forEach((d, i) => {
      const h = handPos(p, d.anchor, n);
      ctx.strokeStyle = colors[i % colors.length];
      const mx = (h.x + d.x) / 2, my = (h.y + d.y) / 2 + (G.tangled ? 0 : 8);
      ctx.beginPath(); ctx.moveTo(h.x, h.y); ctx.quadraticCurveTo(mx, my, d.x, d.y); ctx.stroke();
    });
  }

  // ---- menu background (subtle animated) ----
  let bgT = 0;
  function renderMenuBg() {
    ctx.fillStyle = '#7ec85a'; ctx.fillRect(0, 0, VW, VH);
    bgT += 0.01;
    ctx.fillStyle = '#74bd52';
    for (let gx = 0; gx < VW; gx += TILE) for (let gy = 0; gy < VH; gy += TILE) if (((gx / TILE + gy / TILE) & 1) === 0) ctx.fillRect(gx, gy, TILE, TILE);
    ctx.fillStyle = '#5b6470'; ctx.fillRect(0, VH * 0.5 - 60, VW, 120);
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 5; ctx.setLineDash([26, 22]);
    ctx.beginPath(); ctx.moveTo(0, VH * 0.5); ctx.lineTo(VW, VH * 0.5); ctx.stroke(); ctx.setLineDash([]);
  }

  // ======================================================================
  //  SHOP UI
  // ======================================================================
  function renderShop() {
    $('sMoney').textContent = save.money;
    const list = $('shopList'); list.innerHTML = '';
    DW.UPGRADES.forEach((u) => {
      const lv = up(u.id), maxed = lv >= u.max, cost = u.cost(lv);
      const div = document.createElement('div'); div.className = 'shopitem';
      div.innerHTML = `<div><b>${u.icon} ${u.name}</b><div class="lv">${u.desc} — Lv ${lv}/${u.max}</div></div>`;
      const btn = document.createElement('button'); btn.className = 'buy';
      btn.textContent = maxed ? 'MAX' : '$' + cost;
      btn.disabled = maxed || save.money < cost;
      btn.onclick = () => { if (save.money >= cost && !maxed) { save.money -= cost; save.upgrades[u.id] = lv + 1; persist(); A.playSfx('cash', 0.6); renderShop(); updateMenuStats(); } };
      div.appendChild(btn); list.appendChild(div);
    });
  }
  function updateMenuStats() {
    $('mMoney').textContent = save.money; $('sMoney').textContent = save.money;
    $('mProgress').textContent = 'Level ' + (save.unlocked + 1) + ' unlocked';
  }

  // ======================================================================
  //  FLOW WIRING
  // ======================================================================
  function startLevel(idx) {
    levelIndex = clamp(idx, 0, DW.LEVELS.length - 1);
    buildLevel(levelIndex);
    state = ST.PLAY; showOverlay(null);
    overlays.hud.classList.add('show');
    A.playMusic('music', 0.3);
    toast('🐾 ' + DW.LEVELS[levelIndex].name, 2);
  }
  function gotoMenu() { state = ST.MENU; A.stopMusic(); showOverlay('menu'); updateMenuStats(); }

  $('btnPlay').onclick = () => { audioUnlock(); startLevel(save.unlocked); };
  $('btnShop').onclick = () => { audioUnlock(); renderShop(); showOverlay('shop'); };
  $('btnShopBack').onclick = () => showOverlay('menu');
  $('btnRetry').onclick = () => startLevel(levelIndex);
  $('btnNext').onclick = () => {
    const last = levelIndex + 1 >= DW.LEVELS.length;
    if (G && G.result && !last) startLevel(levelIndex + 1);
    else gotoMenu();
  };

  let audioReady = false;
  function audioUnlock() { if (audioReady) return; audioReady = true; /* gesture lets audio play */ }

  // ======================================================================
  //  MAIN LOOP
  // ======================================================================
  let last = performance.now();
  function frame(now) {
    let dt = (now - last) / 1000; last = now;
    if (dt > 0.05) dt = 0.05; // clamp big gaps
    if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('toast').classList.remove('show'); }
    update(dt);
    render();
    requestAnimationFrame(frame);
  }

  function init() {
    resize(); A.init(); IN.setupTouch(); updateMenuStats(); showOverlay('menu');
    requestAnimationFrame(frame);
  }
  init();
})();
