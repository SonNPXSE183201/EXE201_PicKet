import assert from "node:assert/strict";
import { test } from "node:test";
import { createLearningDraftStore } from "./drafts";
test("draft survives restart and isolates owner with ordered rapid writes", async () => {
 const rows=new Map<string,unknown>();
 const storage={read:async(owner:string)=>rows.get(owner),write:async(owner:string,value:unknown)=>{rows.set(owner,value);}};
 const store=createLearningDraftStore(storage);
 const lessonId="picket.vi.financial.v1.01";
 await Promise.all([store.save("guest",{lessonId,version:1,answers:[0,null,null]}),store.save("guest",{lessonId,version:1,answers:[0,1,null]})]);
 assert.deepEqual(await createLearningDraftStore(storage).load("guest"),{lessonId,version:1,answers:[0,1,null]});
 assert.equal(await store.load("userB"),null);
 await assert.rejects(store.save("guest",{lessonId,version:1,answers:[99]}));
 assert.deepEqual((await store.load("guest"))?.answers,[0,1,null]);
 await store.clear("guest"); assert.equal(await store.load("guest"),null);
});
test("unknown content or corrupted drafts never silently overwrite history",async()=>{
 let writes=0;
 const store=createLearningDraftStore({read:async()=>({schemaVersion:99}),write:async()=>{writes++;}});
 await assert.rejects(store.load("guest"));
 await assert.rejects(store.save("guest",{lessonId:"unknown",version:1,answers:[]}));
 assert.equal(writes,0);
});

test("completion cleanup removes only the exact draft that was completed",async()=>{
 const rows=new Map<string,unknown>();let writes=0;
 const store=createLearningDraftStore({read:async(owner)=>rows.get(owner),write:async(owner,value)=>{writes++;rows.set(owner,value);}});
 const clear=Reflect.get(store,"clearIfUnchanged") as (owner:string,expected:{lessonId:string;version:number;answers:(number|null)[]})=>Promise<void>;
 assert.equal(typeof clear,"function");
 const completed={lessonId:"picket.vi.financial.v1.01",version:1,answers:[0,1,2]};
 const newer={...completed,answers:[1,1,null]};
 await store.save("guest",completed);
 await Promise.all([store.save("guest",newer),clear("guest",completed)]);
 assert.deepEqual(await store.load("guest"),newer);
 const before=writes;await clear("other",completed);assert.equal(writes,before);
 await clear("guest",newer);assert.equal(await store.load("guest"),null);
});
test("conditional completion cleanup preserves unknown draft schemas",async()=>{
 let writes=0;const store=createLearningDraftStore({read:async()=>({schemaVersion:99}),write:async()=>{writes++;}});
 const clear=Reflect.get(store,"clearIfUnchanged") as (owner:string,expected:unknown)=>Promise<void>;assert.equal(typeof clear,"function");
 await assert.rejects(clear("guest",{lessonId:"picket.vi.financial.v1.01",version:1,answers:[0,1,2]}));assert.equal(writes,0);
});
