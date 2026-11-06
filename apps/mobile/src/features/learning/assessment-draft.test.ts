import assert from "node:assert/strict";
import test from "node:test";
const modulePath = "./assessment-draft";

test("open assessment has a versioned synthetic case and five public criteria without generating a score", async () => {
  const { assessmentCase, assessmentCriteria, MAX_ASSESSMENT_ANSWER } = await import(modulePath);
  assert.equal(assessmentCase.reviewStatus, "draft");
  assert.equal(assessmentCase.version, 1); assert.equal(assessmentCase.rubricVersion, 1);
  assert.equal(assessmentCriteria.length, 5);
  assert.equal(new Set(assessmentCriteria.map((item: { id: string }) => item.id)).size, 5);
  assert.equal(assessmentCriteria.reduce((total: number, item: { maxPoints: number }) => total + item.maxPoints, 0), 100);
  assert.equal(MAX_ASSESSMENT_ANSWER, 4000);
});

test("assessment draft preserves exact free text across restart, serializes saves and isolates owners", async () => {
  const { createAssessmentDraftStore } = await import(modulePath);
  const rows = new Map<string, unknown>();
  const storage = { read: async (owner: string) => rows.get(owner), write: async (owner: string, value: unknown) => { rows.set(owner, value); } };
  const now = () => "2026-10-25T00:00:00.000Z";
  const store = createAssessmentDraftStore(storage, now);
  await Promise.all([store.save("owner-A", "First"), store.save("owner-A", "  Tiền dự phòng\nMy own reasoning  "), store.save("device-guest", "Guest")]);
  const draft = await createAssessmentDraftStore(storage, now).load("owner-A");
  assert.equal(draft.answer, "  Tiền dự phòng\nMy own reasoning  "); assert.equal(draft.updatedAt, now());
  assert.equal(draft.rubricVersion, 1); assert.equal(draft.scenarioVersion, 1); assert.equal("score" in draft, false);
  assert.equal(await store.load("owner-B"), null); assert.equal((await store.load("device-guest")).answer, "Guest");
  await store.clear("owner-A"); assert.equal(await store.load("owner-A"), null); assert.equal((await store.load("device-guest")).answer, "Guest");
});

test("invalid text/owners and corrupted or future drafts cannot silently overwrite existing work", async () => {
  const { createAssessmentDraftStore } = await import(modulePath);
  let row: unknown = { schemaVersion: 99 }; let writes = 0;
  const store = createAssessmentDraftStore({ read: async () => row, write: async (_owner: string, next: unknown) => { writes++; row = next; } });
  await assert.rejects(store.load("owner-A")); await assert.rejects(store.save("owner-A", "Replacement"));
  await assert.rejects(store.save("../other", "Invalid owner")); await assert.rejects(store.save("owner-A", "x".repeat(4001)));
  assert.equal(writes, 0);
  await store.clear("owner-A"); assert.equal(await store.load("owner-A"), null);
  await store.save("owner-A", "x".repeat(4000)); assert.equal((await store.load("owner-A")).answer.length, 4000);
  const stored = row as { draft: { rubricVersion: number; updatedAt: string } };
  stored.draft.rubricVersion = 99; await assert.rejects(store.load("owner-A"));
  stored.draft.rubricVersion = 1; stored.draft.updatedAt = "2026-02-31T00:00:00.000Z"; await assert.rejects(store.load("owner-A"));
});

test("a storage failure preserves the last saved answer and a later retry can succeed", async () => {
  const { createAssessmentDraftStore } = await import(modulePath);
  let row: unknown; let failing = false;
  const store = createAssessmentDraftStore({ read: async () => row, write: async (_owner: string, value: unknown) => { if (failing) throw Error("Synthetic disk failure"); row = value; } });
  await store.save("owner-A", "Saved"); failing = true;
  await assert.rejects(store.save("owner-A", "Unsaved")); assert.equal((await store.load("owner-A")).answer, "Saved");
  failing = false; await store.save("owner-A", "Retried"); assert.equal((await store.load("owner-A")).answer, "Retried");
});
