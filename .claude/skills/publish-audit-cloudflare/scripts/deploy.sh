#!/usr/bin/env bash
# Deploy a static audit folder to Cloudflare Pages and print the public URL.
#
# Usage:
#   deploy.sh <audit_dir> [project_name]
#
# Requires env: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID
# Requires: node + npx on PATH (wrangler is fetched via npx; no global install needed).
#
# On success the LAST line of output is:  PUBLIC_URL=https://<project>.pages.dev
set -euo pipefail

SRC_DIR="${1:?Usage: deploy.sh <audit_dir> [project_name]}"

# Derive a default project name from the folder path, e.g.
#   geo-audit/yield-bookkeeping  ->  yield-bookkeeping-geo-audit
default_name() {
  local base parent
  base="$(basename "$SRC_DIR")"
  parent="$(basename "$(dirname "$SRC_DIR")")"
  if [ "$parent" != "." ] && [ "$parent" != "/" ] && [ -n "$parent" ]; then
    echo "${base}-${parent}"
  else
    echo "$base"
  fi
}
RAW_NAME="${2:-$(default_name)}"
# Cloudflare project names: lowercase, alphanumeric + hyphens, <=58 chars.
PROJECT="$(echo "$RAW_NAME" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//' | cut -c1-58)"

# --- preflight ---
: "${CLOUDFLARE_API_TOKEN:?Set CLOUDFLARE_API_TOKEN (Pages: Edit permission) before deploying}"
: "${CLOUDFLARE_ACCOUNT_ID:?Set CLOUDFLARE_ACCOUNT_ID before deploying}"

if [ ! -d "$SRC_DIR" ]; then
  echo "ERROR: directory not found: $SRC_DIR" >&2; exit 1
fi
if [ ! -f "$SRC_DIR/index.html" ]; then
  echo "ERROR: no index.html in $SRC_DIR — Pages needs a landing page named index.html" >&2
  exit 1
fi

WRANGLER="npx --yes wrangler@4"

echo ">> Project : $PROJECT"
echo ">> Source  : $SRC_DIR"
echo ">> Account : ${CLOUDFLARE_ACCOUNT_ID:0:6}… (hidden)"

# --- ensure the Pages project exists (idempotent: ignore 'already exists') ---
echo ">> Ensuring Pages project exists…"
$WRANGLER pages project create "$PROJECT" --production-branch main >/tmp/cf_create.log 2>&1 || {
  if grep -qiE "already exists|already been taken|conflict" /tmp/cf_create.log; then
    echo "   project already exists — reusing it."
  else
    echo "   (project create note — continuing) :"; sed 's/^/   /' /tmp/cf_create.log
  fi
}

# --- deploy ---
echo ">> Deploying…"
DEPLOY_LOG="$(mktemp)"
set +e
$WRANGLER pages deploy "$SRC_DIR" \
  --project-name "$PROJECT" \
  --branch main \
  --commit-dirty=true 2>&1 | tee "$DEPLOY_LOG"
STATUS=${PIPESTATUS[0]}
set -e
if [ "$STATUS" -ne 0 ]; then
  echo "ERROR: wrangler deploy failed (exit $STATUS). Check the token's Pages:Edit permission and the account ID." >&2
  exit "$STATUS"
fi

# --- extract the deployed URL from wrangler output ---
DEPLOY_URL="$(grep -oE 'https://[a-z0-9.-]+\.pages\.dev' "$DEPLOY_LOG" | head -n1 || true)"
PROD_URL="https://${PROJECT}.pages.dev"
rm -f "$DEPLOY_LOG"

echo ""
echo "================ DEPLOYED ================"
echo "Production URL : $PROD_URL"
[ -n "$DEPLOY_URL" ] && echo "This deploy    : $DEPLOY_URL"
echo "========================================="
# Machine-readable final line for the caller to capture:
echo "PUBLIC_URL=$PROD_URL"
