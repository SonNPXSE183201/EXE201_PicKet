import assert from "node:assert/strict";
import test from "node:test";
import {emptyGuestFinance} from "../local/guest-finance";
import {validateGuestBackupPayload} from "./guest-backup-model";
const bill={id:"bill",title:"Rent",amount:100,dueAt:"2026-10-01",status:"pending",paidTransactionId:null};
const subscription={id:"sub",title:"Rent",amount:100,nextDueAt:"2026-10-01",cadence:"monthly",cycleMonths:1,active:true,note:"",alertDays:0,walletId:null,categoryId:null};
function payload(key:string,row:unknown){return {finance:{...emptyGuestFinance(),[key]:[row]},keepsakes:[],receipts:[],media:{}};}
test("restore rejects invalid bill amounts dates and status",()=>{
 for(const patch of [{amount:0},{amount:-1},{amount:0.5},{amount:9_000_000_000_001},{title:" "},{dueAt:"invalid"},{status:"unknown"}]) assert.throws(()=>validateGuestBackupPayload(payload("bills",{...bill,...patch})));
 assert.ok(validateGuestBackupPayload(payload("bills",bill)));
});
test("restore rejects invalid recurring schedule fields and retains custom legacy cadence",()=>{
 for(const patch of [{amount:0},{nextDueAt:"invalid"},{cadence:"unknown"},{cycleMonths:0},{cycleMonths:121},{alertDays:-1},{alertDays:366},{active:"yes"},{note:null},{walletId:"missing"},{categoryId:"missing"}]) assert.throws(()=>validateGuestBackupPayload(payload("subscriptions",{...subscription,...patch})));
 assert.ok(validateGuestBackupPayload(payload("subscriptions",{...subscription,cadence:"custom",cycleMonths:120,alertDays:365})));
});

test("restore rejects normalized impossible calendar dates and non-ISO date text",()=>{
 for(const date of ["2026-02-29","2026-02-31T12:00:00Z","2026-04-31T00:00:00+07:00","10/01/2026","2026-01-01T24:00:00Z"]){
  assert.throws(()=>validateGuestBackupPayload(payload("bills",{...bill,dueAt:date})));
  assert.throws(()=>validateGuestBackupPayload(payload("subscriptions",{...subscription,nextDueAt:date})));
 }
});
test("restore preserves leap days and ISO instants with explicit or legacy local time",()=>{
 for(const date of ["2024-02-29","2024-02-29T23:59:59.123456Z","2024-02-29T23:59:59+07:00","2024-02-29T12:00:00"]){
  const p=payload("bills",{...bill,dueAt:date});assert.equal(validateGuestBackupPayload(p),p);
 }
});
