import type { LearningAttemptResult } from "@picket/domain";
import type { PendingLearningAttempt } from "./attempt-outbox";

export function validateAttemptAcknowledgement(value: unknown, questionCount: number): LearningAttemptResult {
  if (!value || typeof value !== "object") throw new Error("Invalid learning acknowledgement");
  const row=value as LearningAttemptResult;
  if (!Number.isInteger(row.correct) || row.correct<0 || row.correct>questionCount || row.total!==questionCount ||
      ![0,20].includes(row.awardedXp) || typeof row.replayed!=="boolean") throw new Error("Invalid learning acknowledgement");
  return row;
}

/** An acknowledgement is removed only after server validation; no client XP claim. */
export async function submitPendingLearningAttempt(
  row: PendingLearningAttempt,
  submit: (request: {lessonId:string;contentVersion:number;answers:number[]}, key:string)=>Promise<unknown>,
) {
  const result=await submit({lessonId:row.lessonId,contentVersion:row.contentVersion,answers:[...row.answers]},row.key);
  return validateAttemptAcknowledgement(result,row.answers.length);
}
