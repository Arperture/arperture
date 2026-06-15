/* DOGWALKER — dog personalities, upgrade catalog, and the 5 hand-crafted levels.
 * Coordinates are in TILE units; game.js multiplies by DW.TILE for pixels.
 */
window.DW = window.DW || {};

// ---- Dog personalities (tweak the FSM, per Notion "Dog Personalities") ----
DW.DOGS = {
  pug:    { name: 'Pug',        sprite: 'dog_pug',    color: '#cB9a63', size: 20, pull: 0.8, poopEvery: [7, 12],  speed: 150, scarey: 1.0 },
  golden: { name: 'Golden',     sprite: 'dog_golden', color: '#e7b15a', size: 24, pull: 1.1, poopEvery: [10, 16], speed: 185, scarey: 0.9 },
  dal:    { name: 'Dalmatian',  sprite: 'dog_dal',    color: '#f2efe6', size: 23, pull: 1.5, poopEvery: [12, 18], speed: 215, scarey: 1.1 },
  chi:    { name: 'Chihuahua',  sprite: 'dog_pug',    color: '#d8c08a', size: 15, pull: 1.8, poopEvery: [6, 10],  speed: 205, scarey: 1.6 },
  dane:   { name: 'Great Dane', sprite: 'dog_golden', color: '#8c8c94', size: 30, pull: 2.1, poopEvery: [14, 22], speed: 170, scarey: 0.7 },
};

// ---- Upgrade catalog (the Shop). value(level) returns the bonus at that tier ----
DW.UPGRADES = [
  { id: 'bags',  name: 'Bag Belt',     icon: '🛍️', desc: '+2 starting poop bags',      max: 5, cost: (l) => 60 + l * 50 },
  { id: 'stam',  name: 'Energy Drink', icon: '⚡', desc: '+20% max stamina',           max: 5, cost: (l) => 70 + l * 55 },
  { id: 'hands', name: 'Quick Hands',  icon: '✋', desc: 'Untangle 20% faster',         max: 5, cost: (l) => 70 + l * 55 },
  { id: 'shoes', name: 'Comfy Shoes',  icon: '👟', desc: '+10% walk speed',             max: 5, cost: (l) => 80 + l * 60 },
  { id: 'treat', name: 'Dog Treats',   icon: '🦴', desc: '-12% dog pull force',         max: 5, cost: (l) => 90 + l * 65 },
];

// ---- Levels ----
DW.LEVELS = [
  { // 1 — gentle intro
    name: 'Maple Street', cols: 18, rows: 11, time: 75, par: 3,
    player: { x: 1, y: 5 }, finish: { x: 16, y: 5 },
    roads: [{ x: 1, y: 5, w: 16, h: 1 }],
    walks: [{ x: 1, y: 4, w: 16, h: 1 }, { x: 1, y: 6, w: 16, h: 1 }],
    houses: [
      { x: 3, y: 1, w: 2, h: 2, sprite: 'house1' }, { x: 7, y: 1, w: 2, h: 2, sprite: 'house2' },
      { x: 11, y: 1, w: 2, h: 2, sprite: 'house3' }, { x: 5, y: 8, w: 2, h: 2, sprite: 'house2' },
      { x: 10, y: 8, w: 2, h: 2, sprite: 'house1' },
    ],
    props: [{ x: 6, y: 3, t: 'hydrant' }, { x: 13, y: 7, t: 'trashcan' }, { x: 2, y: 8, t: 'tree' }],
    dogs: ['pug', 'golden'],
    squirrels: [{ x: 9, y: 7 }], mailmen: [],
    karens: [{ x: 8, y: 4, route: [{ x: 6, y: 4 }, { x: 12, y: 4 }] }],
    truck: null,
  },
  { // 2 — add a mailman + extra dog
    name: 'Birchwood Ave', cols: 20, rows: 12, time: 78, par: 4,
    player: { x: 1, y: 6 }, finish: { x: 18, y: 2 },
    roads: [{ x: 1, y: 6, w: 17, h: 1 }, { x: 17, y: 2, w: 1, h: 5 }],
    walks: [{ x: 1, y: 5, w: 17, h: 1 }, { x: 1, y: 7, w: 16, h: 1 }, { x: 16, y: 2, w: 1, h: 4 }],
    houses: [
      { x: 3, y: 2, w: 2, h: 2, sprite: 'house1' }, { x: 7, y: 2, w: 2, h: 2, sprite: 'house3' },
      { x: 11, y: 2, w: 2, h: 2, sprite: 'house2' }, { x: 4, y: 9, w: 2, h: 2, sprite: 'house2' },
      { x: 9, y: 9, w: 2, h: 2, sprite: 'house1' }, { x: 13, y: 9, w: 2, h: 2, sprite: 'house3' },
    ],
    props: [{ x: 6, y: 8, t: 'hydrant' }, { x: 10, y: 4, t: 'tree' }, { x: 15, y: 8, t: 'trashcan' }],
    dogs: ['pug', 'golden', 'dal'],
    squirrels: [{ x: 9, y: 8 }, { x: 14, y: 4 }], mailmen: [{ x: 5, y: 4 }],
    karens: [{ x: 8, y: 5, route: [{ x: 5, y: 5 }, { x: 13, y: 5 }] }],
    truck: null,
  },
  { // 3 — two Karens + garbage truck hazard
    name: 'Cedar Crossing', cols: 22, rows: 13, time: 76, par: 5,
    player: { x: 1, y: 3 }, finish: { x: 20, y: 10 },
    roads: [{ x: 1, y: 3, w: 19, h: 1 }, { x: 19, y: 3, w: 1, h: 8 }, { x: 1, y: 10, w: 19, h: 1 }],
    walks: [{ x: 1, y: 4, w: 18, h: 1 }, { x: 1, y: 9, w: 18, h: 1 }, { x: 1, y: 11, w: 19, h: 1 }],
    houses: [
      { x: 3, y: 5, w: 2, h: 2, sprite: 'house1' }, { x: 7, y: 5, w: 2, h: 2, sprite: 'house2' },
      { x: 11, y: 5, w: 2, h: 2, sprite: 'house3' }, { x: 15, y: 5, w: 2, h: 2, sprite: 'house1' },
      { x: 5, y: 1, w: 2, h: 1, sprite: 'house2' }, { x: 13, y: 1, w: 2, h: 1, sprite: 'house3' },
    ],
    props: [{ x: 6, y: 4, t: 'tree' }, { x: 12, y: 9, t: 'hydrant' }, { x: 17, y: 11, t: 'trashcan' }, { x: 9, y: 7, t: 'tree' }],
    dogs: ['dal', 'golden', 'chi'],
    squirrels: [{ x: 10, y: 8 }, { x: 16, y: 4 }], mailmen: [{ x: 8, y: 4 }],
    karens: [
      { x: 9, y: 4, route: [{ x: 5, y: 4 }, { x: 16, y: 4 }] },
      { x: 10, y: 11, route: [{ x: 4, y: 11 }, { x: 17, y: 11 }] },
    ],
    truck: { row: 7, dir: 1, period: 9 },
  },
  { // 4 — four dogs, more chaos
    name: 'Oakridge Loop', cols: 24, rows: 14, time: 82, par: 6,
    player: { x: 1, y: 7 }, finish: { x: 22, y: 7 },
    roads: [{ x: 1, y: 7, w: 21, h: 1 }, { x: 6, y: 2, w: 1, h: 10 }, { x: 16, y: 2, w: 1, h: 10 }],
    walks: [{ x: 1, y: 6, w: 21, h: 1 }, { x: 1, y: 8, w: 21, h: 1 }],
    houses: [
      { x: 2, y: 3, w: 2, h: 2, sprite: 'house1' }, { x: 9, y: 3, w: 2, h: 2, sprite: 'house2' },
      { x: 12, y: 3, w: 2, h: 2, sprite: 'house3' }, { x: 19, y: 3, w: 2, h: 2, sprite: 'house1' },
      { x: 2, y: 10, w: 2, h: 2, sprite: 'house2' }, { x: 9, y: 10, w: 2, h: 2, sprite: 'house3' },
      { x: 12, y: 10, w: 2, h: 2, sprite: 'house1' }, { x: 19, y: 10, w: 2, h: 2, sprite: 'house2' },
    ],
    props: [{ x: 8, y: 6, t: 'hydrant' }, { x: 15, y: 8, t: 'trashcan' }, { x: 11, y: 8, t: 'tree' }, { x: 4, y: 8, t: 'tree' }, { x: 20, y: 6, t: 'hydrant' }],
    dogs: ['pug', 'dal', 'golden', 'chi'],
    squirrels: [{ x: 8, y: 5 }, { x: 14, y: 9 }, { x: 18, y: 6 }], mailmen: [{ x: 11, y: 6 }],
    karens: [
      { x: 10, y: 6, route: [{ x: 7, y: 6 }, { x: 15, y: 6 }] },
      { x: 13, y: 8, route: [{ x: 8, y: 8 }, { x: 18, y: 8 }] },
    ],
    truck: { row: 7, dir: -1, period: 8 },
  },
  { // 5 — the big franchise finale
    name: 'Downtown Gauntlet', cols: 26, rows: 15, time: 88, par: 8,
    player: { x: 1, y: 2 }, finish: { x: 24, y: 12 },
    roads: [
      { x: 1, y: 2, w: 23, h: 1 }, { x: 23, y: 2, w: 1, h: 11 },
      { x: 1, y: 12, w: 23, h: 1 }, { x: 1, y: 2, w: 1, h: 11 }, { x: 1, y: 7, w: 23, h: 1 },
    ],
    walks: [{ x: 1, y: 3, w: 22, h: 1 }, { x: 1, y: 6, w: 22, h: 1 }, { x: 1, y: 8, w: 22, h: 1 }, { x: 1, y: 11, w: 22, h: 1 }],
    houses: [
      { x: 4, y: 4, w: 2, h: 2, sprite: 'house1' }, { x: 9, y: 4, w: 2, h: 2, sprite: 'house2' },
      { x: 14, y: 4, w: 2, h: 2, sprite: 'house3' }, { x: 19, y: 4, w: 2, h: 2, sprite: 'house1' },
      { x: 4, y: 9, w: 2, h: 2, sprite: 'house3' }, { x: 9, y: 9, w: 2, h: 2, sprite: 'house1' },
      { x: 14, y: 9, w: 2, h: 2, sprite: 'house2' }, { x: 19, y: 9, w: 2, h: 2, sprite: 'house3' },
    ],
    props: [{ x: 7, y: 6, t: 'hydrant' }, { x: 12, y: 8, t: 'trashcan' }, { x: 17, y: 6, t: 'tree' }, { x: 21, y: 8, t: 'hydrant' }, { x: 6, y: 8, t: 'tree' }, { x: 16, y: 11, t: 'trashcan' }],
    dogs: ['dane', 'dal', 'golden', 'chi', 'pug'],
    squirrels: [{ x: 8, y: 5 }, { x: 13, y: 10 }, { x: 18, y: 5 }, { x: 21, y: 10 }], mailmen: [{ x: 11, y: 3 }, { x: 16, y: 11 }],
    karens: [
      { x: 10, y: 3, route: [{ x: 4, y: 3 }, { x: 20, y: 3 }] },
      { x: 12, y: 6, route: [{ x: 5, y: 6 }, { x: 19, y: 6 }] },
      { x: 11, y: 11, route: [{ x: 4, y: 11 }, { x: 20, y: 11 }] },
    ],
    truck: { row: 7, dir: 1, period: 7 },
  },
];
