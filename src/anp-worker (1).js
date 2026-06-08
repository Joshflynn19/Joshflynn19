// ANP Marine — Cloudflare Worker API Proxy
// Securely forwards requests to Anthropic API

export default {
  async fetch(request, env) {

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': 'https://www.anpmarine.co.uk',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        }
      });
    }

    // Only allow POST
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // Only allow requests from your domain
    const origin = request.headers.get('Origin') || '';
    if (!origin.includes('anpmarine.co.uk')) {
      return new Response('Forbidden', { status: 403 });
    }

    try {
      const body = await request.json();

      // Forward to Anthropic
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': 'https://www.anpmarine.co.uk',
        }
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: 'Worker error: ' + err.message }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': 'https://www.anpmarine.co.uk',
        }
      });
    }
  }
};
