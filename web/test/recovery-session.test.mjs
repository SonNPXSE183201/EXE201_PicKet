import assert from 'node:assert/strict';
import test from 'node:test';
import { recoverySession } from '../src/features/auth/recovery-session.ts';
test('recovery accepts only an explicit recovery fragment and bounded tokens',()=>{
 assert.deepEqual(recoverySession('#type=recovery&access_token=qa-access&refresh_token=qa-refresh'),{access_token:'qa-access',refresh_token:'qa-refresh'});
 for(const input of ['#type=signup&access_token=a&refresh_token=b','#type=recovery&access_token=a','#error=expired','#type=recovery&access_token='+ 'a'.repeat(20001)+'&refresh_token=b'])assert.equal(recoverySession(input),null);
});
