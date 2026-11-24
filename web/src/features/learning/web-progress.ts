/**
 * Browser-local record of lessons finished on the web. The web workspace has
 * no learning sync yet (cloud grading is still gated), so this only drives
 * path states in this browser and never claims XP. Import-free so web tests
 * can load it with Node type stripping.
 */
export const WEB_LEARNING_STORAGE_KEY = "picket.learning.web.v1";
export const learningEnabled = process.env.NEXT_PUBLIC_LEARNING_ENABLED === "true" || process.env.NODE_ENV !== "production";

/** Parses stored data, keeping only ids of lessons that still exist. Corrupt data reads as empty. */
export function parseWebLearningProgress(raw: string | null, knownIds: ReadonlySet<string>): string[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw) as { version?: unknown; completed?: unknown };
    if (value?.version !== 1 || !Array.isArray(value.completed)) return [];
    return [...new Set(value.completed.filter((id): id is string => typeof id === "string" && knownIds.has(id)))];
  } catch {
    return [];
  }
}

export function serializeWebLearningProgress(completed: readonly string[]): string {
  return JSON.stringify({ version: 1, completed: [...new Set(completed)] });
}

export function readWebLearningProgress(knownIds: ReadonlySet<string>): string[] {
  try {
    return parseWebLearningProgress(window.localStorage.getItem(WEB_LEARNING_STORAGE_KEY), knownIds);
  } catch {
    return [];
  }
}

export function markWebLessonDone(lessonId: string, knownIds: ReadonlySet<string>): string[] {
  const next = [...readWebLearningProgress(knownIds), lessonId];
  try {
    window.localStorage.setItem(WEB_LEARNING_STORAGE_KEY, serializeWebLearningProgress(next));
  } catch {
    /* Private mode or blocked storage: the lesson still finishes. */
  }
  return [...new Set(next)];
}
