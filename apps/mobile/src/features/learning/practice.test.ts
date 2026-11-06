import assert from "node:assert/strict";
import { test } from "node:test";
import { classifyNeedWant, reviewDueDays, completeWeeklyPractice } from "./practice";
test("needs and wants use scenario context rather than moral labels",()=>{
 assert.equal(classifyNeedWant("medicine","need").accepted,true);
 assert.equal(classifyNeedWant("commute","depends").accepted,true);
 assert.equal(classifyNeedWant("commute","need").accepted,true);
 assert.equal(classifyNeedWant("upgrade","want").accepted,true);
 assert.equal(classifyNeedWant("upgrade","need").accepted,false);
 assert.throws(()=>classifyNeedWant("unknown","need"));
});
test("reviews use date-only 7 and 30 day intervals across year end",()=>{
 assert.deepEqual(reviewDueDays("2026-12-28"),["2027-01-04","2027-01-27"]);
 assert.throws(()=>reviewDueDays("2026-02-30"));
});
test("weekly practice can be skipped and replay does not grant XP twice",()=>{
 const event={owner:"guest",weekStart:"2026-10-19",action:"review-records" as const};
 const skipped=completeWeeklyPractice([],event,true);
 assert.equal(skipped[0].xp,0);
 const done=completeWeeklyPractice([],event,false);
 assert.equal(done[0].xp,10);
 assert.deepEqual(completeWeeklyPractice(done,event,false),done);
 assert.throws(()=>completeWeeklyPractice([], {...event,weekStart:"2026-10-20"},false));
});
