import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
test('primary navigation excludes account utilities and prefetches routes', () => {
  const shell = read('src/core/ui/workspace-shell.tsx');
  const primary = shell.split('const userLinks = [')[1].split('] as const')[0];
  assert.doesNotMatch(primary, /\/profile|\/data|\/notifications|\/billing/);
  assert.match(shell, /prefetch=\{true\}/);
  assert.doesNotMatch(shell, /Không gian cá nhân/);
  assert.match(shell, /Mở menu tài khoản/);
  assert.match(shell, /name="bell"/);
});
test('login uses a compact variant and short introductory copy', () => {
  const login = read('src/app/login/login-form.tsx');
  assert.match(login, /auth-card auth-card-compact/);
  assert.doesNotMatch(login, /Tài khoản\s+quản trị sẽ vào/);
});
test('metadata explicitly uses Picket tab and home-screen icons', () => {
  assert.match(read('src/app/layout.tsx'), /icons:[\s\S]*picket-logo.png/);
  const ico = readFileSync(new URL('../src/app/favicon.ico', import.meta.url));
  assert.equal(ico.readUInt16LE(2), 1);
  assert.equal(ico.readUInt16LE(4), 1);
  assert.equal(ico[6], 64);
  assert.equal(ico.readUInt32LE(18), 22);
  assert.equal(ico.subarray(22, 30).toString('hex'), '89504e470d0a1a0a');
});
test('receipt capture has distinct image and review steps', () => {
  assert.match(read('src/app/(finance)/capture/capture-form.tsx'), /capture-workflow/);
  assert.match(read('src/app/(finance)/capture/capture-form.tsx'), /capture-empty/);
});
