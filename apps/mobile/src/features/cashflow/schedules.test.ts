import assert from "node:assert/strict";
import { test } from "node:test";
import { expandSchedules } from "./schedules";
test("monthly dates clamp independently in February and return to original anchor",()=>{
 const rows=expandSchedules([{id:"rent",startDay:"2028-01-31",frequency:"monthly",amount:-100,currency:"VND",active:true}],"2028-01-01","2028-03-31");
 assert.deepEqual(rows.map(r=>r.day),["2028-01-31","2028-02-29","2028-03-31"]);
 assert.equal(rows[1].id,"rent:2028-02-29");
});
test("weekly, once, end day and settlement identity remain explicit",()=>{
 const rows=expandSchedules([{id:"salary",startDay:"2026-10-01",endDay:"2026-10-15",frequency:"weekly",amount:100,currency:"VND",active:true},{id:"gift",startDay:"2026-10-10",frequency:"once",amount:40,currency:"VND",active:true}],"2026-10-08","2026-10-31",["salary:2026-10-08"]);
 assert.deepEqual(rows.map(r=>[r.id,r.settled]),[["salary:2026-10-08",true],["gift:2026-10-10",false],["salary:2026-10-15",false]]);
});
test("invalid and excessive schedule scopes fail before generating output",()=>{
 const row={id:"a",startDay:"2026-01-01",frequency:"monthly" as const,amount:1,currency:"VND",active:true};
 assert.throws(()=>expandSchedules([row,row],"2026-01-01","2026-02-01"));
 assert.throws(()=>expandSchedules([row],"2026-02-30","2026-03-01"));
 assert.throws(()=>expandSchedules([{...row,frequency:"daily" as never}],"2026-01-01","2026-02-01"));
 assert.throws(()=>expandSchedules([row],"2026-01-01","2030-01-01"));
});
