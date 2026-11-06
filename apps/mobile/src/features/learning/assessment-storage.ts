import { readOfflineCache, writeOfflineCache } from "@/core/sync/offline-cache";
import { createAssessmentDraftStore } from "./assessment-draft";

export const assessmentDrafts = createAssessmentDraftStore({
  read: async owner => (await readOfflineCache(owner, "learning-assessment"))?.value,
  write: (owner, value) => writeOfflineCache(owner, "learning-assessment", value),
});
