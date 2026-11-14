import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCsp } from '../src/core/security/csp.ts';

test('production CSP normalizes origins and restricts active content', () => {
  const csp = buildCsp({ apiUrl: 'https://api.example.com/v1', supabaseUrl: 'https://project.supabase.co/auth/v1', dev: false });
  assert.equal(csp, "default-src 'self'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://accounts.google.com; style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https://api.example.com https://project.supabase.co wss://project.supabase.co https://accounts.google.com; frame-src https://challenges.cloudflare.com https://accounts.google.com; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests");
  assert.ok(!csp.includes('unsafe-eval'));
});

test('development permits HMR without upgrading local HTTP', () => {
  const csp = buildCsp({ apiUrl: 'http://localhost:8080/path', dev: true });
  assert.ok(csp.includes("'unsafe-eval'"));
  assert.ok(csp.includes("connect-src 'self' http://localhost:8080 ws:"));
  assert.ok(!csp.includes('upgrade-insecure-requests'));
});

test('missing or invalid envs never produce undefined or unsafe origins', () => {
  for (const options of [{}, { apiUrl: 'invalid', supabaseUrl: 'javascript:alert(1)' }]) {
    const csp = buildCsp({ ...options, dev: false });
    assert.ok(csp.includes("connect-src 'self' https://accounts.google.com;"));
    assert.ok(!/undefined|null|javascript:/.test(csp));
  }
});
