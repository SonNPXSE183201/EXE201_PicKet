import assert from "node:assert/strict";
import { test } from "node:test";
import { completeWeeklyPractice, weekStartForDay } from "./practice";
test("skipping a practice allows returning later without duplicate reward",()=>{
 const identity={owner:"guest",weekStart:"2026-10-19",action:"review-records" as const};
 const skipped=completeWeeklyPractice([],identity,true);
 const complete=completeWeeklyPractice(skipped,identity,false);
 assert.equal(complete.length,1);assert.equal(complete[0].xp,10);assert.equal(complete[0].skipped,false);
 assert.deepEqual(completeWeeklyPractice(complete,identity,true),complete);
});
test("weekly challenge anchor remains a Monday over a year boundary",()=>{
 assert.equal(weekStartForDay("2027-01-01"),"2026-12-28");
 assert.equal(weekStartForDay("2027-01-04"),"2027-01-04");
});
