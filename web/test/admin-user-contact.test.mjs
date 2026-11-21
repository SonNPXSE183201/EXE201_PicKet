import assert from 'node:assert/strict';
import test from 'node:test';
import {userPhone, userPhoneVerified, userVerified} from '../src/features/admin/user-contact.ts';

test('admin users show the attached contact phone before the auth phone', () => {
  assert.equal(userPhone({contact_phone: '+84912345678', phone: '84999999999'}), '+84 912 345 678');
  assert.equal(userPhone({phone: '84912345678'}), '+84 912 345 678');
  assert.equal(userPhone({phone: '6591234567'}), '+6591234567');
  assert.equal(userPhone({email: 'a@b.vn', phone: ''}), '');
  assert.equal(userPhone({}), '');
});

test('phone-only accounts count as verified when the phone is confirmed', () => {
  assert.equal(userPhoneVerified({phone: '84912345678', phone_confirmed_at: '2026-11-20T00:00:00Z'}), true);
  assert.equal(userPhoneVerified({phone: '84912345678'}), false);
  assert.equal(userPhoneVerified({contact_phone: '+84912345678', contact_phone_verified: true}), true);
  assert.equal(userPhoneVerified({contact_phone: '+84912345678', contact_phone_verified: false}), false);
  assert.equal(userVerified({phone: '84912345678', phone_confirmed_at: '2026-11-20T00:00:00Z'}), true);
  assert.equal(userVerified({email: 'a@b.vn', email_confirmed_at: '2026-11-20T00:00:00Z'}), true);
  assert.equal(userVerified({email: 'a@b.vn'}), false);
});
