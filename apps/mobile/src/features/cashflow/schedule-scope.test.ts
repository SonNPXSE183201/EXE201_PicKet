import assert from "node:assert/strict";
import { test } from "node:test";
import { parseScheduleDocument } from "./schedule-store";
import { scopeSchedules } from "./schedule-scope";
import { createScheduleSyncStore } from "./schedule-sync-store";
const cash="44444444-1234-4321-8123-123456789011",bank="44444444-1234-4321-8123-123456789012";
const row={id:"rent",startDay:"2026-10-24",frequency:"monthly" as const,amount:-19000,currency:"VND",active:true,walletId:cash};
test("wallet assignment survives storage and selected scope excludes another wallet",()=>{
 const parsed=parseScheduleDocument({schemaVersion:1,revision:0,schedules:[row,{...row,id:"bank",walletId:bank}]}).schedules;
 assert.equal(parsed[0].walletId,cash);
 assert.deepEqual(scopeSchedules(parsed,[cash],"VND").map(value=>value.id),["rent"]);
 assert.equal(scopeSchedules(parsed,[cash,bank],"VND").length,2);
});
test("wallet assignment survives the durable outbox and cloud acknowledgement",async()=>{
 let value:unknown;
 const store=createScheduleSyncStore({read:async()=>value,write:async(_owner,next)=>{value=next;}},()=>"wallet-scope-operation");
 await store.save("owner",0,row);
 let remote={schemaVersion:1 as const,revision:0,schedules:[] as typeof row[]};
 const result=await store.sync("owner",async()=>remote,async operation=>{
  assert.equal((operation.schedule as typeof row).walletId,cash);
  remote={schemaVersion:1,revision:1,schedules:[row]};
  return {...remote,appliedRevision:1};
 });
 assert.equal(result.schedules[0].walletId,cash);
 assert.equal((await store.load("owner")).schedules[0].walletId,cash);
});
test("unassigned active schedules block verified scenarios; legacy manual storage stays readable",()=>{
 const {walletId,...legacy}=row;void walletId;
 assert.equal(parseScheduleDocument({schemaVersion:1,revision:0,schedules:[legacy]}).schedules[0].walletId,undefined);
 assert.throws(()=>scopeSchedules([legacy],[cash],"VND"));
 assert.deepEqual(scopeSchedules([{...legacy,active:false}],[cash],"VND"),[]);
 assert.throws(()=>parseScheduleDocument({schemaVersion:1,revision:0,schedules:[{...row,walletId:"not-a-wallet"}]}));
});
