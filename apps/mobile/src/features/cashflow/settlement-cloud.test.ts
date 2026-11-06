import assert from "node:assert/strict";
import {test} from "node:test";
import {createSettlementStore,SettlementMutationRejected} from "./settlement-store";
const link={occurrenceId:"schedule:2026-10-24",day:"2026-10-24",amount:-19000,currency:"VND",transactionId:"tx",transactionUpdatedAt:"2026-10-24T12:00:00Z"};
function fixture(){const data=new Map<string,unknown>();const store=createSettlementStore({read:async o=>structuredClone(data.get(o)),write:async(o,d)=>{data.set(o,structuredClone(d));}});return {store,data};}
const empty={schemaVersion:1 as const,revision:0,links:[]};
test("settlement publish persists a stable operation before send and retry cannot overwrite concurrent cloud changes",async()=>{
 const {store,data}=fixture();await store.save("a",0,[link]);
 const review=await store.review("a",async()=>empty);
 const sent:unknown[]=[];
 await assert.rejects(store.publish("a",review,async()=>empty,async(revision,links,key)=>{assert.ok((data.get("a") as {cloudAttempt:unknown}).cloudAttempt);sent.push({revision,links,key});throw new Error("lost response");},()=>"settlement-key-1"));
 assert.equal((await store.status("a")).pending,true);
 await assert.rejects(store.save("a",1,[]));
 const remote={...empty,revision:2,links:[],appliedRevision:1};
 await store.publish("a",null,async()=>{throw Error("retry must reuse request");},async(revision,links,key)=>{sent.push({revision,links,key});return remote;},()=>{throw Error("no new key");});
 assert.deepEqual(sent[0],sent[1]);assert.equal((await store.status("a")).pending,false);
 assert.deepEqual((await store.load("a")).links,[link]);
 assert.deepEqual((await store.load("b")).links,[]);
});
test("adopting reviewed cloud copy requires both versions unchanged and retains local recovery",async()=>{
 const {store}=fixture();await store.save("a",0,[link]);
 const remote={...empty,revision:4};const review=await store.review("a",async()=>remote);
 await assert.rejects(store.adopt("a",review,async()=>({...remote,revision:5})));
 assert.deepEqual((await store.load("a")).links,[link]);
 const adopted=await store.adopt("a",review,async()=>remote);
 assert.equal(adopted.revision,2);assert.deepEqual(adopted.links,[]);
 assert.deepEqual((await store.status("a")).recovery?.links,[link]);
 await assert.rejects(store.adopt("a",review,async()=>remote));
});
test("owner or cancellation changes never send or adopt a stale reviewed copy",async()=>{
 const {store}=fixture();const review=await store.review("a",async()=>empty);
 await store.save("a",0,[link]);let calls=0;
 await assert.rejects(store.publish("a",review,async()=>empty,async()=>{calls++;return empty;},()=>"settlement-key-2"));
 await assert.rejects(store.adopt("a",review,async()=>empty,()=>false));
 await assert.rejects(store.review("a",async()=>empty,()=>false));assert.equal(calls,0);
});
test("definitively rejected writes release the barrier but ambiguous acknowledgments retain it",async()=>{
 const {store}=fixture();await store.save("a",0,[link]);const review=await store.review("a",async()=>empty);
 await assert.rejects(store.publish("a",review,async()=>empty,async()=>{throw new SettlementMutationRejected();},()=>"settlement-key-3"));
 assert.equal((await store.status("a")).pending,false);
 await assert.rejects(store.publish("a",review,async()=>empty,async()=>({...empty,revision:1,appliedRevision:1}),()=>"settlement-key-4"));
 assert.equal((await store.status("a")).pending,true);
 await store.publish("a",null,async()=>empty,async()=>({...empty,revision:1,links:[link],appliedRevision:1}),()=>"unused-key");
 assert.equal((await store.status("a")).pending,false);
});
test("invalid remote data, mismatched owner reviews and corrupt pending state cannot replace device links",async()=>{
 const {store,data}=fixture();await store.save("a",0,[link]);const review=await store.review("a",async()=>empty);
 await assert.rejects(store.adopt("b",review,async()=>empty));
 await assert.rejects(store.review("a",async()=>null));
 await assert.rejects(store.adopt("a",review,async()=>null));
 assert.deepEqual((await store.load("a")).links,[link]);
 const saved=data.get("a") as object;
 for(const cloudAttempt of [null,{key:"bad",expectedRevision:0,links:[link]},{key:"settlement-valid-key",expectedRevision:-1,links:[link]},{key:"settlement-valid-key",expectedRevision:0,links:[]}]){
  data.set("a",{...saved,cloudAttempt});await assert.rejects(store.status("a"));
 }
 data.set("a",{...saved,recovery:null});await assert.rejects(store.status("a"));
 data.set("b",{...saved,owner:"a"});await assert.rejects(store.load("b"));
});
test("storage failure before dispatch never sends, and cancellation after dispatch keeps the saved retry",async()=>{
 let value:unknown,fail=false,calls=0,current=true;
 const store=createSettlementStore({read:async()=>value,write:async(_o,next)=>{if(fail)throw Error("disk full");value=structuredClone(next);}});
 await store.save("a",0,[link]);const review=await store.review("a",async()=>empty);
 fail=true;await assert.rejects(store.publish("a",review,async()=>empty,async()=>{calls++;return empty;},()=>"settlement-key-5"));assert.equal(calls,0);
 fail=false;await assert.rejects(store.publish("a",review,async()=>empty,async()=>{current=false;return {...empty,revision:1,links:[link],appliedRevision:1};},()=>"settlement-key-6",()=>current));
 assert.equal((await store.status("a")).pending,true);
});
