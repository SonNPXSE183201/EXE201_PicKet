import assert from "node:assert/strict";
import { test } from "node:test";
import { createAttemptOutbox } from "./attempt-outbox";
test("offline attempts persist their request key and retry without granting local cloud XP",async()=>{
 const rows=new Map<string,unknown>();
 const storage={read:async(owner:string)=>rows.get(owner),write:async(owner:string,value:unknown)=>{rows.set(owner,value);}};
 let calls=0;
 const store=createAttemptOutbox(storage);
 const attempt={key:"attempt_123",lessonId:"picket.vi.financial.v1.01",contentVersion:1,answers:[1,1,2]};
 await store.enqueue("guest",attempt);
 await assert.rejects(store.drain("guest",async()=>{throw Error("offline");}));
 assert.equal((await createAttemptOutbox(storage).load("guest"))[0].key,attempt.key);
 await Promise.all([store.drain("guest",async(row)=>{calls++;assert.equal(row.key,attempt.key);}),store.drain("guest",async()=>{calls++;})]);
 assert.equal(calls,1);assert.equal((await store.load("guest")).length,0);
 assert.equal((await store.load("userB")).length,0);
});
test("a reused key with changed answers is rejected before transmission",async()=>{
 let stored:unknown;
 const store=createAttemptOutbox({read:async()=>stored,write:async(_,value)=>{stored=value;}});
 const row={key:"attempt_123",lessonId:"picket.vi.financial.v1.01",contentVersion:1,answers:[1,1,2]};
 await store.enqueue("guest",row);
 await assert.rejects(store.enqueue("guest",{...row,answers:[0,1,2]}));
 assert.deepEqual((await store.load("guest"))[0].answers,row.answers);
});
