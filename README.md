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
chatbot and the recommendation engine answer from the live mock telemetry, in the
active language, so a booth demo works with no network and no credentials. AI
output is marked with a small **Demo** badge, and a real key switches every
surface to the live model with no further configuration.

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
