import { curriculum } from "./curriculum";
export type LearningDraft = { lessonId: string; version: number; answers: (number | null)[] };
type StoredDraft = { schemaVersion: 1; draft: LearningDraft | null };
function validateDraft(value: unknown): LearningDraft {
  if (!value || typeof value !== "object") throw new Error("Invalid learning draft");
  const draft = value as LearningDraft;
  const lesson = curriculum.lessons.find(row => row.lessonId === draft.lessonId && row.version === draft.version);
  if (!lesson || !Array.isArray(draft.answers) || draft.answers.length !== lesson.questions.length ||
      draft.answers.some((answer,i) => answer !== null && (!Number.isInteger(answer) || answer < 0 || answer >= lesson.questions[i].choices.length))) throw new Error("Invalid learning answers");
  return { lessonId: draft.lessonId, version: draft.version, answers: [...draft.answers] };
}
function parse(value: unknown): LearningDraft | null {
  if (value == null) return null;
  const stored = value as StoredDraft;
  if (stored.schemaVersion !== 1) throw new Error("Unsupported learning draft");
  return stored.draft === null ? null : validateDraft(stored.draft);
}
export function createLearningDraftStore(storage: { read(owner: string): Promise<unknown>; write(owner: string, value: StoredDraft): Promise<void> }) {
  const pending = new Map<string,Promise<void>>();
  const checkOwner = (owner: string) => { if (!/^[A-Za-z0-9_-]{1,200}$/.test(owner)) throw new Error("Invalid learning owner"); };
  async function load(owner: string) {
    checkOwner(owner); await pending.get(owner)?.catch(() => undefined);
    return parse(await storage.read(owner));
  }
  async function persist(owner: string, draft: LearningDraft | null, expected?: LearningDraft) {
    checkOwner(owner);
    const checked = draft === null ? null : validateDraft(draft);
    const snapshot = expected === undefined ? undefined : validateDraft(expected);
    const operation = (pending.get(owner) ?? Promise.resolve()).catch(() => undefined).then(async () => {
      const current = parse(await storage.read(owner));
      if (snapshot !== undefined && (!current || current.lessonId !== snapshot.lessonId || current.version !== snapshot.version ||
          current.answers.some((answer, index) => answer !== snapshot.answers[index]))) return;
      await storage.write(owner,{schemaVersion:1,draft:checked});
    });
    pending.set(owner,operation);
    try { await operation; } finally { if (pending.get(owner) === operation) pending.delete(owner); }
  }
  return { load, save: (owner: string, draft: LearningDraft) => persist(owner,draft), clear: (owner: string) => persist(owner,null),
    clearIfUnchanged: (owner: string, expected: LearningDraft) => persist(owner,null,expected) };
}
