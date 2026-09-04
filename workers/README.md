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

```bash
cd workers/gemini-proxy

# 1. Restrict who may call it, so the key cannot be borrowed by another site.
#    Edit ALLOWED_ORIGINS in wrangler.toml to your deployed front end, e.g.
#    https://<owner>.github.io
npx wrangler deploy

# 2. Store the key as a secret (never a var — vars are readable in the dashboard)
npx wrangler secret put GEMINI_API_KEY
```

`wrangler deploy` prints the URL, e.g.
`https://impix-gemini-proxy.<account>.workers.dev`.

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
