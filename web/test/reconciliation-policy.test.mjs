import test from 'node:test';import assert from 'node:assert/strict';
import {latestStatementDay,validStatementDay} from '../src/core/finance/reconciliation-policy.ts';
test('statement date respects the existing database UTC boundary before Vietnam midnight catches up',()=>{const max=latestStatementDay(new Date('2026-10-21T21:00:00Z'));assert.equal(max,'2026-10-21');assert.equal(validStatementDay('2026-10-22',max),false);assert.equal(validStatementDay('2026-10-21',max),true);});
test('impossible statement dates are rejected',()=>assert.equal(validStatementDay('2026-02-30','2026-10-21'),false));
