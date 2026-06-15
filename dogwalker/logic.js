/* DOGWALKER — Higgsfield game-rules module.
 *
 * Dogwalker is a single-player, real-time arcade game. All simulation,
 * rendering and input run client-side in index.html (see src/*.js); player
 * progress (cash + upgrades) is saved to localStorage in the browser.
 *
 * This module satisfies the platform's requirement that the game ship a
 * logic.js. It exposes a tiny, side-effect-free turn interface describing the
 * single "play" action; the authoritative game runs in the client.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api; // CommonJS
  else root.DogwalkerLogic = api;                                            // browser global
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const meta = {
    title: 'Dogwalker',
    mode: 'single-player',
    realtime: true,
    minPlayers: 1,
    maxPlayers: 1,
  };

  // Minimal turn-based shape (the real game is client-authoritative).
  function createInitialState() {
    return { phase: 'playing', score: 0 };
  }
  function getValidActions(/* state */) {
    return [{ type: 'play' }];
  }
  function applyAction(state, action) {
    if (!state) state = createInitialState();
    if (action && action.type === 'play') return Object.assign({}, state);
    return state;
  }
  function isTerminal(state) {
    return !!state && state.phase === 'over';
  }

  return { meta, createInitialState, getValidActions, applyAction, isTerminal };
});
