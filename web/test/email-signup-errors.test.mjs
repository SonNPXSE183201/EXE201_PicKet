import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {emailSignupStartBlockMessage} from '../src/features/auth/email-signup-errors.ts';

test('web email sign-up stops for a registered address but not when the API is unreachable', () => {
  const err = (status) => Object.assign(new Error('x'), {status});
  assert.match(emailSignupStartBlockMessage(err(409)), /đã được đăng ký/);
  assert.match(emailSignupStartBlockMessage(err(429)), /quá nhanh/);
  for (const status of [0, 404, 500, 502, 503]) assert.equal(emailSignupStartBlockMessage(err(status)), null);
  assert.equal(emailSignupStartBlockMessage(new TypeError('fetch failed')), null);
});

test('the register form checks the address before Supabase sends the code', () => {
  const source = readFileSync(new URL('../src/app/register/register-form.tsx', import.meta.url), 'utf8');
  const check = source.indexOf('api.emailSignupStart(email)');
  const send = source.indexOf('supabase.auth.signInWithOtp', check);
  assert.ok(check > 0 && send > check);
});
