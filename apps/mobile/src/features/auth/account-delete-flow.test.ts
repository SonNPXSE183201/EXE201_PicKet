import assert from "node:assert/strict";
import {test} from "node:test";
import {deleteAccountWithLocalRetirement} from "./account-delete-flow";
import {createObservationStore} from "../cashflow/forecast-observation-store";
import {createOwnerCacheLifecycle} from "../../core/sync/owner-cache-lifecycle";

test("a lost deletion acknowledgement never reopens local data or permits a late write",async()=>{
 const retired=new Set<string>();const cache=createOwnerCacheLifecycle({isRetired:async owner=>retired.has(owner),retire:async owner=>{retired.add(owner);},resume:async owner=>{retired.delete(owner);}});
 const steps={retireLocal:()=>cache.retire("a"),deleteRemote:async()=>{throw Error("server deleted account but response was lost");},signOut:async()=>{},isCurrent:()=>true};
 assert.equal((await deleteAccountWithLocalRetirement(steps)).status,"remote-unconfirmed");
 assert.equal(await cache.isRetired("a"),true);
 await assert.rejects(cache.run("a",async()=>"late saved data"),/retired/);
});

test("a session change before the remote request leaves the original owner fenced until verified recovery",async()=>{
 let current=true,remote=0;const retired=new Set<string>();const cache=createOwnerCacheLifecycle({isRetired:async owner=>retired.has(owner),retire:async owner=>{retired.add(owner);},resume:async owner=>{retired.delete(owner);}});
 const steps={retireLocal:async()=>{await cache.retire("a");current=false;},deleteRemote:async()=>{remote++;},signOut:async()=>{},isCurrent:()=>current};
 assert.equal((await deleteAccountWithLocalRetirement(steps)).status,"session-changed");
 assert.equal(remote,0);assert.equal(await cache.isRetired("a"),true);
});

test("account deletion retires every generic cache resource before the server call and keeps it fenced after sign-out failure",async()=>{
 const retired=new Set<string>(),rows=new Map<string,string>([["a","all resource payloads"],["b","other owner"]]);
 const driver={isRetired:async(owner:string)=>retired.has(owner),retire:async(owner:string)=>{rows.delete(owner);retired.add(owner);},resume:async(owner:string)=>{retired.delete(owner);}};
 const cache=createOwnerCacheLifecycle(driver);
 const result=await deleteAccountWithLocalRetirement({retireLocal:()=>cache.retire("a"),deleteRemote:async()=>{assert.equal(rows.has("a"),false);assert.equal(retired.has("a"),true);},signOut:async()=>{throw Error("device sign-out failed");},isCurrent:()=>true});
 assert.deepEqual(result,{status:"deleted",signedOut:false});
 await assert.rejects(createOwnerCacheLifecycle(driver).run("a",async()=>rows.set("a","late response")),/retired/);
 assert.equal(rows.get("b"),"other owner");
});
test("local retirement precedes remote deletion and sign-out failure never reclassifies a confirmed deletion",async()=>{
 const order:string[]=[];
 const result=await deleteAccountWithLocalRetirement({retireLocal:async()=>{order.push("retire");},deleteRemote:async()=>{order.push("delete");},signOut:async()=>{order.push("signout");throw Error("storage");},isCurrent:()=>true});
 assert.deepEqual(order,["retire","delete","signout"]);assert.deepEqual(result,{status:"deleted",signedOut:false});
});
test("cleanup failure prevents remote deletion; uncertain remote outcome cannot claim success or reopen local use",async()=>{
 let remote=0;
 const base={retireLocal:async()=>{},deleteRemote:async()=>{remote++;throw Error("lost response");},signOut:async()=>{throw Error("must not sign out");},isCurrent:()=>true};
 assert.equal((await deleteAccountWithLocalRetirement({...base,retireLocal:async()=>{throw Error("disk full");}})).status,"local-cleanup-failed");assert.equal(remote,0);
 assert.equal((await deleteAccountWithLocalRetirement(base)).status,"remote-unconfirmed");assert.equal(remote,1);
});
test("a changed session never signs out a newly selected owner",async()=>{
 let current=true,signouts=0;
 const result=await deleteAccountWithLocalRetirement({retireLocal:async()=>{},deleteRemote:async()=>{current=false;},signOut:async()=>{signouts++;},isCurrent:()=>current});
 assert.deepEqual(result,{status:"deleted",signedOut:true});assert.equal(signouts,0);
});
test("retirement can erase corrupt local capture data and fences queued stale writes across a restart",async()=>{
 const data=new Map<string,unknown>([["a",{broken:true}]]);const source={read:async(o:string)=>structuredClone(data.get(o)),write:async(o:string,d:unknown)=>{data.set(o,structuredClone(d));},newId:()=>"case",now:()=>"2026-10-24T12:00:00Z"};
 const store=createObservationStore(source);await store.retireOwner("a");assert.deepEqual((await store.load("a")).cases,[]);
 const restarted=createObservationStore(source);await assert.rejects(restarted.clear("a",0));
 await restarted.resumeOwner("a");assert.equal((await restarted.load("a")).cases.length,0);
 assert.equal(data.has("b"),false);
});
test("retirement does not need to decrypt unreadable data and never sends remote deletion before a durable marker",async()=>{
 let value:unknown;
 const store=createObservationStore({read:async()=>{throw Error("unreadable cipher");},write:async(_owner,next)=>{value=next;},newId:()=>"case",now:()=>"2026-10-24T12:00:00Z"});
 await store.retireOwner("a");assert.deepEqual(value,{schemaVersion:1,owner:"a",revision:0,cases:[],retired:true});
});
test("queued writes from the previous owner generation cannot resurrect a retired collection",async()=>{
 let release:()=>void=()=>{},started:()=>void=()=>{},value:unknown;
 const reading=new Promise<void>(resolve=>{started=resolve;}),gate=new Promise<void>(resolve=>{release=resolve;});
 const store=createObservationStore({read:async()=>{started();await gate;return value;},write:async(_owner,next)=>{value=structuredClone(next);},newId:()=>"case",now:()=>"2026-10-24T12:00:00Z"});
 const stale=store.clear("a",0);await reading;const retirement=store.retireOwner("a");release();await assert.rejects(stale);await retirement;
 assert.equal((await store.load("a")).cases.length,0);await assert.rejects(store.clear("a",0));
});
test("retirement waits for an already-dispatched save and durably removes it before completion",async()=>{
 const at="2026-10-24T12:00:00Z",wallet="aaaaaaaa-1234-4321-8123-123456789010";let value:unknown,first=true,started:()=>void=()=>{},release:()=>void=()=>{};
 const writing=new Promise<void>(resolve=>{started=resolve;}),gate=new Promise<void>(resolve=>{release=resolve;});
 const source={read:async()=>structuredClone(value),write:async(_owner:string,next:unknown)=>{if(first){first=false;started();await gate;}value=structuredClone(next);},newId:()=>"case",now:()=>at};
 const store=createObservationStore(source);
 const input={snapshot:{asOf:at,wallets:[{id:wallet,name:"Cash",currencyCode:"VND",openingBalance:1,archived:false,deletedAt:null,updatedAt:at}],entries:[],confirmations:[]},accounts:[wallet],currency:"VND",days:7 as const,schedules:[],links:[],pendingCount:0};
 const capture=store.capture("a",input);await writing;const retired=store.retireOwner("a");release();await capture;await retired;
 assert.equal((await store.load("a")).cases.length,0);await assert.rejects(createObservationStore(source).capture("a",input));
});
test("successful deletion signs out once and a pre-request session change sends nothing",async()=>{
 let deletes=0,outs=0;
 const steps={retireLocal:async()=>{},deleteRemote:async()=>{deletes++;},signOut:async()=>{outs++;},isCurrent:()=>true};
 assert.deepEqual(await deleteAccountWithLocalRetirement(steps),{status:"deleted",signedOut:true});
 assert.equal((await deleteAccountWithLocalRetirement({...steps,isCurrent:()=>false})).status,"session-changed");assert.equal(deletes,1);assert.equal(outs,1);
});
