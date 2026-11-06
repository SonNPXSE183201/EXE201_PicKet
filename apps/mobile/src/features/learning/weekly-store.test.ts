import assert from "node:assert/strict";
import { test } from "node:test";
import { createWeeklyPracticeStore } from "./weekly-store";
test("weekly practice survives restart and concurrent taps keep one reward per owner",async()=>{
 const rows=new Map<string,unknown>();
 const storage={read:async(owner:string)=>rows.get(owner),write:async(owner:string,value:unknown)=>{rows.set(owner,value);}};
 const store=createWeeklyPracticeStore(storage);
 await store.record("ownerA","2026-10-19",true);
 await Promise.all([store.record("ownerA","2026-10-19",false),store.record("ownerA","2026-10-19",false)]);
 const events=await createWeeklyPracticeStore(storage).load("ownerA");
 assert.equal(events.length,1);assert.equal(events[0].xp,10);
 assert.equal((await store.load("ownerB")).length,0);
});
