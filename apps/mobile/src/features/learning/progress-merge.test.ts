import assert from "node:assert/strict";
import { test } from "node:test";
import { createLearningProgressStore } from "./progress";
test("verified cloud progress merges idempotently and rejects unknown XP before storage",async()=>{
 let value:unknown;
 const store=createLearningProgressStore({read:async()=>value,write:async(_,next)=>{value=next;}});
 await store.complete("ownerA","picket.vi.financial.v1.01",1);
 const rows=[{lesson_id:"picket.vi.financial.v1.02",content_version:1,xp:20,completed_at:"2026-10-23T12:00:00.000Z"}];
 await store.mergeVerified("ownerA",rows);await store.mergeVerified("ownerA",rows);
 assert.equal((await store.load("ownerA")).completed.length,2);
 await assert.rejects(store.mergeVerified("ownerA",[{...rows[0],xp:999}]));
 assert.equal((await store.load("ownerA")).completed.length,2);
});
