import test from 'node:test';
import assert from 'node:assert/strict';
import { monthSummary, walletBalances, vietnamDate, categorySpending } from '../src/core/finance/overview.ts';

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
test('server refund kind credits wallet and reduces net expenses',()=>{
  const rows=[row({amount:100}),row({kind:'refund',amount:25,refundOfTransactionId:'original'})];
  assert.equal(walletBalances([{id:'a',openingBalance:1000}],rows).a,925);
  assert.deepEqual(monthSummary(rows,'2026-10'),{income:0,expense:75});
});
test('category spending includes split allocations and proportional or explicit refunds',()=>{
 const rows=[row({id:'old',amount:100,categoryId:'a',occurredAt:'2026-09-01'}),row({id:'refund',kind:'refund',amount:50,refundOfTransactionId:'old'}),row({id:'new',amount:200,categoryId:'a'})];
 const splits=[{transactionId:'old',categoryId:'a',amount:60},{transactionId:'old',categoryId:'b',amount:40},{transactionId:'new',categoryId:'b',amount:200}];
 assert.deepEqual(categorySpending(rows,'2026-10',splits),[{id:'b',amount:180},{id:'a',amount:-30}]);
 assert.deepEqual(categorySpending(rows,'2026-10',[...splits,{transactionId:'refund',categoryId:'a',amount:50}]),[{id:'b',amount:200},{id:'a',amount:-50}]);
});
