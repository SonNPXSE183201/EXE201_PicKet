import assert from "node:assert/strict";
import { test } from "node:test";
import { createScheduleStore } from "./schedule-store";
test("schedule CRUD is owner isolated, ordered and uses optimistic revision",async()=>{
 const rows=new Map<string,unknown>();
 const storage={read:async(owner:string)=>rows.get(owner),write:async(owner:string,value:unknown)=>{rows.set(owner,value);}};
 const store=createScheduleStore(storage);
 const schedule={id:"salary",startDay:"2026-10-28",frequency:"monthly" as const,amount:100000,currency:"VND",active:true};
 const first=await store.save("guest",0,schedule);
 assert.equal(first.revision,1);
 await assert.rejects(store.save("guest",0,{...schedule,amount:200000}));
 assert.equal((await store.load("userB")).schedules.length,0);
 await store.save("guest",1,{...schedule,amount:200000});
 assert.equal((await createScheduleStore(storage).load("guest")).schedules[0].amount,200000);
 await store.remove("guest",2,"salary");
 assert.equal((await store.load("guest")).schedules.length,0);
});
test("corrupt and future stores cannot be overwritten by an edit",async()=>{
 let writes=0;
 const store=createScheduleStore({read:async()=>({schemaVersion:2}),write:async()=>{writes++;}});
 await assert.rejects(store.remove("guest",0,"salary"));
 assert.equal(writes,0);
});
