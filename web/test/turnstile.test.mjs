import assert from 'node:assert/strict';
import test from 'node:test';
import { verifyTurnstile } from '../src/core/security/turnstile.ts';

test('Turnstile verification is optional only when either runtime key is absent', async (t) => {
  const site = process.env.TURNSTILE_SITE_KEY;
  const secret = process.env.TURNSTILE_SECRET_KEY;
  const originalFetch = globalThis.fetch;
  t.after(() => {
    if (site === undefined) delete process.env.TURNSTILE_SITE_KEY; else process.env.TURNSTILE_SITE_KEY = site;
    if (secret === undefined) delete process.env.TURNSTILE_SECRET_KEY; else process.env.TURNSTILE_SECRET_KEY = secret;
    globalThis.fetch = originalFetch;
  });
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw new Error('unexpected fetch'); };
  for (const [siteKey, secretKey] of [['', ''], ['site', ''], ['', 'secret']]) {
    process.env.TURNSTILE_SITE_KEY = siteKey;
    process.env.TURNSTILE_SECRET_KEY = secretKey;
    assert.equal(await verifyTurnstile('', undefined), true);
  }
  assert.equal(calls, 0);
  process.env.TURNSTILE_SITE_KEY = 'site';
  process.env.TURNSTILE_SECRET_KEY = 'secret';
  t.mock.method(AbortSignal, 'timeout', (milliseconds) => {
    assert.equal(milliseconds, 5000);
    return new AbortController().signal;
  });
  assert.equal(await verifyTurnstile('', undefined), false);
  assert.equal(calls, 0);
  globalThis.fetch = async (url, init) => {
    assert.equal(url, 'https://challenges.cloudflare.com/turnstile/v0/siteverify');
    assert.equal(init.method, 'POST');
    assert.equal(init.headers['Content-Type'], 'application/x-www-form-urlencoded');
    assert.equal(init.body.get('secret'), 'secret');
    assert.equal(init.body.get('response'), 'token');
    assert.equal(init.body.get('remoteip'), '203.0.113.1');
    assert.ok(init.signal instanceof AbortSignal);
    assert.equal(init.cache, 'no-store');
    return new Response(JSON.stringify({ success: true }));
  };
  assert.equal(await verifyTurnstile('token', '203.0.113.1'), true);
  for (const body of [{ success: false }, {}, { success: 'true' }]) {
    globalThis.fetch = async () => new Response(JSON.stringify(body));
    assert.equal(await verifyTurnstile('token'), false);
  }
  globalThis.fetch = async () => new Response('{', { status: 500 });
  assert.equal(await verifyTurnstile('token'), false);
  globalThis.fetch = async () => new Response('{');
  assert.equal(await verifyTurnstile('token'), false);
  globalThis.fetch = async (_url, init) => {
    assert.equal(init.body.has('remoteip'), false);
    return new Response(JSON.stringify({ success: true }));
  };
  assert.equal(await verifyTurnstile('token'), true);
  globalThis.fetch = async () => { throw new Error('network failure'); };
  assert.equal(await verifyTurnstile('token'), false);
});
