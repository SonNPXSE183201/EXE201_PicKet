import test from 'node:test';import assert from 'node:assert/strict';
import {assertLiveBackup} from '../src/core/finance/backup-live-guard.ts';
const data={wallets:[{id:'w'}],entries:[{id:'live',walletId:'w',destinationId:null}],budgets:[],bills:[],keepsakes:[],plans:[]};
const ids={wallets:new Set(['w']),entries:new Set(['live']),budgets:new Set(),bills:new Set(),keepsakes:new Set(),plans:new Set()};
test('safe live export passes without altering financial data',()=>assert.doesNotThrow(()=>assertLiveBackup(data,ids)));
test('a backend export containing an archived transaction is blocked, never silently revived',()=>assert.throws(()=>assertLiveBackup({...data,entries:[...data.entries,{id:'archived',walletId:'w'}]},ids)));
test('export with a missing wallet reference is blocked',()=>assert.throws(()=>assertLiveBackup({...data,wallets:[]},ids)));
