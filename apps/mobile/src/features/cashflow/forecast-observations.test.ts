import assert from "node:assert/strict";
import {test} from "node:test";
import {buildCapturedForecast,evaluateCapturedForecast,parseFrozenForecast,type CaptureInput} from "./forecast-observations";
import {createObservationStore} from "./forecast-observation-store";
const at="2026-10-24T12:00:00Z",wallet="aaaaaaaa-1234-4321-8123-123456789010";
function input():CaptureInput{return {snapshot:{asOf:at,wallets:[{id:wallet,name:"Private wallet name",currencyCode:"VND",openingBalance:100000,archived:false,deletedAt:null,updatedAt:"2026-10-01T00:00:00Z"}],entries:[{id:"paid",accountId:wallet,destinationAccountId:null,kind:"expense",amount:10000,occurredAt:"2026-10-24T10:00:00Z",updatedAt:"2026-10-24T10:00:00Z",deletedAt:null}],confirmations:[{transactionId:"paid",source:"cloud-verified",confirmedAt:at}]},accounts:[wallet],currency:"VND",days:7,schedules:[{id:"bill",walletId:wallet,startDay:"2026-10-25",frequency:"once",amount:-19000,currency:"VND",active:true}],links:[],pendingCount:0};}
test("live capture freezes F0 without inventing a midnight source or retaining wallet names",()=>{
 const source=input(),before=structuredClone(source),record=buildCapturedForecast("case-one",source,at);
 assert.equal(record.sourceAsOf,at);assert.equal(record.input.openingBalance,90000);assert.equal(record.baseline[1].balance,71000);
 assert.doesNotMatch(JSON.stringify(record),/Private wallet name/);assert.deepEqual(source,before);
 source.schedules[0].amount=-49000;assert.equal(record.baseline[1].balance,71000);
 assert.deepEqual(parseFrozenForecast(JSON.parse(JSON.stringify(record))),record);
});
test("stale snapshots, pending writes and changed settlement evidence cannot become captured forecasts",()=>{
 assert.throws(()=>buildCapturedForecast("case",input(),"2026-10-24T12:02:00Z"));
 assert.throws(()=>buildCapturedForecast("case",{...input(),pendingCount:1},at));
 assert.throws(()=>buildCapturedForecast("case",input(),"2026-10-24T11:59:00Z"));
 const bad=input();bad.links=[{occurrenceId:"bill:2026-10-25",day:"2026-10-25",amount:-19000,currency:"VND",transactionId:"paid",transactionUpdatedAt:at}];assert.throws(()=>buildCapturedForecast("case",bad,at));
});
test("owner-scoped capture persists before success and simultaneous taps reuse the frozen record",async()=>{
 const data=new Map<string,unknown>();let serial=0;
 const store=createObservationStore({read:async owner=>structuredClone(data.get(owner)),write:async(owner,value)=>{data.set(owner,structuredClone(value));},newId:()=>`case-${++serial}`,now:()=>at});
 const [first,second]=await Promise.all([store.capture("a",input()),store.capture("a",input())]);assert.equal(first.id,second.id);assert.equal((await store.load("a")).cases.length,1);assert.equal((await store.load("b")).cases.length,0);
 data.set("b",data.get("a"));await assert.rejects(store.load("b"));
 await assert.rejects(store.capture("a",input(),()=>false));
});
test("closing balances require closed days, keep correction history and never fill missing truth",async()=>{
 let value:unknown,clock=at;
 const store=createObservationStore({read:async()=>structuredClone(value),write:async(_owner,next)=>{value=structuredClone(next);},newId:()=>"case-one",now:()=>clock});
 const captured=await store.capture("a",input());await assert.rejects(store.observe("a",captured.id,0,"2026-10-24",90000));
 clock="2026-10-25T00:00:00Z";const first=await store.observe("a",captured.id,0,"2026-10-24",90000);
 const replay=await store.observe("a",captured.id,0,"2026-10-24",90000);assert.equal(replay.revision,first.revision);
 const corrected=await store.observe("a",captured.id,first.revision,"2026-10-24",89000);assert.equal(corrected.changes.length,1);assert.equal(corrected.changes[0].balance,90000);
 assert.equal(evaluateCapturedForecast(corrected,clock).status,"waiting");assert.equal(evaluateCapturedForecast(corrected,clock).metrics,null);
 await assert.rejects(store.observe("a",captured.id,first.revision,"2026-10-24",88000));
 clock="2026-10-31T00:00:00Z";let current=corrected;
 for(const row of captured.baseline.slice(1))current=await store.observe("a",captured.id,current.revision,row.day,row.balance);
 const result=evaluateCapturedForecast(current,clock);assert.equal(result.status,"evaluated");assert.equal(result.metrics?.mae,1000/7);
 clock="2026-10-30T00:00:00Z";await assert.rejects(store.observe("a",captured.id,current.revision,"2026-10-24",88000));
 await assert.rejects(store.remove("a",captured.id,0));await store.remove("a",captured.id,current.revision);assert.equal((await store.load("a")).cases.length,0);
});
test("history capacity never silently evicts captures and clearing requires the reviewed document revision",async()=>{
 let value:unknown,serial=0,clock=at;
 const store=createObservationStore({read:async()=>structuredClone(value),write:async(_owner,next)=>{value=structuredClone(next);},newId:()=>`case-${++serial}`,now:()=>clock});
 for(let index=0;index<50;index++){
  clock=new Date(Date.parse(at)+index*1000).toISOString();const source=input();source.snapshot.asOf=clock;source.snapshot.confirmations[0].confirmedAt=clock;await store.capture("a",source);
 }
 const before=await store.load("a");assert.equal(before.cases.length,50);
 clock=new Date(Date.parse(at)+51000).toISOString();const source=input();source.snapshot.asOf=clock;source.snapshot.confirmations[0].confirmedAt=clock;
 await assert.rejects(store.capture("a",source));assert.equal((await store.load("a")).cases[0].id,before.cases[0].id);
 await assert.rejects(store.clear("a",0));await store.clear("a",before.revision);assert.equal((await store.load("a")).cases.length,0);
});
test("thirty-day captures and malformed or future observations cannot produce premature metrics",()=>{
 const record=buildCapturedForecast("thirty",{...input(),days:30},at);assert.equal(record.baseline.length,30);assert.equal(evaluateCapturedForecast(record,"2026-10-31T00:00:00Z").metrics,null);
 for(const change of [{accountIds:["other"]},{engineVersion:"changed"},{revision:1},{observations:[{day:"2026-10-24",balance:0,source:"user-confirmed",observedAt:at}],revision:1}])assert.throws(()=>parseFrozenForecast({...record,...change}));
 assert.throws(()=>evaluateCapturedForecast(record,"2026-10-24T11:00:00Z"));
});
test("failed persistence or corrupt predictions do not acknowledge a capture or silently reset data",async()=>{
 const store=createObservationStore({read:async()=>null,write:async()=>{throw Error("disk full");},newId:()=>"case",now:()=>at});await assert.rejects(store.capture("a",input()));
 const record=buildCapturedForecast("case",input(),at);record.baseline[0].balance=123;assert.throws(()=>parseFrozenForecast(record));
});
