import assert from "node:assert/strict";
import test from "node:test";
import {emptyGuestFinance} from "../local/guest-finance";
import {validateGuestBackupPayload} from "./guest-backup-model";
for(const collection of ["categories","budgets","bills","subscriptions"] as const){
 test("restore rejects duplicate IDs in "+collection,()=>{
  const finance=emptyGuestFinance();
  Object.assign(finance,{[collection]:[{id:"same"},{id:"same"}]});
  assert.throws(()=>validateGuestBackupPayload({finance,keepsakes:[],receipts:[],media:{}}));
 });
}

test("restore rejects duplicate valid wallets and transactions while accepting distinct IDs",()=>{
 const account={id:"cash",name:"Cash",currencyCode:"VND",openingBalance:0};
 const transaction={id:"entry",title:"Lunch",amount:100,kind:"expense",accountId:"cash",destinationAccountId:null,occurredAt:"2026-10-01"};
 const make=(accounts:unknown[],transactions:unknown[])=>({finance:{...emptyGuestFinance(),accounts,transactions},keepsakes:[],receipts:[],media:{}});
 assert.throws(()=>validateGuestBackupPayload(make([account,account],[])));
 assert.throws(()=>validateGuestBackupPayload(make([account],[transaction,transaction])));
 const valid=make([account],[transaction,{...transaction,id:"another"}]);
 assert.equal(validateGuestBackupPayload(valid),valid);
});
