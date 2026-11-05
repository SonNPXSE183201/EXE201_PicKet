import assert from "node:assert/strict";
import { test } from "node:test";
import { curriculum } from "./curriculum";
import { learningMilestones } from "./milestones";
test("milestones derive from unique owner progress without adding rewards",()=>{
  const completed=curriculum.lessons.slice(0,3).map(row=>({owner:"ownerA",lessonId:row.lessonId,version:row.version,xp:20,reviewedOffsets:[7]}));
  const practice=[{owner:"ownerA",action:"review-records" as const,weekStart:"2026-10-19",skipped:false,xp:10}];
  const result=learningMilestones("ownerA",[...completed,completed[0]], [...practice,practice[0]]);
  assert.equal(result.xp,70);
  assert.deepEqual(result.badges,["firstLesson","threeLessons","reviewedLesson","practicedWeek"]);
  assert.equal(learningMilestones("ownerB",completed,practice).xp,0);
});
test("skipping never requires spending and does not remove earned lesson milestones",()=>{
  const completed=curriculum.lessons.map(row=>({owner:"ownerA",lessonId:row.lessonId,version:row.version,xp:20}));
  const result=learningMilestones("ownerA",completed,[{owner:"ownerA",action:"review-records",weekStart:"2026-10-19",skipped:true,xp:0}]);
  assert.equal(result.xp,curriculum.lessons.length*20);assert.ok(result.badges.includes("allLessons"));assert.ok(!result.badges.includes("practicedWeek"));
});
