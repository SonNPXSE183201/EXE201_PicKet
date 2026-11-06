export interface SubmitLearningAttempt {
  lessonId: string;
  contentVersion: number;
  answers: number[];
}
export interface LearningAttemptResult {
  correct: number;
  total: number;
  awardedXp: 0 | 20;
  replayed: boolean;
}
export interface CloudLearningProgress {
  lesson_id: string;
  content_version: number;
  xp: 20;
  completed_at: string;
}
export interface LearningProgressResponse { progress: CloudLearningProgress[] }
export interface CloudLearningReview { lessonId:string; contentVersion:number; offset:7|30 }
export interface CloudWeeklyPractice { weekStart:string; skipped:boolean }
export type LearningActivityEvent = ({kind:"review"}&CloudLearningReview)|({kind:"practice"}&CloudWeeklyPractice);
export interface LearningActivityDocument { reviews:CloudLearningReview[]; practice:CloudWeeklyPractice[] }
