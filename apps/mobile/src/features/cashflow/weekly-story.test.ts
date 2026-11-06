import assert from "node:assert/strict";
import { test } from "node:test";
import { parseLedgerSnapshot } from "./ledger-snapshot";
import { buildWeeklyStory } from "./weekly-story";
const asOf="2026-10-24T12:00:00Z";
const wallet=(id:string)=>({id,name:id,currencyCode:"VND",openingBalance:100000,archived:false,deletedAt:null,updatedAt:asOf});
const row=(id:string,kind:string,amount:number,occurredAt=asOf)=>({id,kind,amount,occurredAt,accountId:"cash",destinationAccountId:kind==="transfer"?"bank":null,deletedAt:null,updatedAt:asOf});
const entries=[row("salary","income",49000),row("meal","expense",19000),row("refund","refund",2000),row("move","transfer",10000),row("old","expense",1000,"2026-10-18T12:00:00Z")];
const snapshot=parseLedgerSnapshot({asOf,wallets:[wallet("cash"),wallet("bank")],entries,confirmations:entries.map(entry=>({transactionId:entry.id,source:"cloud-verified",confirmedAt:asOf}))});
test("weekly template uses only confirmed saved records and keeps refunds and transfers separate",()=>{
 const before=JSON.stringify(snapshot),story=buildWeeklyStory(snapshot,["cash"],"VND");
 assert.equal(story.weekStart,"2026-10-19");assert.equal(story.throughDay,"2026-10-24");
 assert.deepEqual([story.income,story.expenses,story.refunds,story.transferNet,story.net],[49000,19000,2000,-10000,22000]);
 assert.deepEqual(story.transactionIds,["salary","meal","refund","move"]);
 assert.equal(buildWeeklyStory(snapshot,["cash","bank"],"VND").transferNet,0);
 assert.equal(JSON.stringify(snapshot),before);
});
test("unknown confirmations and currency mismatch abstain; empty saved week never invents a movement",()=>{
 assert.throws(()=>buildWeeklyStory({...snapshot,confirmations:[]},["cash"],"VND"));
 assert.throws(()=>buildWeeklyStory(snapshot,["cash"],"USD"));
 const empty=buildWeeklyStory({...snapshot,entries:[],confirmations:[]},["cash"],"VND");
 assert.equal(empty.net,0);assert.deepEqual(empty.transactionIds,[]);
});
test("week boundaries use UTC and future or deleted records never enter the story",()=>{
 const origin="2027-01-03T23:30:00-01:00";
 const items=[row("current","income",1000,"2027-01-04T00:00:00Z"),row("prior","expense",100,"2027-01-03T23:59:59Z"),row("future","income",200,"2027-01-05T00:00:00Z"),{...row("deleted","expense",300,"2027-01-04T00:00:00Z"),deletedAt:"2027-01-04T00:01:00Z"}];
 const story=buildWeeklyStory({...snapshot,asOf:origin,entries:items,confirmations:items.map(entry=>({transactionId:entry.id,source:"cloud-verified" as const,confirmedAt:origin}))},["cash"],"VND");
 assert.equal(story.weekStart,"2027-01-04");assert.equal(story.throughDay,"2027-01-04");
 assert.equal(story.net,1000);assert.deepEqual(story.transactionIds,["current"]);
});
