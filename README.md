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
