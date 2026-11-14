import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

// Run the real server action with mocked request headers and Turnstile verification.
function load({ allowed, requestHeaders = {} }) {
  const calls = [];
  const dependencies = {
    'next/headers': { headers: async () => new Headers(requestHeaders) },
    '@/core/security/turnstile': { verifyTurnstile: async (...args) => { calls.push(args); return allowed; } },
  };
  const source = readFileSync(new URL('../src/features/auth/auth-actions.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  runInNewContext(compiled, { exports, require: (id) => {
    assert.ok(dependencies[id], `Unexpected dependency: ${id}`);
    return dependencies[id];
  } });
  return { confirmHuman: exports.confirmHuman, calls };
}

test('confirmHuman passes the token and Cloudflare client IP to verification', async () => {
  const { confirmHuman, calls } = load({ allowed: true, requestHeaders: { 'cf-connecting-ip': '203.0.113.7', 'x-forwarded-for': '198.51.100.1' } });
  assert.equal((await confirmHuman('tok')).error, null);
  assert.deepEqual(calls.map((c) => [...c]), [['tok', '203.0.113.7']]);
});

test('confirmHuman falls back to the first forwarded IP', async () => {
  const { confirmHuman, calls } = load({ allowed: true, requestHeaders: { 'x-forwarded-for': '198.51.100.1, 10.0.0.2' } });
  await confirmHuman('tok');
  assert.deepEqual(calls.map((c) => [...c]), [['tok', '198.51.100.1']]);
});

test('confirmHuman returns the Vietnamese bot error when verification fails', async () => {
  const { confirmHuman } = load({ allowed: false });
  assert.equal((await confirmHuman('bad')).error, 'Xác minh chống bot không thành công. Vui lòng thử lại.');
});

test('confirmHuman treats a non-string token as empty', async () => {
  const { confirmHuman, calls } = load({ allowed: false });
  await confirmHuman(undefined);
  assert.equal(calls[0][0], '');
});

test('auth forms keep calling Supabase from the browser and gate with Turnstile', () => {
  for (const file of ['login/login-form.tsx', 'register/register-form.tsx', 'forgot-password/forgot-password-form.tsx', 'verify-email/verify-email-form.tsx']) {
    const source = readFileSync(new URL(`../src/app/${file}`, import.meta.url), 'utf8');
    assert.match(source, /"@\/core\/supabase\/client"/, file);
    assert.match(source, /useTurnstileGate\(siteKey\)/, file);
    assert.match(source, /await gate\.check\(\)/, file);
    assert.match(source, /\{gate\.widget\}/, file);
  }
});
