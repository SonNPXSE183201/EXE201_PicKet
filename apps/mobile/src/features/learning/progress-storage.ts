import { readOfflineCache, writeOfflineCache } from "@/core/sync/offline-cache";
import { createLearningProgressStore, type LearningProgress } from "./progress";
import { createLearningDraftStore } from "./drafts";
import { createAttemptOutbox } from "./attempt-outbox";
import { createWeeklyPracticeStore } from "./weekly-store";
export const weeklyPractice = createWeeklyPracticeStore({
  read: async owner => (await readOfflineCache(owner,"learning-weekly"))?.value,
  write: (owner,value) => writeOfflineCache(owner,"learning-weekly",value),
});
export const learningAttempts = createAttemptOutbox({
  read: async owner => (await readOfflineCache(owner,"learning-attempts"))?.value,
  write: (owner,value) => writeOfflineCache(owner,"learning-attempts",value),
});
export const learningDrafts = createLearningDraftStore({
  read: async owner => (await readOfflineCache(owner,"learning-draft"))?.value,
  write: (owner,value) => writeOfflineCache(owner,"learning-draft",value),
});
export const learningProgress = createLearningProgressStore({
  read: async owner => (await readOfflineCache<LearningProgress>(owner,"learning-progress"))?.value,
  write: (owner,value) => writeOfflineCache(owner,"learning-progress",value),
});
