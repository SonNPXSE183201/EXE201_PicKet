import test from 'node:test';
import assert from 'node:assert/strict';
import { monthSummary, walletBalances, vietnamDate } from '../src/core/finance/overview.ts';

const row=(extra)=>({id:crypto.randomUUID(),deletedAt:null,kind:'expense',amount:100,accountId:'a',destinationAccountId:null,occurredAt:'2026-10-01T12:00:00Z',refundOfTransactionId:null,...extra});
test('balances include income, expenses and transfer legs without double counting',()=>{
  assert.deepEqual(walletBalances([{id:'a',openingBalance:1000},{id:'b',openingBalance:50}],[row({}),row({kind:'income',amount:20}),row({kind:'transfer',amount:200,destinationAccountId:'b'})]),{a:720,b:250});
});
test('monthly summary subtracts refunds from expense, not earned income; ignores deleted rows',()=>{
  assert.deepEqual(monthSummary([row({amount:100}),row({kind:'income',amount:30,refundOfTransactionId:'old'}),row({kind:'income',amount:80}),row({amount:999,deletedAt:'2026-10-01'}),row({occurredAt:'2026-09-10'})],'2026-10'),{income:80,expense:70});
});
test('month bucketing uses Vietnam time rather than UTC at month boundary',()=>{
  assert.equal(vietnamDate('2026-09-30T18:00:00Z'),'2026-10-01');
  assert.equal(monthSummary([row({occurredAt:'2026-09-30T18:00:00Z'})],'2026-10').expense,100);
});
