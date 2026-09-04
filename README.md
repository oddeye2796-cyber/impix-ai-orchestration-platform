<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# IMPIX AI Orchestration Platform

An AI orchestration platform for industrial automation: real-time monitoring,
AI-driven recommendations and human-in-the-loop control.

View the app in AI Studio: https://ai.studio/apps/f34d3e64-5048-4605-b1f5-365a07525d57

## Languages

The interface, the demo content and the Supervisor AI's answers are available in
**Japanese (primary), English and Korean**.

- Japanese is the default. A visitor whose browser prefers English or Korean gets
  that language instead, and the globe control in the header (or the segmented
  control on the expo landing screen) switches at any time.
- The choice is stored in `localStorage` and restored on the next visit; it also
  drives `<html lang>` and the language the Gemini Supervisor replies in.

See [`tools/README.md`](tools/README.md) for how to add or change copy.

## Appearance

Dark, light, or follow the device — the control sits beside the language switcher
in the header and on the landing screen. The choice persists under `impix-theme`.
Every surface is painted from the CSS custom properties in `src/index.css`, so a
new component follows the theme with no extra work; chart chrome resolves through
`chartPalette()` in `src/theme` because Recharts takes literal colour props.

## AI features and the API key

The public deployment is a static site, so a bundled Gemini key would be readable
by anyone who opened the bundle. The key is resolved in three tiers instead:

1. a build-time `GEMINI_API_KEY` — for self-hosted or local runs;
2. a key the operator pastes into **Settings → AI connection** (kept in this
   browser's `localStorage`, never sent anywhere);
3. neither — the platform runs in **demo mode**.

Demo mode is the normal state on the public deployment, not an error. The
chatbot and the recommendation engine answer from the live plant simulation, in
the active language, so a booth demo works with no network and no credentials.
AI output is marked with a small **Demo** badge.

**For a booth where visitors should reach the real model**, deploy the
[Cloudflare Worker proxy](workers/README.md) and set `AI_PROXY_URL`. The key
stays on the Worker, the page ships no credential, and the visitor configures
nothing. Free tier covers booth traffic.

## Deploying

`.github/workflows/deploy.yml` builds on every push to `master`, publishes to
`gh-pages`, then smoke-tests the live URL. It asserts the page actually
*renders* — a Pages deploy can serve a stale or blank page while every asset
still returns 200 — and compares `<html data-build>` against the deployed commit,
which is the only way to catch Pages serving a cached older build. A daily run
catches a site that broke without a deploy.

The check runs on GitHub's runners because they can reach `*.github.io`; the
agent sandbox that develops this app cannot (nor `pages.dev`, `vercel.app` or
`netlify.app` — the whole public web is off its egress allowlist, so switching
host would not help).

To deploy by hand instead: `GITHUB_PAGES=true npm run build && npx gh-pages -d dist --dotfiles`.

`npm run verify:deploy` checks what Pages is serving without fetching the site —
it reads the published `gh-pages` branch over git (which is reachable even where
the site is not) and asserts the entry bundle is published, the base path is the
project subpath, `.nojekyll` and `404.html` are in place, the build stamp matches
the commit you expect, and no API key leaked into the bundle.

### Wiring up the AI proxy

`.github/workflows/deploy-worker.yml` (**Actions → Deploy AI proxy**) deploys the
Cloudflare Worker from CI, so no local Node or `wrangler` install is needed. It
wants two repository *secrets* — `CLOUDFLARE_API_TOKEN` and `GEMINI_API_KEY` —
and stores the Gemini key on the Worker, never in the bundle. Then set the
repository *variable* `AI_PROXY_URL` (Settings → Secrets and variables → Actions
→ Variables) to the Worker URL it prints and re-run **Deploy and verify**. That
one is a variable rather than a secret because it holds no credential and the
build has to embed it. Full walkthrough: [workers/README.md](workers/README.md).

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server on port 3000 |
| `npm run build` | Production build |
| `npm run lint` | `tsc --noEmit` |
| `npm run i18n` | Re-extract keys, regenerate catalogs, report coverage |
| `npm run i18n:report` | Fail if any key is missing a translation |
