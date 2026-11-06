export type LearningAiStatement = "timing" | "buffer" | "incomplete-records";
export type LearningAiStatus = "queued" | "claimed" | "dispatched" | "completed" | "failed" | "cancelled" | "expired";
export interface LearningAiConsent { accepted: boolean; generation: number; policyVersion: 1 }
export interface LearningAiRequest { scenarioId: "cash-gap-v1"; locale: "vi" | "en" }
export interface LearningAiQueuedJob { id: string; status: LearningAiStatus }
export interface LearningAiJob extends LearningAiQueuedJob { statementIds: LearningAiStatement[] }
