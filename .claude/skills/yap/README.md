# Yap skill

Auto-generates "yap"-style short-form talking-head videos (Reels / TikTok /
Shorts) with your AI avatar: it researches a trending topic in your niche,
writes a viral-hook script in a proven format, and renders it through HeyGen.

Based on Duncan Rogoff's walkthrough: https://www.youtube.com/watch?v=6B2V8MqI8Vc

## One-time setup

1. **Make your avatar + voice in HeyGen** (https://app.heygen.com):
   - Avatar → New avatar → upload a photo or clone yourself from a video.
   - Voices → pick a library voice or clone your own (feed it a few minutes of
     clean audio of you talking).
2. **Connect the HeyGen MCP to Claude Code:**
   `https://developers.heygen.com` → MCP tab → copy the URL → in Claude Code:
   `+` → Connectors → Manage connectors → Add custom connector → name it
   "HeyGen", paste the URL, Connect, and set its tools to "always allow".
3. **Configure IDs:** copy `assets/config.example.json` to `assets/config.json`
   and paste in your `avatar_id` (Avatars → ⋯ → Copy avatar look ID) and
   `voice_id` (Voices → Get voice ID). Set your `niche`.
4. **(Optional, recommended)** fill in `assets/brand-context.md` and start
   adding hooks to `assets/hook-swipe-file.md`. This is what makes the output
   sound like *you* instead of generic AI.

## Usage

In Claude Code, just ask:

- `make a yap video` — it researches and picks a trending topic for you.
- `make a yap video about <topic>` — it uses your topic directly, no research.

It will draft the script, let you approve it, render the 9:16 captioned video
at 1.1× speed, return the video URL, and log the run in `logs/runs.md`.

## How it was built (the process in the video)

1. Ran **deep research** on what makes a viral yap video (hooks, format, topic
   selection, virality mechanics) → distilled into `references/yap-research.md`.
2. Built a **single reusable skill** (`SKILL.md`) that chains:
   context → topic research → script → HeyGen render.
3. Wired in the **HeyGen MCP** so Claude can drive the avatar/voice by ID.

## Files

- `SKILL.md` — the skill Claude follows.
- `references/yap-research.md` — what makes a viral yap video.
- `references/script-format.md` — the proven script template.
- `assets/config.example.json` — copy to `config.json` and fill in IDs.
- `assets/brand-context.md` — your ICP, offer, and brand voice.
- `assets/hook-swipe-file.md` — your growing list of proven hooks.
- `logs/runs.md` — append-only render log.
