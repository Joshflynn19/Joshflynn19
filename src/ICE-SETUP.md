# Why ICE wasn't responding — and how to make it live

## The bug
`ice.html` was calling the Anthropic API **directly from the browser**:

```js
fetch('https://api.anthropic.com/v1/messages', {
  headers: { 'Content-Type': 'application/json' },   // no x-api-key, no anthropic-version
  ...
})
```

That can never work from a web page:
1. **CORS** — Anthropic doesn't allow direct browser calls, so the request is blocked before it's sent.
2. **No auth** — there's no `x-api-key` / `anthropic-version`. You can't add a key in client-side JS without exposing it to the world anyway.

The request errored, the `catch` block ran, and you got silence / the "connection issue" line.

## The fix (already applied to ice.html)
ICE now posts to your Worker proxy instead, via a constant at the top of the script:

```js
const ICE_API_URL = 'https://anp-proxy.josh-e5f.workers.dev';
```

The Worker holds the API key as a secret and adds the auth headers, then forwards to Anthropic. The browser only ever talks to your own domain's Worker — no key exposure, no CORS problem.

## To make it respond live, confirm all three:
1. **The Worker is deployed.** Use `worker/anp-proxy-worker.js` in this bundle (an improved version of your `anp-worker (1).js`).
2. **The secret is set:** `npx wrangler secret put ANTHROPIC_API_KEY`. If this is missing, the Worker returns 401/500 and ICE shows the connection-issue line.
3. **`ICE_API_URL` matches the Worker's real URL.** I used `anp-proxy.josh-e5f.workers.dev` from our earlier notes — verify that's still the deployed URL and update the constant if not.

Quick test: open the live site, open DevTools → Network, send a message. You want a POST to your Worker returning **200**. A 401/500 = key/secret problem; a 403 = origin not allowed; a failed/blocked request = wrong URL or Worker not deployed.

## Two related things I fixed / flagged
- **CORS was www-only.** Your original worker hard-coded `Access-Control-Allow-Origin: https://www.anpmarine.co.uk`. If anyone hits the site at the apex (`anpmarine.co.uk`, no www) ICE would silently fail CORS. The improved worker allows both apex and www.
- **Worker source is publicly exposed.** `worker.js` and `anp-worker (1).js` currently sit in `src/` (the deployed folder), so they're downloadable at `anpmarine.co.uk/worker.js` etc. No secret keys are *in* the files, but workers shouldn't be served as site assets — remove them from `src/`. (`worker.js` is your unrelated newsletter worker.)

## Optional
- Model is `claude-sonnet-4-20250514` (valid). Change that one string if you want a different Sonnet.
