# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repository is

This is **Arperture Media's** delivery repo. It is not a conventional software project — there is
no build system, package manifest, or test suite. It holds two kinds of things:

1. **Client GEO audit deliverables** under `geo-audit/<client-slug>/` and `geo-foundation/` — each a
   single, self-contained static HTML page (the client-facing dashboard/report).
2. **The Arperture marketing site source**, archived in `Website.zip` (a React/JSX + CSS landing
   page: `app.jsx`, `hero.jsx`, `sections.jsx`, `contact.jsx`, `atoms.jsx`, `tweaks-panel.jsx`).
   It ships as a zip, not a live build.

"GEO" = **Generative Engine Optimization**: how well a business is discovered, trusted, and cited
by AI answer engines (ChatGPT/OpenAI search, Perplexity, Google AI Overviews, Gemini). A GEO audit
measures that and prescribes fixes — it is not classic SEO.

## Deployment (important — this is automatic)

The repo is Git-connected to a **Cloudflare Pages** project named `arperture`
(account `26b01b52a939a66a02db7391fe77ad26`). **Every push auto-deploys the whole repo as static
files**; a `cloudflare-workers-and-pages[bot]` comment reports each build on the PR.

- There is **no root `index.html`**, so Pages serves deliverables at **deep paths**, e.g.
  `https://arperture.pages.dev/geo-audit/<client>/` (production/`main`) or
  `https://<branch-slug>.arperture.pages.dev/geo-audit/<client>/` (branch previews).
- To give one audit a **clean root URL** (`<client>-geo-audit.pages.dev`), either create a second
  Pages project in the dashboard pointed at that subfolder as its **build output directory**, or use
  the `publish-audit-cloudflare` skill. See that skill for both paths.

## The `publish-audit-cloudflare` skill

`.claude/skills/publish-audit-cloudflare/` deploys any audit folder (a dir containing `index.html`)
to its own Cloudflare Pages project via `wrangler` and returns the public URL.

- Run: `bash .claude/skills/publish-audit-cloudflare/scripts/deploy.sh <audit-dir> [project-name]`
- Requires env `CLOUDFLARE_API_TOKEN` (Pages: Edit) and `CLOUDFLARE_ACCOUNT_ID`.
- Note: restricted sandboxes may not reach `api.cloudflare.com` (egress allowlist) — the script
  and SKILL.md document falling back to the dashboard Git-integration path.

## Deliverable conventions

- `geo-audit/<client-slug>/index.html` — the report/dashboard. **Fully self-contained**: inline CSS
  and JS only, **no external/CDN assets, no fonts, no network calls**, so it renders offline and can
  be sent as a single file. Theme/color tokens live in a `:root { --… }` block at the top.
- `geo-audit/<client-slug>/implementation/` (optional) — copy-paste remediation kit for the client's
  own site: `robots.txt` (allow AI crawlers), `schema-jsonld.html` (Schema.org JSON-LD),
  `llms.txt`, `faq-content.md`, and `IMPLEMENTATION-GUIDE.html` (an openable, step-by-step guide).
- Some reports carry a **client-side password gate** (a `#pw-gate` overlay + inline JS). This is
  presentation-only, **not real access control** — anyone can read the source. Don't treat it as
  security or store anything sensitive behind it.
- Report structure is consistent across clients: a headline **score /100** with a tier badge
  (e.g. "Emerging"), category sub-scores, a **prompt/query test matrix** (which AI queries the brand
  wins vs. loses, and to which competitors), and a **prioritized fix list** (P1/P2/P3).

## Working commands

There is no compiler or test runner. The useful checks:

```bash
# Sanity-check a self-contained HTML file (tag balance) before committing/deploying:
python3 - <<'PY'
import re; s=open('geo-audit/<client>/index.html').read()
for t in ['div','table','svg','tr','li','section']:
    o=len(re.findall(r'<%s[ >]'%t,s)); c=len(re.findall(r'</%s>'%t,s))
    print(f"{t:8}{o}/{c} {'OK' if o==c else 'MISMATCH'}")
PY

# wrangler is not installed; invoke via npx (node/npm are available):
npx --yes wrangler@4 --version
```

Verify a report by **opening the HTML in a browser** (or sending it as a file) — it must render with
no network. The live target sites being audited typically return **HTTP 403 to non-browser fetchers**
(WAF/bot filtering), so research the audited business via `WebSearch` rather than fetching its site,
using both **branded/local** prompts (where clients usually win) and **non-branded/commercial**
prompts (where they usually lose to competitors) to gauge share of voice.

## Commit / PR notes

- Deliverable commits follow a deploy-oriented style, e.g. `Deploy: <Client> GEO Baseline Report`.
- Development happens on a feature branch; open PRs as **drafts**. Because pushes trigger live
  Cloudflare deploys, treat every push to the branch as publishing a preview.
