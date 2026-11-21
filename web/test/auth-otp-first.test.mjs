import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { newPasswordError, passwordRules, passwordValidationMessage } from '../src/core/auth/password.ts';
import { accountAccessFailureRedirect, canOpenPasswordSetup, isPasswordSetupExempt, isPasswordSetupGatedRequest, isPasswordSetupRequiredError, passwordSetupRedirect, passwordSetupRequestRedirect, passwordSetupRequired, PASSWORD_SETUP_PATH } from '../src/core/auth/password-setup.ts';
import { loadSignupChannels, parseSignupChannels } from '../src/core/auth/verification.ts';
import { firebaseWebConfig } from '../src/core/firebase/config.ts';
import { firebasePhoneErrorMessage, isPhoneCodeRestartError, phoneResetErrorMessage, phoneResetRestartsFromPhone, phoneResetStartErrorMessage, phoneSignupCompleteErrorMessage, phoneSignupStartErrorMessage } from '../src/features/auth/phone-signup-errors.ts';
import { canManageSignupVerification, canViewAdminSection } from '../src/features/admin/admin-permissions.ts';

test('password rules match the API: 12+ chars, both cases, a digit and a symbol', () => {
  const state = (p) => Object.fromEntries(passwordRules.map((r) => [r.id, r.ok(p)]));
  assert.deepEqual(state(''), { length: false, case: false, digit: false, symbol: false });
  assert.deepEqual(state('abcdefghijkl'), { length: true, case: false, digit: false, symbol: false });
  assert.deepEqual(state('Abcdefghijk1'), { length: true, case: true, digit: true, symbol: false });
  for (const symbol of '!@#$%^&*()_+-=[]{};\':"\\|,.<>/?`~') assert.equal(state(`Abcdefghij1${symbol}`).symbol, true, symbol);
  assert.equal(state('Abcdefghij1 ').symbol, false);
  assert.equal(passwordValidationMessage('Abcdefghij1!'), null);
  assert.match(passwordValidationMessage('short1!A'), /ít nhất 12 ký tự/);
  assert.deepEqual(passwordRules.map((r) => r.text), ['Ít nhất 12 ký tự', 'Có chữ hoa và chữ thường', 'Có ít nhất một số', 'Có ký tự đặc biệt']);
});

test('create-password requires a strong password typed twice', () => {
  assert.equal(newPasswordError('Abcdefghij1!', 'Abcdefghij1!'), null);
  assert.equal(newPasswordError('Abcdefghij1!', 'Abcdefghij1?'), 'Hai mật khẩu chưa khớp.');
  assert.match(newPasswordError('weak', 'weak'), /12 ký tự/);
});

test('verification channels fall back to email-only on anything unexpected', () => {
  assert.deepEqual(parseSignupChannels({ email: true, sms: true, verification: { email: false, sms: true, smsProvider: 'firebase' } }), { email: false, sms: true });
  assert.deepEqual(parseSignupChannels({ verification: { email: true, sms: true } }), { email: true, sms: true });
  for (const body of [null, undefined, 'x', {}, { email: true, sms: true }, { verification: null }, { verification: { email: 'yes', sms: false } }, { verification: { email: false, sms: false } }]) {
    assert.deepEqual(parseSignupChannels(body), { email: true, sms: false }, JSON.stringify(body));
  }
});

test('verification channels are fetched with a 60 s revalidate and survive API failures', async (t) => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  const calls = [];
  globalThis.fetch = async (url, init) => { calls.push([url, init]); return new Response(JSON.stringify({ verification: { email: true, sms: true } }), { status: 200 }); };
  assert.deepEqual(await loadSignupChannels('https://api.example.com/'), { email: true, sms: true });
  assert.equal(calls[0][0], 'https://api.example.com/v1/auth/channels');
  assert.equal(calls[0][1].next.revalidate, 60);
  globalThis.fetch = async () => new Response('nope', { status: 500 });
  assert.deepEqual(await loadSignupChannels('https://api.example.com'), { email: true, sms: false });
  globalThis.fetch = async () => { throw new Error('offline'); };
  assert.deepEqual(await loadSignupChannels('https://api.example.com'), { email: true, sms: false });
});

test('accounts without a password are held on /create-password except for auth, APIs and assets', () => {
  const pending = { sub: 'u', user_metadata: { password_setup_required: true } };
  assert.equal(passwordSetupRequired(pending), true);
  for (const claims of [null, undefined, {}, { user_metadata: {} }, { user_metadata: { password_setup_required: false } }, { user_metadata: { password_setup_required: 'true' } }]) {
    assert.equal(passwordSetupRequired(claims), false);
    assert.equal(passwordSetupRedirect('/dashboard', claims), null);
  }
  for (const path of ['/dashboard', '/session', '/admin', '/register', '/login', '/', '/transactions']) assert.equal(passwordSetupRedirect(path, pending), PASSWORD_SETUP_PATH, path);
  for (const path of [PASSWORD_SETUP_PATH, '/auth/callback', '/auth/expired', '/logout', '/api/export', '/_next/static/x.js', '/admin-paper/receipt-v2.webp', '/favicon.ico']) {
    assert.equal(isPasswordSetupExempt(path), true, path);
    assert.equal(passwordSetupRedirect(path, pending), null, path);
  }
});

test('the proxy skips only POST server actions; GET/HEAD are gated whatever the headers', () => {
  const pending = { sub: 'u', user_metadata: { password_setup_required: true } };
  assert.equal(isPasswordSetupGatedRequest('POST', true), false);
  assert.equal(isPasswordSetupGatedRequest('post', true), false);
  for (const method of ['GET', 'HEAD', 'get']) {
    assert.equal(isPasswordSetupGatedRequest(method, true), true, method);
    assert.equal(isPasswordSetupGatedRequest(method, false), true, method);
    assert.equal(passwordSetupRequestRedirect({ method, pathname: '/dashboard', hasNextAction: true }, pending), PASSWORD_SETUP_PATH, method);
  }
  assert.equal(isPasswordSetupGatedRequest('POST', false), true);
  assert.equal(passwordSetupRequestRedirect({ method: 'POST', pathname: '/dashboard', hasNextAction: true }, pending), null);
  assert.equal(passwordSetupRequestRedirect({ method: 'GET', pathname: '/dashboard', hasNextAction: false }, {}), null);
  const source = readFileSync(new URL('../src/core/supabase/proxy.ts', import.meta.url), 'utf8');
  assert.match(source, /passwordSetupRequestRedirect\(/);
  assert.match(source, /hasNextAction: request\.headers\.has\("next-action"\)/);
  assert.doesNotMatch(source, /!request\.headers\.has\("next-action"\)/);
});

test('API "Password setup required" sends the user to /create-password?required=1', () => {
  const setup = { status: 403, message: 'Password setup required', details: { error: 'Password setup required' } };
  assert.equal(isPasswordSetupRequiredError(setup), true);
  assert.equal(isPasswordSetupRequiredError({ status: 403, message: 'Forbidden', details: { error: 'x', hint: 'Password setup required' } }), true);
  assert.equal(isPasswordSetupRequiredError({ status: 401, message: 'Password setup required' }), false);
  assert.equal(isPasswordSetupRequiredError({ status: 403, message: 'Account locked' }), false);
  assert.equal(isPasswordSetupRequiredError(null), false);
  assert.equal(accountAccessFailureRedirect(setup, '/dashboard'), '/create-password?required=1');
  assert.equal(accountAccessFailureRedirect({ status: 403, message: 'Account locked' }, '/admin'), '/auth/expired?next=%2Fadmin');
  assert.equal(accountAccessFailureRedirect({ status: 401, message: 'x' }, '/dashboard'), '/auth/expired?next=%2Fdashboard');
  assert.equal(accountAccessFailureRedirect({ status: 500, message: 'x' }, '/dashboard'), null);
  const session = readFileSync(new URL('../src/core/auth/require-api-session.ts', import.meta.url), 'utf8');
  assert.match(session, /accountAccessFailureRedirect\(error/);
});

test('/create-password opens for the metadata flag, or for ?required=1 with a session', () => {
  const pending = { sub: 'u', user_metadata: { password_setup_required: true } };
  const plain = { sub: 'u', user_metadata: {} };
  assert.equal(canOpenPasswordSetup(pending, undefined), true);
  assert.equal(canOpenPasswordSetup(plain, undefined), false);
  assert.equal(canOpenPasswordSetup(plain, '1'), true);
  assert.equal(canOpenPasswordSetup(plain, ['1']), false);
  assert.equal(canOpenPasswordSetup(null, '1'), false);
  assert.equal(canOpenPasswordSetup(undefined, '1'), false);
});

test('SMS errors: an expired server start restarts from the phone step; recovery maps 404', () => {
  const restart = { status: 403, message: 'Request a new code first.' };
  const disabled = { status: 403, message: 'SMS verification is disabled.' };
  assert.equal(isPhoneCodeRestartError(restart), true);
  assert.equal(isPhoneCodeRestartError(disabled), false);
  assert.equal(phoneSignupCompleteErrorMessage(restart), 'Mã đã hết hạn, hãy gửi lại mã.');
  assert.match(phoneSignupCompleteErrorMessage(disabled), /tạm tắt/);
  assert.equal(phoneResetErrorMessage(restart), 'Mã đã hết hạn, hãy gửi lại mã.');
  assert.equal(phoneResetErrorMessage({ status: 404, message: 'No account uses this phone.' }), 'Không tìm thấy tài khoản dùng số này.');
  assert.match(phoneResetErrorMessage({ status: 401, message: 'Invalid phone verification.' }), /hết hạn/);
  assert.match(phoneResetErrorMessage({ status: 403, message: 'SMS verification is disabled.' }), /tạm tắt/);
  assert.match(phoneResetStartErrorMessage({ status: 429 }), /giới hạn/);
  assert.match(phoneResetStartErrorMessage({ status: 400 }), /không hợp lệ/);
  assert.equal(phoneResetRestartsFromPhone(restart), true);
  assert.equal(phoneResetRestartsFromPhone({ status: 404 }), true);
  assert.equal(phoneResetRestartsFromPhone({ status: 401 }), false);
});

test('forgot-password offers SMS only with Firebase config and uses reset-start → reset', () => {
  const page = readFileSync(new URL('../src/app/forgot-password/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /channels\.sms \? firebaseWebConfig\(\) : undefined/);
  const form = readFileSync(new URL('../src/app/forgot-password/forgot-password-form.tsx', import.meta.url), 'utf8');
  assert.match(form, /api\.phoneResetStart\(target\)/);
  assert.match(form, /api\.phoneReset\(phone, proof\.current\.idToken, password\)/);
  assert.match(form, /discardFirebaseUser\(firebase!, proof\.current\.user\)/);
  assert.match(form, /Đã đặt lại mật khẩu\. Hãy đăng nhập bằng số điện thoại và mật khẩu mới\./);
  assert.match(form, /resetPasswordForEmail/);
});

test('Firebase web config is runtime-only and optional', () => {
  assert.equal(firebaseWebConfig({}), undefined);
  assert.equal(firebaseWebConfig({ FIREBASE_WEB_API_KEY: 'key' }), undefined);
  assert.equal(firebaseWebConfig({ FIREBASE_PROJECT_ID: 'picket' }), undefined);
  assert.deepEqual(firebaseWebConfig({ FIREBASE_WEB_API_KEY: ' key ', FIREBASE_PROJECT_ID: 'picket' }), { apiKey: 'key', authDomain: 'picket.firebaseapp.com', projectId: 'picket' });
  assert.equal(firebaseWebConfig({ FIREBASE_WEB_API_KEY: 'key', FIREBASE_PROJECT_ID: 'picket', FIREBASE_AUTH_DOMAIN: 'auth.picketfinance.com' }).authDomain, 'auth.picketfinance.com');
  const example = readFileSync(new URL('../.env.example', import.meta.url), 'utf8');
  for (const name of ['FIREBASE_WEB_API_KEY', 'FIREBASE_AUTH_DOMAIN', 'FIREBASE_PROJECT_ID']) assert.match(example, new RegExp(`^${name}=$`, 'm'));
});

test('SMS sign-up errors are shown in Vietnamese', () => {
  assert.equal(firebasePhoneErrorMessage({ code: 'auth/invalid-phone-number' }), 'Số điện thoại không hợp lệ.');
  for (const code of ['auth/too-many-requests', 'auth/quota-exceeded', 'auth/invalid-verification-code', 'auth/code-expired', 'auth/session-expired', 'auth/operation-not-allowed', 'auth/captcha-check-failed']) {
    assert.notEqual(firebasePhoneErrorMessage({ code }), firebasePhoneErrorMessage({ code: 'auth/unknown' }), code);
  }
  assert.equal(firebasePhoneErrorMessage(new Error('x')), 'Chưa gửi được mã qua SMS. Vui lòng thử lại.');
  assert.equal(phoneSignupStartErrorMessage({ status: 409 }), 'Số điện thoại đã được đăng ký. Hãy đăng nhập.');
  assert.equal(phoneSignupCompleteErrorMessage({ status: 409 }), 'Số điện thoại đã được đăng ký. Hãy đăng nhập.');
  assert.match(phoneSignupStartErrorMessage({ status: 429 }), /giới hạn/);
  assert.match(phoneSignupStartErrorMessage({ status: 403 }), /tạm tắt/);
  assert.match(phoneSignupCompleteErrorMessage({ status: 401 }), /hết hạn/);
});

test('only auth.verification.manage (or the bootstrap owner) manages sign-up channels', () => {
  assert.equal(canManageSignupVerification(null, ['auth.verification.manage']), true);
  assert.equal(canManageSignupVerification('owner', ['settings.read']), false);
  assert.equal(canManageSignupVerification('owner', undefined), true);
  assert.equal(canViewAdminSection(null, 'settings', ['auth.verification.manage']), true);
  assert.equal(canViewAdminSection(null, 'settings', ['users.read']), false);
});

test('web sign-up no longer attaches a pending phone after email verification', () => {
  for (const file of ['register/register-form.tsx', 'verify-email/verify-email-form.tsx']) {
    const source = readFileSync(new URL(`../src/app/${file}`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /pending_phone|attachPendingPhone/, file);
  }
  const register = readFileSync(new URL('../src/app/register/register-form.tsx', import.meta.url), 'utf8');
  assert.match(register, /signInWithOtp\(/);
  assert.match(register, /password_setup_required: true/);
  assert.doesNotMatch(register, /auth\.signUp\(/);
});
