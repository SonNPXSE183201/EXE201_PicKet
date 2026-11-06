import assert from "node:assert/strict";
import test from "node:test";
import {emptyGuestFinance} from "../local/guest-finance";
import {validateGuestBackupPayload} from "./guest-backup-model";
const budget={id:"budget",categoryId:"food",name:"Food",defaultLimit:100,alertPercent:80,active:true};
const payload=(patch:Record<string,unknown>={})=>({finance:{...emptyGuestFinance(),categories:[{id:"food"}],budgets:[{...budget,...patch}]},keepsakes:[],receipts:[],media:{}});
test("restore rejects invalid budget limits, thresholds and category references",()=>{
 for(const patch of [{defaultLimit:-1},{defaultLimit:0.1},{defaultLimit:9_000_000_000_001},{alertPercent:0},{alertPercent:101},{alertPercent:1.5},{active:"yes"},{name:null},{categoryId:"missing"},{currencyCode:"invalid"}]) assert.throws(()=>validateGuestBackupPayload(payload(patch)));
});
test("restore preserves zero budget limits, threshold boundaries and optional currency",()=>{
 for(const patch of [{defaultLimit:0,alertPercent:1},{alertPercent:100,currencyCode:"VND"},{active:false}]){
  const p=payload(patch);assert.equal(validateGuestBackupPayload(p),p);
 }
});
