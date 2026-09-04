# Gemini proxy (Cloudflare Worker)

The platform is a static site, so a Gemini key shipped in the bundle would be
readable by any visitor. This Worker keeps the key server-side: the browser
posts a prompt, the Worker attaches the key and forwards it to Gemini.

With the proxy configured, booth visitors get real model output with **nothing
to configure and no credential in the page**. Without it the platform still
works — it falls back to a locally supplied key, then to demo mode.

## Cost

Cloudflare Workers' free plan allows 100,000 requests/day. A booth demo is
nowhere near that, so this stays free. The Gemini API has its own free tier;
check your quota separately.

## Deploy

Two ways in, both free. Neither needs a Gemini key in a chat window, a shell
history or a commit — it goes straight into Cloudflare as a Worker secret.

### From GitHub Actions (nothing to install)

1. Get the two credentials:
   - **Cloudflare API token** — dash.cloudflare.com → My Profile → API Tokens →
     Create Token → *Edit Cloudflare Workers* template.
   - **Gemini API key** — <https://aistudio.google.com/apikey>.
2. Add both as repository **secrets** (Settings → Secrets and variables →
   Actions → New repository secret), named exactly `CLOUDFLARE_API_TOKEN` and
   `GEMINI_API_KEY`.
3. Actions tab → **Deploy AI proxy** → *Run workflow*. It deploys the Worker and
   stores the key as a Worker secret.
4. Copy the `https://impix-gemini-proxy.<subdomain>.workers.dev` URL from the
   run's summary into the repository **variable** `AI_PROXY_URL` (same settings
   page, Variables tab — a variable, not a secret: it holds no credential and
   the build has to embed it).
5. Actions tab → **Deploy and verify** → *Run workflow* to rebuild the site with
   the proxy wired in.

### From your own machine

```bash
bash workers/gemini-proxy/setup.sh
```

Logs in, deploys, stores the key, smoke-tests the result, and prints the exact
value to paste into the `AI_PROXY_URL` repository variable.

It needs a browser for the Cloudflare login. The API key should never be pasted
into a chat transcript — the script reads it silently and hands it straight to
Cloudflare.

<details>
<summary>Manual equivalent</summary>

```bash
cd workers/gemini-proxy

# 1. Restrict who may call it, so the key cannot be borrowed by another site.
#    Edit ALLOWED_ORIGINS in wrangler.toml to your deployed front end.
npx wrangler deploy

# 2. Store the key as a secret (never a var — vars are readable in the dashboard)
npx wrangler secret put GEMINI_API_KEY
```

`wrangler deploy` prints the URL, e.g.
`https://impix-gemini-proxy.<account>.workers.dev`.
</details>

## Point the front end at it

Either bake it into the build (recommended for the deployed site):

```bash
echo 'AI_PROXY_URL="https://impix-gemini-proxy.<account>.workers.dev"' >> .env.local
npm run build
```

…or paste it at runtime under **Settings → AI connection → Proxy URL**, which is
handy for trying it out without a rebuild. The value is stored in that browser
only.

## Contract

`POST` with JSON:

```jsonc
{
  "model": "gemini-3-flash-preview",   // optional
  "contents": [{ "role": "user", "parts": [{ "text": "..." }] }],
  "systemInstruction": "...",          // optional
  "responseMimeType": "application/json" // optional
}
```

Replies `{ "text": "..." }`, or `{ "error": "..." }` with the upstream status so
the client can distinguish a bad key (401/403) from a rate limit (429). The
upstream body is never forwarded — it can echo the key.

## Checking it works

```bash
curl -X POST https://impix-gemini-proxy.<account>.workers.dev \
  -H 'Content-Type: application/json' \
  -H 'Origin: https://<owner>.github.io' \
  -d '{"contents":[{"role":"user","parts":[{"text":"ping"}]}]}'
```

A `403 Origin not allowed` means `ALLOWED_ORIGINS` does not list the origin you
sent — that is the guard doing its job.
