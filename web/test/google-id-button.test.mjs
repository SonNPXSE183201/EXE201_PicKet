import assert from 'node:assert/strict';
import { webcrypto, createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { googleWebClientId } from '../src/core/auth/google.ts';

// Exercise the real component effects and GIS callbacks without contacting Google.
function load({ scriptFails = false, authError = null } = {}) {
  const effects = [];
  const calls = { scripts: [], initialize: [], render: [], tokens: [], success: 0, error: 0, unavailable: 0 };
  const target = { getBoundingClientRect: () => ({ width: 480 }), replaceChildren() {} };
  const identity = {
    initialize: (config) => calls.initialize.push(config),
    renderButton: (_target, options) => calls.render.push(options),
  };
  const window = { setTimeout, clearTimeout };
  const document = {
    createElement: () => ({}),
    head: { appendChild: (script) => {
      calls.scripts.push(script);
      queueMicrotask(() => {
        if (scriptFails) script.onerror();
        else { window.google = { accounts: { id: identity } }; script.onload(); }
      });
    } },
  };
  const dependencies = {
    react: { useEffect: (effect) => effects.push(effect), useRef: (value) => ({ current: value === null ? target : value }) },
    'react/jsx-runtime': { jsx: () => null },
    '@/core/supabase/client': { createClient: () => ({ auth: { signInWithIdToken: async (input) => {
      calls.tokens.push(input);
      return { error: authError };
    } } }) },
  };
  const compiled = ts.transpileModule(readFileSync(new URL('../src/features/auth/components/google-id-button.tsx', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  runInNewContext(compiled, { exports, window, document, crypto: webcrypto, TextEncoder, btoa,
    require: (id) => { assert.ok(dependencies[id], id); return dependencies[id]; } });
  const mount = () => {
    effects.length = 0;
    exports.GoogleIdButton({ googleClientId: 'web-client', onSuccess: () => calls.success++,
      onError: () => calls.error++, onUnavailable: () => calls.unavailable++ });
    return effects.map((effect) => effect()).filter(Boolean);
  };
  return { calls, mount };
}

async function initialized(calls) {
  for (let i = 0; i < 100 && !calls.initialize.length && !calls.unavailable; i++) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

test('GIS hashes a fresh nonce and Supabase receives its raw value; script loads once', async () => {
  const { calls, mount } = load();
  const cleanup = mount();
  await initialized(calls);
  assert.equal(calls.scripts[0].src, 'https://accounts.google.com/gsi/client');
  const config = calls.initialize[0];
  assert.equal(config.client_id, 'web-client');
  assert.equal(config.ux_mode, 'popup');
  assert.equal(config.use_fedcm_for_button, true);
  assert.equal(config.itp_support, true);
  assert.deepEqual({ ...calls.render[0] }, { theme: 'outline', shape: 'pill', size: 'large', text: 'continue_with', locale: 'vi', width: 400 });
  await config.callback({ credential: 'google-token' });
  const token = calls.tokens[0];
  assert.equal(token.provider, 'google');
  assert.equal(token.token, 'google-token');
  assert.match(token.nonce, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(config.nonce, createHash('sha256').update(token.nonce).digest('hex'));
  assert.equal(calls.success, 1);
  cleanup.forEach((fn) => fn());
  await config.callback({ credential: 'stale-token' });
  assert.equal(calls.tokens.length, 1);
  mount();
  for (let i = 0; i < 100 && calls.initialize.length < 2; i++) await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(calls.scripts.length, 1);
  assert.notEqual(calls.initialize[1].nonce, config.nonce);
});

test('script failure exposes the parent OAuth fallback', async () => {
  const { calls, mount } = load({ scriptFails: true });
  mount();
  await initialized(calls);
  assert.equal(calls.unavailable, 1);
  assert.equal(calls.initialize.length, 0);
  assert.equal(calls.tokens.length, 0);
});

test('ID token rejection shows the parent Google error without succeeding', async () => {
  const { calls, mount } = load({ authError: new Error('rejected') });
  mount();
  await initialized(calls);
  await calls.initialize[0].callback({ credential: 'invalid' });
  assert.equal(calls.error, 1);
  assert.equal(calls.success, 0);
});

test('Google client ID reads runtime env and trims empty values', () => {
  const previous = process.env.GOOGLE_WEB_CLIENT_ID;
  try {
    delete process.env.GOOGLE_WEB_CLIENT_ID;
    assert.equal(googleWebClientId(), undefined);
    process.env.GOOGLE_WEB_CLIENT_ID = '  web-client  ';
    assert.equal(googleWebClientId(), 'web-client');
    process.env.GOOGLE_WEB_CLIENT_ID = '  ';
    assert.equal(googleWebClientId(), undefined);
  } finally {
    if (previous === undefined) delete process.env.GOOGLE_WEB_CLIENT_ID;
    else process.env.GOOGLE_WEB_CLIENT_ID = previous;
  }
});
