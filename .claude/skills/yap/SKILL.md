---
name: yap
description: >-
  Generate a "yap"-style short-form talking-head video (Instagram Reels / TikTok
  / YouTube Shorts) end to end. Researches a trending topic in the user's niche
  (or uses a topic the user names), writes a viral-hook script in the proven yap
  format, then renders it as an AI avatar video via the HeyGen MCP using the
  configured avatar and voice. Use when the user asks to "make a yap video",
  "make a reel", "make a short", or "create a talking-head video about X".
---

# Yap video generator

Turn a topic (or "find me one") into a finished vertical talking-head video.
This skill chains four stages: **context → research → script → render**.

## Before you start: preflight

1. **Read the config.** Open `assets/config.json` (copy it from
   `assets/config.example.json` if it doesn't exist yet). You need a HeyGen
   `avatar_id` and `voice_id`. If either is missing, STOP and ask the user for
   them, telling them where to get each:
   - Avatar ID: HeyGen → Avatars → your avatar look → "⋯" → **Copy avatar look ID**.
   - Voice ID: HeyGen → Voices → pick/clone a voice → **Get voice ID**.
2. **Confirm the HeyGen MCP is connected.** This skill renders through the
   HeyGen MCP server (tools are namespaced `mcp__*heygen*__*` or similar).
   If no HeyGen tools are available, tell the user to add the connector from
   `https://developers.heygen.com` → MCP tab → copy the URL → Claude Code →
   `+` → Connectors → Add custom connector → paste → Connect. Then stop.
3. **Read the brand context** at `assets/brand-context.md` if it exists. It
   carries the user's ICP (ideal customer), offer, and brand voice. It's
   optional — if absent, infer a reasonable voice and note that you did.
4. **Read the hook swipe file** at `assets/hook-swipe-file.md` if it exists.
   Prefer adapting a proven hook pattern from it over inventing one.

## Stage 1 — Pick the topic

- **If the user named a specific topic** (e.g. "make a video about Anthropic
  shipping X"), use it directly. Do NOT research — go straight to Stage 3.
- **Otherwise, research** (Stage 2) to find one.

## Stage 2 — Research the topic (only when no topic was given)

Scrape the web across the user's niche to find what people are talking about
right now. Use `WebSearch`/`WebFetch`. Score candidate topics on three axes and
pick the single best one:

- **DM-shareability** — would someone send this to a friend / save it?
- **Contrarian angle** — does it cut against the obvious take?
- **ICP pain** — does it hit a real pain the user's audience feels?

Output a one-line justification for the chosen topic before drafting.

## Stage 3 — Draft the script

Apply the verified yap format in `references/script-format.md`. Hard rules:

- Open with a **scroll-stopping hook** in the first line (≤ 3 seconds of speech).
  Adapt a pattern from the hook swipe file when possible.
- Keep it **tight: ~110–160 words** (~30–45s spoken at 1.1× speed). Yap videos
  win on density, not length.
- One idea. Build: **hook → tension/reframe → payoff → one-line button.**
- Write in the user's brand voice (Stage 0 context). Spoken cadence, short
  sentences, no corporate filler, no stage directions or emojis in the script
  body — HeyGen speaks every character literally.

Show the script to the user. The render is the expensive step, so unless the
user said "just ship it," confirm the script before Stage 4.

## Stage 4 — Render via HeyGen

Call the HeyGen MCP video-generation tool with these settings (map to whatever
the connected tool's parameter names are):

- **character:** avatar, `avatar_id` from config.
- **voice:** the script text, `voice_id` from config, **speed `1.1`**.
- **dimension:** vertical 9:16 — `720 × 1280` (or `1080 × 1920` if offered).
- **captions / subtitles:** **on** (burn in).

If the tool is async, poll for completion. When done:

1. Return the **video URL** to the user.
2. Append a row to `logs/runs.md` (create it if missing) with: date, topic,
   hook line, word count, avatar_id, voice_id, and the video URL.

## Notes

- This skill renders; it does not create the avatar/voice. Those are made once
  in HeyGen (record/upload a look, clone or pick a voice) and referenced by ID.
- Keep `assets/config.json` out of version control if the IDs are sensitive
  (see `.gitignore` guidance in `assets/config.example.json`).
