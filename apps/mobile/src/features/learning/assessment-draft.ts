export const MAX_ASSESSMENT_ANSWER = 4000;
export const assessmentCase = {
  id: "reserve-choice-v1", version: 1, rubricVersion: 1, reviewStatus: "draft",
  currency: "VND", available: 5_000_000, rent: 3_000_000, utilities: 500_000,
  reserve: 1_000_000, purchase: 2_000_000, nextIncomeDays: 7,
} as const;
export const assessmentCriteria = [
  { id: "obligations", maxPoints: 20 }, { id: "risk", maxPoints: 20 },
  { id: "alternatives", maxPoints: 20 }, { id: "reserve", maxPoints: 20 },
  { id: "reasoning", maxPoints: 20 },
] as const;
export type AssessmentDraft = { scenarioId: string; scenarioVersion: number; rubricVersion: number; answer: string; updatedAt: string };
type StoredDraft = { schemaVersion: 1; draft: AssessmentDraft | null };

function parse(value: unknown): AssessmentDraft | null {
  if (value == null) return null;
  if (typeof value !== "object" || Array.isArray(value)) throw Error("Invalid assessment draft");
  const stored = value as StoredDraft;
  if (stored.schemaVersion !== 1) throw Error("Unsupported assessment draft");
  if (stored.draft === null) return null;
  const draft = stored.draft;
  if (!draft || typeof draft !== "object" || draft.scenarioId !== assessmentCase.id ||
      draft.scenarioVersion !== assessmentCase.version || draft.rubricVersion !== assessmentCase.rubricVersion ||
      typeof draft.answer !== "string" || draft.answer.length > MAX_ASSESSMENT_ANSWER ||
      typeof draft.updatedAt !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(draft.updatedAt) ||
      !Number.isFinite(Date.parse(draft.updatedAt)) || new Date(draft.updatedAt).toISOString() !== draft.updatedAt) throw Error("Invalid assessment draft");
  return { scenarioId: draft.scenarioId, scenarioVersion: draft.scenarioVersion, rubricVersion: draft.rubricVersion, answer: draft.answer, updatedAt: draft.updatedAt };
}

export function createAssessmentDraftStore(storage: { read(owner: string): Promise<unknown>; write(owner: string, value: StoredDraft): Promise<void> }, now = () => new Date().toISOString()) {
  const pending = new Map<string, Promise<void>>();
  const checkOwner = (owner: string) => { if (!/^[A-Za-z0-9_-]{1,200}$/.test(owner)) throw Error("Invalid assessment owner"); };
  async function persist(owner: string, value: StoredDraft, checkExisting: boolean) {
    checkOwner(owner);
    const operation = (pending.get(owner) ?? Promise.resolve()).catch(() => undefined).then(async () => {
      if (checkExisting) parse(await storage.read(owner));
      await storage.write(owner, value);
    });
    pending.set(owner, operation);
    try { await operation; } finally { if (pending.get(owner) === operation) pending.delete(owner); }
  }
  return {
    async load(owner: string) { checkOwner(owner); await pending.get(owner)?.catch(() => undefined); return parse(await storage.read(owner)); },
    async save(owner: string, answer: string) {
      const value: StoredDraft = { schemaVersion: 1, draft: { scenarioId: assessmentCase.id, scenarioVersion: assessmentCase.version, rubricVersion: assessmentCase.rubricVersion, answer, updatedAt: now() } };
      parse(value);
      await persist(owner, value, true);
    },
    // Only explicit deletion may replace an unreadable/future draft.
    clear: (owner: string) => persist(owner, { schemaVersion: 1, draft: null }, false),
  };
}
