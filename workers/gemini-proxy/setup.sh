#!/usr/bin/env bash
# One-shot setup for the Gemini proxy.
#
#   bash workers/gemini-proxy/setup.sh
#
# Deploys the Worker, stores the API key as a secret, smoke-tests the result and
# prints the value to paste into the AI_PROXY_URL repository variable.
#
# Run this on your own machine: it needs a browser for the Cloudflare login, and
# the key must never be pasted into a chat transcript.
set -euo pipefail

cd "$(dirname "$0")"

ORIGIN="${ALLOWED_ORIGIN:-https://oddeye2796-cyber.github.io}"

step() { printf '\n\033[1m==> %s\033[0m\n' "$1"; }
fail() { printf '\033[31mERROR: %s\033[0m\n' "$1" >&2; exit 1; }

command -v npx >/dev/null || fail "Node.js is required (npx not found)."

step "1/4  Cloudflare login"
if npx --yes wrangler whoami >/dev/null 2>&1; then
  echo "Already logged in as: $(npx --yes wrangler whoami 2>/dev/null | grep -i 'email' || echo 'unknown')"
else
  echo "A browser window will open for the Cloudflare login."
  npx --yes wrangler login
fi

step "2/4  Deploy the Worker"
DEPLOY_OUTPUT=$(npx --yes wrangler deploy 2>&1 | tee /dev/tty)
WORKER_URL=$(printf '%s' "$DEPLOY_OUTPUT" | grep -oE 'https://[a-z0-9.-]+\.workers\.dev' | head -1)
[ -n "$WORKER_URL" ] || fail "Could not read the Worker URL from the deploy output. Copy it from the lines above."

step "3/4  Store the Gemini API key"
echo "Get one at https://aistudio.google.com/apikey"
echo "The key is read silently and sent straight to Cloudflare — it is not echoed or logged."
npx --yes wrangler secret put GEMINI_API_KEY

step "4/4  Smoke-test"
RESPONSE=$(curl -sS -X POST "$WORKER_URL" \
  -H 'Content-Type: application/json' \
  -H "Origin: $ORIGIN" \
  -d '{"contents":[{"role":"user","parts":[{"text":"Reply with the single word: ready"}]}]}' || true)

if printf '%s' "$RESPONSE" | grep -q '"text"'; then
  printf '\n\033[32mProxy is working.\033[0m\n'
else
  printf '\n\033[31mProxy returned an unexpected response:\033[0m\n%s\n\n' "$RESPONSE"
  echo "  \"Proxy is missing GEMINI_API_KEY\" -> step 3 did not complete"
  echo "  \"Origin not allowed\"              -> set ALLOWED_ORIGINS in wrangler.toml to $ORIGIN and redeploy"
  echo "  \"Upstream returned 400/403\"       -> the key itself was rejected by Gemini"
  exit 1
fi

cat <<SUMMARY

────────────────────────────────────────────────────────────
Paste this into the repository variable:

  $WORKER_URL

  Settings -> Secrets and variables -> Actions -> Variables tab
  -> New repository variable
       Name:  AI_PROXY_URL
       Value: $WORKER_URL

  A "Variable", not a "Secret" — it holds no credential, and the
  workflow reads it as vars.AI_PROXY_URL.

The next push to master will build with it, and the live site
switches from demo mode to the real model.

To try it first without touching the repository: open the site,
click the header cog, and paste the URL under "Proxy URL".
────────────────────────────────────────────────────────────
SUMMARY
