# 🐾 Dogwalker — Project Handoff

**What it is:** a deployable 2D top-down HTML5 arcade game built from the Notion
"Dogwalker" design doc. Walk a pack of dogs, fight leash spring-physics + tangles, bag
poop, dodge phone-wielding "Karens," reach the finish, earn cash, buy upgrades, clear 5
levels. Built to ship on the **Higgsfield** browser-game platform with an AI art pack.

**Status (2026-06-16):** Game **complete, tuned, headless-tested, committed & pushed**.
**Deploy + publish + audio are NOT done** — blocked by a Higgsfield MCP approval gate
(see Blocker). 40 Higgsfield credits used (image gen).

## Where everything lives
- **Repo:** `Arperture/arperture` · **branch:** `claude/youthful-noether-cum4y9`. No PR
  opened (not requested).
- **Game source:** `dogwalker/` — `index.html`, `logic.js`,
  `src/{assets,input,levels,game}.js`, `README.md`
- **Dev-only (repo root, gitignored):** `smoke.js` (headless test), `dogwalker.zip`
  (deploy artifact), `dogwalker-standalone.html` (single-file playtest build)
- Original design doc: Notion "Dogwalker" (Arperture ▸ Parking Lot ▸ Capture).

## How to play / test
- **Standalone:** open `dogwalker-standalone.html` in a browser (needs internet — art
  streams from the CDN). Regenerate after code changes (see build commands).
- **Multi-file:** open `dogwalker/index.html`.
- **Controls:** move WASD/Arrows · bag poop E/Space · untangle hold Shift · pause P/Esc ·
  mute M · (mobile: joystick + on-screen BAG/UNTANGLE buttons).
- **Goal:** reach 🏁 before the timer ends; bag every 💩 before a Karen films it for 6s;
  grab 🛍️ dispensers for bags; spend cash in the Shop; clear 5 levels.

## Architecture (pure client-side, no build step)
- `index.html` — canvas, HTML/CSS overlays (menu/shop/summary/HUD), mobile controls, boot.
- `src/assets.js` — CDN art loader. Sprites are generated on **white**; background is
  **keyed out in the browser** (edge flood-fill → canvas) with a CORS-safe fallback; tiles
  are full-bleed textures; missing assets fall back to drawn shapes. `SOUND_URLS` is empty
  → game runs silent until audio is added.
- `src/input.js` — keyboard + touch joystick/buttons.
- `src/levels.js` — 5 dog personalities, shop upgrade catalog, 5 hand-crafted levels
  (tile-coordinate layouts incl. `bagspots` pickups).
- `src/game.js` — engine loop, leash spring physics + tangle detect/untangle, dog FSM
  (follow/distracted/pooping/scared), Karen FSM (patrol→alert→recording→fail) with vision
  cones, economy/shop/localStorage, rendering, particles, screen shake.
- `logic.js` — minimal Higgsfield game-rules module (game is client-authoritative).
- Save key `dogwalker_save_v1` (money, unlocked level, upgrade tiers).

## Assets (Higgsfield CDN · model Nano Banana Pro)
Base: `https://d8j0ntlcm91z4.cloudfront.net/user_33OO3vKsKDtpmjLQShIWOTRxc3s/`
- 20 images: player, 3 dogs, Karen, squirrel, mail carrier, poop, garbage truck, hydrant,
  trashcan, tree, 3 houses, seamless grass/road/sidewalk tiles, favicon. URLs hard-coded in
  `src/assets.js`.
- **Deploy thumbnail (16:9):** `…/hf_20260615_013213_50d6314e-971c-41dd-a012-896175e64d5a.png`
- **Deploy favicon (1:1):** `…/hf_20260615_014653_3f9489f0-fb5d-4ebe-bda3-baf4e96fc65a.png`

## Build / test commands (repo root; no network needed)
- Smoke test: `node smoke.js` → must print `SMOKE: PASS`.
- Rebuild standalone: inline `src/*.js` into `index.html` → `dogwalker-standalone.html`.
- Rebuild deploy zip: zip the **contents of `dogwalker/`** at the zip root.

## ⚠️ Blocker — Higgsfield MCP approval gate
These tools return `MCP tool call requires approval` and are auto-denied in the
non-interactive agent session: `deploy_game`, `publish_game`, `media_upload`,
`media_confirm`, `remove_background`, `generate_audio`, `get_game_creation_instructions`.
Only `generate_image` + read tools work. It **survived a Higgsfield permissions change and
a connector reconnect**, so it appears to be an elevated-auth / per-tool approval that must
be granted **inside the Claude client** (or by deploying from an interactive/authenticated
context). Bash network egress is also allowlisted (can't side-load asset bytes); git push
works via the harness proxy.

## Remaining work (priority order)
1. **Clear the gate**, then: `get_game_creation_instructions` (conform `logic.js`/zip to
   spec) → generate audio + fill `SOUND_URLS` → `media_upload` zip → `media_confirm` →
   `deploy_game` (title "Dogwalker", thumbnail + favicon above, `source_game`=uploaded url)
   → **save the returned `game_id`** → test play URL → `publish_game`. Re-deploys MUST pass
   the same `game_id` or they create a duplicate game.
2. **Audio** — walk-loop music, escalating tension loop, bark, Karen camera, cash, bag-snag
   SFX; wire into `SOUND_URLS`; re-zip; commit.
3. **Playtest tuning** per user feedback (Karen difficulty, leash pull, timers/par).
4. Optional future: real audio mix, more levels, Notion "Hometown" map generator, leaderboards.

## Alternate path if the gate stays closed
The human owner can upload `dogwalker.zip` to Higgsfield's `deploy_game` directly
(authenticated user bypasses the agent gate), or host `dogwalker-standalone.html` anywhere.

## Verification checklist for the next owner
- `node smoke.js` → `SMOKE: PASS`; open the standalone and finish a level.
- After deploy: open the play URL, confirm a full round + favicon/thumbnail, then publish
  and confirm the marketplace listing.
