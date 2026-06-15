# 🐾 DOGWALKER

A vibrant 2D top-down arcade game: walk a pack of dogs through a chaotic
suburban neighborhood, fight the leash physics, scoop every poop, and reach the
finish flag **before a nosy "Karen" records you and posts it online.**

Built from the [Dogwalker design doc] as a deployable HTML5 browser game, with an
AI-generated art pack (Higgsfield / Nano Banana Pro).

## Play / controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move | WASD / Arrow keys | left joystick |
| Bag poop | `E` / `Space` | **BAG** button |
| Untangle leashes | hold `Shift` | hold **UNTANGLE** button |

**Goal:** reach the 🏁 finish before the timer runs out. Every dog poops on its
own timer — bag it fast, because a Karen who films unbagged poop for 5 seconds
ends your walk. Earn cash from bagged poop + leftover time, then spend it in the
Shop on upgrades (bag belt, energy drink, quick hands, comfy shoes, dog treats).
Clear all 5 levels of rising chaos.

## Core systems (from the design doc)

- **Leash spring physics + tangle** — dogs are spring-coupled to the walker; when
  leashes cross you're *tangled* (50% slower) until you hold to untangle.
- **Dog FSM** — Follow / Distracted (squirrels & mail carriers yank the leash) /
  Pooping / Scared (the garbage truck). Each breed has its own pull, speed and
  poop timer (Pug, Golden, Dalmatian, Chihuahua, Great Dane).
- **Karen AI** — patrols with a vision cone: Patrol → Alert → Recording (5s) →
  you got posted (fail).
- **Poop-bag economy** — limited bags, lost to wind gusts and leash snags.
- **Meta-game** — cash, shop upgrades, 5 hand-crafted levels, localStorage save.
- **Juice** — particles, screen shake, escalating tension music hook (audio
  optional; see below).

## Project layout

```
dogwalker/
  index.html      canvas, HTML/CSS UI overlays, mobile controls, boot
  logic.js        Higgsfield game-rules module (game is client-authoritative)
  src/assets.js   CDN art loader + in-browser background keying (white -> alpha)
  src/input.js    keyboard + touch joystick/buttons
  src/levels.js   dog personalities, shop catalog, 5 levels
  src/game.js     engine loop, physics, FSMs, economy, rendering
```

The game is pure client-side — open `index.html` in any modern browser.

### Art / audio notes
- Art is generated with Higgsfield and **hot-linked from its CDN**; sprites are
  generated on white and the background is keyed out **in the browser** at load
  time (CORS-permitting; falls back to the raw image otherwise). Tiles are
  full-bleed textures. Missing assets fall back to drawn shapes, so it always
  runs.
- Audio is wired but the URL map is empty (the audio-generation tool was not
  available in the build environment); the game runs silently and will pick up
  sounds if `SOUND_URLS` in `src/assets.js` is filled.

## Deploying to Higgsfield (when MCP write tools are enabled)

1. Zip the **contents** of `dogwalker/` at the zip root (`index.html`,
   `logic.js`, `src/`, `assets/`).
2. `media_upload` the zip → PUT bytes → `media_confirm` (type `file`).
3. `deploy_game` with the confirmed url as `source_game`, plus the 16:9
   `thumbnail` and 1:1 `favicon` (already generated — see URLs in the build log).
4. `publish_game` with the returned `game_id` to list it on the marketplace.
