import assert from "node:assert/strict";
import { test } from "node:test";
import { createSettlementStore } from "./settlement-store";
const link={occurrenceId:"schedule:2026-10-24",day:"2026-10-24",amount:-19000,currency:"VND",transactionId:"tx",transactionUpdatedAt:"2026-10-24T12:00:00Z"};
test("settlements persist per owner, serialize edits and reject stale or corrupt writes",async()=>{
 const data=new Map<string,unknown>();
 const store=createSettlementStore({read:async owner=>structuredClone(data.get(owner)),write:async(owner,value)=>{data.set(owner,structuredClone(value));}});
 assert.deepEqual((await store.load("a")).links,[]);
 await store.save("a",0,[link]);
 assert.deepEqual((await store.load("a")).links,[link]);assert.deepEqual((await store.load("b")).links,[]);
 const edits=await Promise.allSettled([store.save("a",1,[]),store.save("a",1,[link])]);
 assert.equal(edits.filter(row=>row.status==="fulfilled").length,1);
 await assert.rejects(store.save("a",2,[link,link]));
 await assert.rejects(store.save("a",2,[{...link,amount:NaN}]));
 await assert.rejects(store.save("a",2,[{...link,day:"2026-02-30"}]));
 assert.equal((await store.load("a")).revision,2);
 data.set("broken",{schemaVersion:1,revision:0,links:[{}]});
 await assert.rejects(store.load("broken"));
 await assert.rejects(store.load(""));
});
test("failed persistence does not acknowledge a save and the owner queue recovers",async()=>{
 let data:unknown=null,fail=true;
 const store=createSettlementStore({read:async()=>data,write:async(_owner,value)=>{if(fail)throw new Error("Disk full");data=value;}});
 await assert.rejects(store.save("owner",0,[link]));
 assert.equal((await store.load("owner")).revision,0);
 fail=false;await store.save("owner",0,[link]);
 assert.equal((await store.load("owner")).revision,1);
});
