// ANP Marine — Cloudflare Worker API proxy for ICE / CIRA
// Deploy this as its OWN Worker (do NOT put it in the Pages /src folder,
// or the source becomes publicly downloadable at your domain).
//
// One-time setup:
//   npx wrangler deploy
//   npx wrangler secret put ANTHROPIC_API_KEY      (paste your key when prompted)
//
// Then set ICE_API_URL in ice.html to this Worker's URL.

const ALLOWED = [
  'https://www.anpmarine.co.uk',
  'https://anpmarine.co.uk',   // apex too, so it works with or without www
];

function cors(origin) {
  const allow = ALLOWED.includes(origin) ? origin : ALLOWED[0];
  return { 'Access-Control-Allow-Origin': allow, 'Vary': 'Origin' };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          ...cors(origin),
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: cors(origin) });
    }
    if (!ALLOWED.includes(origin)) {
      return new Response('Forbidden', { status: 403, headers: cors(origin) });
    }

    try {
      const body = await request.json();
      const upstream = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
      });
      const data = await upstream.text(); // pass through Anthropic's JSON (and errors) verbatim
      return new Response(data, {
        status: upstream.status,
        headers: { 'Content-Type': 'application/json', ...cors(origin) },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Worker error: ' + err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...cors(origin) },
      });
    }
  },
};
