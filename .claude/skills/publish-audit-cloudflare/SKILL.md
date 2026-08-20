---
name: publish-audit-cloudflare
description: Publish a completed GEO/SEO audit dashboard (or any static HTML report) to Cloudflare Pages and return the public shareable URL. Use when the user asks to host, publish, deploy, "put it on Cloudflare", or "upload the audit to Cloudflare" for a dashboard, report, or static site and get a live link.
---

# Publish Audit to Cloudflare Pages

Deploys a finished audit folder (an `index.html` dashboard plus any sibling assets such as
an `implementation/` guide) to **Cloudflare Pages** and returns the public `*.pages.dev` URL.

Cloudflare Pages is the right product here: it's free static hosting with a global CDN and an
instant public URL — no server, no build step needed for plain HTML.

> **Note on tooling:** the Cloudflare MCP server (D1/KV/R2/Workers management) cannot upload
> static files or run a Pages deploy. This skill uses the **`wrangler` CLI** (run via `npx`),
> which is the supported way to deploy Pages.

## Inputs

- **Audit directory** (the folder to publish). Default: the most recently edited
  `geo-audit/<client>/` folder that contains an `index.html`. Confirm with the user if ambiguous.
- **Project name** (the Cloudflare Pages project / subdomain). Default: a slug derived from the
  folder name, e.g. `geo-audit/yield-bookkeeping` → `yield-bookkeeping-geo-audit`.
  The public URL becomes `https://<project-name>.pages.dev`.

## Prerequisites (one-time)

`wrangler` authenticates with two environment variables. If they are **not** set, STOP and ask
the user to provide them — do not guess or attempt `wrangler login` (it needs an interactive
browser and won't work in this headless environment):

1. **`CLOUDFLARE_API_TOKEN`** — create at Cloudflare dashboard → **My Profile → API Tokens →
   Create Token**. Use the **"Edit Cloudflare Workers"** template, or a custom token with at
   least the **Account → Cloudflare Pages → Edit** permission.
2. **`CLOUDFLARE_ACCOUNT_ID`** — Cloudflare dashboard → **Workers & Pages** (right sidebar shows
   Account ID), or any zone's Overview page.

Check whether they're set with `printenv CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID`.
If the user pastes them, export them inline for the deploy command (do **not** write them to a
file or commit them):

```bash
export CLOUDFLARE_API_TOKEN="<token>"
export CLOUDFLARE_ACCOUNT_ID="<account id>"
```

## Steps

### Option A — Git integration, no CLI (best when the repo is already connected to Cloudflare Pages)

If the repo already auto-deploys to a Pages project (you'll see a `cloudflare-workers-and-pages[bot]`
comment on PRs), you can publish the audit at a clean standalone URL with **no token and no CLI** —
create a second Pages project pointed at the audit subfolder:

1. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git** → pick the repo.
2. Set: **Project name** = `<client>-geo-audit` (becomes the subdomain), **Framework preset** = None,
   **Build command** = *(empty)*, **Build output directory** = the audit folder
   (e.g. `geo-audit/yield-bookkeeping`).
3. Set **Production branch** to the branch that contains the audit (the PR branch now, or `main`
   after merge). **Save and Deploy.**
4. Result: `https://<client>-geo-audit.pages.dev/` (clean root), auto-redeploying on every push.

### Option B — wrangler CLI (any repo / standalone, needs a token + network)

1. **Resolve inputs.** Pick the audit directory and project name (see Inputs). Verify the
   directory exists and contains `index.html`:
   ```bash
   test -f "<audit-dir>/index.html" && echo OK
   ```
   If there's no `index.html`, tell the user which file should be the landing page and stop.

2. **Confirm credentials + connectivity.** Check the env vars are set (see Prerequisites) AND that
   the environment can reach `api.cloudflare.com` and the npm registry. Some sandboxes/CI restrict
   egress — if `curl -s https://api.cloudflare.com/client/v4/` returns "Host not in allowlist", the
   deploy CANNOT run here; tell the user to run the skill locally (or use Option A) instead.

3. **Deploy** by running the bundled script with the audit dir and project name:
   ```bash
   bash .claude/skills/publish-audit-cloudflare/scripts/deploy.sh "<audit-dir>" "<project-name>"
   ```
   The script creates the Pages project if needed (idempotent), deploys the folder, and prints
   the result. It echoes a final line beginning `PUBLIC_URL=` — capture that.

4. **Report the link.** Give the user the public production URL
   (`https://<project-name>.pages.dev`) and the unique per-deploy preview URL that wrangler
   prints. Mention that re-running the skill publishes a new version to the same URL.

5. **(Optional) Custom domain.** If the user wants a branded URL (e.g.
   `audit.theirdomain.com`), tell them: Cloudflare dashboard → Workers & Pages → the project →
   **Custom domains → Set up a domain**. This skill does not configure DNS.

## Notes & guardrails

- **Never commit or echo the API token.** Treat it as a secret; export it only for the deploy.
- The whole audit folder is published, including `implementation/` (guide + robots.txt, schema,
  llms.txt, faq). That's usually fine for a client-shareable audit. If the user wants the
  dashboard ONLY, deploy a directory that contains just `index.html`.
- Pages serves over HTTPS with a global CDN automatically; no extra config needed.
- This deploys a **static** site. There is no server-side processing.
- If the deploy fails with an auth error, the token lacks the **Pages: Edit** permission or the
  account ID is wrong — re-check both.
