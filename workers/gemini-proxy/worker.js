/**
 * Gemini proxy for the IMPIX AI orchestration platform.
 *
 * The platform is a static site, so a key shipped in the bundle would be
 * readable by any visitor. This Worker keeps the key server-side: the browser
 * posts a prompt, the Worker attaches the key and forwards it to Gemini.
 *
 * Deploy:
 *   npx wrangler deploy
 *   npx wrangler secret put GEMINI_API_KEY
 *
 * Then point the front end at the Worker's URL (see workers/README.md).
 */

const GEMINI = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-3-flash-preview';

/** Only these origins may call the proxy, so the key cannot be borrowed. */
const parseOrigins = env =>
  (env.ALLOWED_ORIGINS ?? '').split(',').map(o => o.trim()).filter(Boolean);

function corsHeaders(origin, allowed) {
  const ok = allowed.length === 0 || allowed.includes(origin);
  return {
    'Access-Control-Allow-Origin': ok ? origin || '*' : 'null',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

const json = (body, status, headers) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') ?? '';
    const allowed = parseOrigins(env);
    const cors = corsHeaders(origin, allowed);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, cors);
    if (allowed.length && !allowed.includes(origin)) return json({ error: 'Origin not allowed' }, 403, cors);
    if (!env.GEMINI_API_KEY) return json({ error: 'Proxy is missing GEMINI_API_KEY' }, 500, cors);

    let payload;
    try {
      payload = await request.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, 400, cors);
    }

    const { contents, systemInstruction, responseMimeType, model = DEFAULT_MODEL } = payload ?? {};
    if (!Array.isArray(contents) || contents.length === 0) {
      return json({ error: 'contents[] is required' }, 400, cors);
    }

    const body = { contents };
    if (systemInstruction) body.systemInstruction = { parts: [{ text: systemInstruction }] };
    if (responseMimeType) body.generationConfig = { responseMimeType };

    const upstream = await fetch(
      `${GEMINI}/${encodeURIComponent(model)}:generateContent?key=${env.GEMINI_API_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
    );

    if (!upstream.ok) {
      // Pass the status through so the client can tell a bad key from a rate
      // limit, but never leak the upstream body — it can echo the key.
      return json({ error: `Upstream returned ${upstream.status}` }, upstream.status, cors);
    }

    const data = await upstream.json();
    const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text ?? '').join('') ?? '';
    return json({ text }, 200, cors);
  },
};
