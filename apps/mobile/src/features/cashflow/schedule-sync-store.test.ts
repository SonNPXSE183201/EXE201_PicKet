import assert from "node:assert/strict";
import { test } from "node:test";
import { createScheduleSyncStore } from "./schedule-sync-store";
const row={id:"44444444-1234-4321-8123-123456789011",startDay:"2026-10-24",frequency:"monthly" as const,amount:-19000,currency:"VND",active:true};
const empty={schemaVersion:1 as const,revision:0,schedules:[]};
test("offline schedule writes and request keys survive restart and failed transmission",async()=>{
  let value:unknown;let key=0;
  const storage={read:async()=>value,write:async(_:string,next:unknown)=>{value=next;}};
  const store=createScheduleSyncStore(storage,()=>`schedule-key-${++key}`);
  await store.save("ownerA",0,row);
  const keys:string[]=[];
  await assert.rejects(store.sync("ownerA",async()=>empty,async operation=>{keys.push(operation.key);throw new Error("offline");}));
  const restarted=createScheduleSyncStore(storage,()=>`schedule-key-${++key}`);
  let remote={...empty,schedules:[] as typeof row[],revision:0,appliedRevision:0};
  const result=await restarted.sync("ownerA",async()=>remote,async operation=>{
    keys.push(operation.key);remote={schemaVersion:1,revision:1,appliedRevision:1,schedules:[row]};return remote;
  });
  assert.equal(result.schedules.length,1);assert.equal(keys.length,2);assert.equal(keys[0],keys[1]);
});
test("local edits during a network request remain queued and preserve their expected revisions",async()=>{
  let value:unknown,key=0,remote={...empty,schedules:[] as typeof row[],appliedRevision:0};
  const store=createScheduleSyncStore({read:async()=>value,write:async(_,next)=>{value=next;}},()=>`schedule-key-${++key}`);
  await store.sync("ownerA",async()=>remote,async()=>{throw new Error("No pending operation");});
  await store.save("ownerA",0,row);
  let unblock:()=>void=()=>undefined,started:()=>void=()=>undefined;
  const waiting=new Promise<void>(resolve=>{unblock=resolve;});
  const start=new Promise<void>(resolve=>{started=resolve;});
  const revisions:number[]=[];
  const syncing=store.sync("ownerA",async()=>remote,async operation=>{
    revisions.push(operation.expectedRevision);
    if(revisions.length===1){started();await waiting;}
    remote={schemaVersion:1,revision:operation.expectedRevision+1,appliedRevision:operation.expectedRevision+1,schedules:[...remote.schedules,operation.schedule as typeof row]};
    return remote;
  });
  await start;
  assert.equal(store.sync("ownerA",async()=>remote,async()=>{throw new Error("Duplicate drain");}),syncing);
  await store.save("ownerA",1,{...row,id:"44444444-1234-4321-8123-123456789012"});
  unblock();
  assert.equal((await syncing).schedules.length,2);
  assert.deepEqual(revisions,[0,1]);
  assert.equal((await store.status("ownerA")).pending,0);
});
test("owners stay isolated and a failed local write cannot publish a pending change",async()=>{
  const values=new Map<string,unknown>();let fail=false,key=0;
  const store=createScheduleSyncStore({read:async owner=>values.get(owner),write:async(owner,next)=>{if(fail)throw new Error("disk full");values.set(owner,next);}},()=>`owner-key-${++key}`);
  await store.save("ownerA",0,row);
  assert.equal((await store.load("ownerB")).schedules.length,0);
  fail=true;
  await assert.rejects(store.remove("ownerA",1,row.id));
  assert.equal((await store.load("ownerA")).schedules.length,1);
  values.set("ownerB",{schemaVersion:2,revision:0,schedules:[]});
  await assert.rejects(store.save("ownerB",0,row));
  assert.equal((values.get("ownerB") as {schemaVersion:number}).schemaVersion,2);
});
test("bounded batches retain unfinished operations for the next resume",async()=>{
  let value:unknown,key=0;
  const store=createScheduleSyncStore({read:async()=>value,write:async(_,next)=>{value=next;}},()=>`batch-key-${++key}`);
  for(let index=0;index<51;index++)await store.save("ownerA",index,{...row,id:`batch-${index}`});
  let remote={...empty,schedules:[] as typeof row[],appliedRevision:0};
  const send=async(operation:Parameters<Parameters<typeof store.sync>[2]>[0])=>{
    remote={schemaVersion:1,revision:operation.expectedRevision+1,appliedRevision:operation.expectedRevision+1,schedules:[...remote.schedules,operation.schedule as typeof row]};return remote;
  };
  await store.sync("ownerA",async()=>remote,send);
  assert.equal((await store.status("ownerA")).pending,1);
  assert.equal((await store.load("ownerA")).schedules.length,51);
  await store.sync("ownerA",async()=>remote,send);
  assert.equal((await store.status("ownerA")).pending,0);
  assert.equal(remote.schedules.length,51);
});
test("cloud adoption, deletion and subscriptions keep storage authoritative",async()=>{
  let value:unknown,key=0,events=0;
  const store=createScheduleSyncStore({read:async()=>value,write:async(_,next)=>{value=next;}},()=>`adopt-key-${++key}`);
  const stop=store.subscribe("ownerA",()=>{events++;});
  const stopThrowing=store.subscribe("ownerA",()=>{throw new Error("UI callback");});
  let remote={schemaVersion:1 as const,revision:4,schedules:[row],appliedRevision:0};
  assert.equal((await store.sync("ownerA",async()=>remote,async()=>{throw new Error("Must not mutate pristine local state");})).revision,4);
  assert.equal(events,1);
  stop();stopThrowing();
  await store.remove("ownerA",4,row.id);
  await store.sync("ownerA",async()=>remote,async operation=>{
    assert.equal(operation.action,"remove");remote={schemaVersion:1,revision:5,schedules:[],appliedRevision:5};return remote;
  });
  assert.equal((await store.load("ownerA")).schedules.length,0);
  assert.equal(events,1);
  await assert.rejects(store.remove("ownerA",5,row.id));
});
test("an invalid acknowledgment or owner switch cannot discard a durable operation",async()=>{
  let value:unknown,key=0;
  const store=createScheduleSyncStore({read:async()=>value,write:async(_,next)=>{value=next;}},()=>`schedule-key-${++key}`);
  await store.save("ownerA",0,row);
  await assert.rejects(store.sync("ownerA",async()=>empty,async()=>({...empty,revision:3,appliedRevision:3})));
  assert.equal((await store.status("ownerA")).pending,1);
  let active=true;
  await assert.rejects(store.sync("ownerA",async()=>empty,async()=>{active=false;return{...empty,revision:1,appliedRevision:1,schedules:[row]};},()=>active));
  assert.equal((await store.status("ownerA")).pending,1);
  await assert.rejects(store.load("ownerB"));
});
test("different cloud schedules never overwrite unlinked local data",async()=>{
  let value:unknown;const store=createScheduleSyncStore({read:async()=>value,write:async(_,next)=>{value=next;}},()=>"schedule-stable-key");
  await store.save("ownerA",0,row);
  await assert.rejects(store.sync("ownerA",async()=>({...empty,revision:1,schedules:[{...row,amount:-49000}]}),async()=>{throw new Error("Must not send");}));
  assert.equal((await store.load("ownerA")).schedules[0].amount,-19000);
});
test("a replay acknowledged after another device changes the cloud advances the clean base revision",async()=>{
  let value:unknown,key=0;
  const store=createScheduleSyncStore({read:async()=>value,write:async(_,next)=>{value=next;}},()=>`replay-key-${++key}`);
  await store.save("ownerA",0,row);
  await assert.rejects(store.sync("ownerA",async()=>empty,async()=>{throw new Error("Response lost after commit");}));
  let remote={schemaVersion:1 as const,revision:3,appliedRevision:1,schedules:[row]};
  await store.sync("ownerA",async()=>remote,async()=>remote);
  await store.save("ownerA",3,{...row,amount:-49000});
  await store.sync("ownerA",async()=>remote,async operation=>{
    assert.equal(operation.expectedRevision,3);
    remote={schemaVersion:1,revision:4,appliedRevision:4,schedules:[{...row,amount:-49000}]};return remote;
  });
  assert.equal((await store.status("ownerA")).pending,0);
});

test("cloud adoption never rolls back local edit revisions",async()=>{
  let value:unknown={schemaVersion:1,revision:10,schedules:[row],owner:"ownerA",cloud:{baseRevision:2,pending:[]}};
  const store=createScheduleSyncStore({read:async()=>value,write:async(_,next)=>{value=next;}},()=>"revision-safe-key");
  const remote={schemaVersion:1 as const,revision:3,schedules:[{...row,amount:-49000}]};
  const result=await store.sync("ownerA",async()=>remote,async()=>{throw new Error("No pending changes");});
  assert.ok(result.revision>10,"old editor revisions must not become valid again");
  await assert.rejects(store.save("ownerA",3,row));
});

test("reviewed reconciliation keeps chosen rows and an encrypted-store recovery copy",async()=>{
  let value:unknown,key=0;
  const store=createScheduleSyncStore({read:async()=>value,write:async(_,next)=>{value=next;}},()=>`resolution-key-${++key}`);
  await store.save("ownerA",0,row);
  let remote={schemaVersion:1 as const,revision:4,schedules:[{...row,amount:-49000}]};
  const review=await store.reviewConflict("ownerA",async()=>remote);
  await store.resolveConflict("ownerA",review,{[row.id]:"cloud"},async()=>remote);
  assert.equal((await store.load("ownerA")).schedules[0].amount,-49000);
  assert.equal((await store.recovery("ownerA"))?.schedules[0].amount,-19000);
  const revision=(await store.load("ownerA")).revision;
  assert.ok(revision>1);
  await store.save("ownerA",revision,{...row,amount:-59000});
  await store.sync("ownerA",async()=>remote,async op=>{
    assert.equal(op.expectedRevision,4);
    remote={schemaVersion:1,revision:5,schedules:[op.schedule as typeof row]};return {...remote,appliedRevision:5};
  });
});

test("reconciliation rejects missing choices and changes since review",async()=>{
  let value:unknown,key=0;
  const store=createScheduleSyncStore({read:async()=>value,write:async(_,next)=>{value=next;}},()=>`resolution-key-${++key}`);
  await store.save("ownerA",0,row);
  const remote={schemaVersion:1 as const,revision:4,schedules:[{...row,amount:-49000}]};
  const review=await store.reviewConflict("ownerA",async()=>remote);
  await assert.rejects(store.resolveConflict("ownerA",review,{},async()=>remote));
  await assert.rejects(store.resolveConflict("ownerA",review,{[row.id]:"local"},async()=>({...remote,revision:5})));
  await store.save("ownerA",1,{...row,amount:-29000});
  await assert.rejects(store.resolveConflict("ownerA",review,{[row.id]:"local"},async()=>remote));
  assert.equal((await store.load("ownerA")).schedules[0].amount,-29000);
});

test("choosing local after a lost acknowledgment rebases new stable operations",async()=>{
  let value:unknown,key=0;
  const store=createScheduleSyncStore({read:async()=>value,write:async(_,next)=>{value=next;}},()=>`resolution-key-${++key}`);
  await store.save("ownerA",0,row);
  await assert.rejects(store.sync("ownerA",async()=>empty,async()=>{throw new Error("lost response");}));
  const remote={schemaVersion:1 as const,revision:4,schedules:[{...row,amount:-49000}]};
  const review=await store.reviewConflict("ownerA",async()=>remote);
  await store.resolveConflict("ownerA",review,{[row.id]:"local"},async()=>remote);
  await store.sync("ownerA",async()=>({...remote,revision:5,schedules:[row]}),async op=>{
    assert.equal(op.expectedRevision,4);
    assert.equal(op.action,"save");
    return {...remote,revision:5,appliedRevision:5,schedules:[row]};
  });
  assert.equal((await store.status("ownerA")).pending,0);
});
