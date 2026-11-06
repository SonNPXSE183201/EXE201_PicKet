import assert from "node:assert/strict";
import { test } from "node:test";
import { submitPendingLearningAttempt, validateAttemptAcknowledgement } from "./cloud-sync";
test("unvalidated responses cannot acknowledge and discard a pending attempt",()=>{
  for (const value of [null,{}, {correct:4,total:3,awardedXp:20,replayed:false},{correct:2,total:3,awardedXp:999,replayed:false}]) assert.throws(()=>validateAttemptAcknowledgement(value,3));
});
test("submission sends stable key and answers without trusting device XP",async()=>{
 const row={key:"attempt_123",lessonId:"picket.vi.financial.v1.01",contentVersion:1,answers:[1,1,2]};
 const result=await submitPendingLearningAttempt(row,async(request,key)=>{
  assert.equal(key,row.key);assert.deepEqual(request,{lessonId:row.lessonId,contentVersion:1,answers:row.answers});
  return {correct:3,total:3,awardedXp:20,replayed:false};
 });
 assert.equal(result.awardedXp,20);
});
