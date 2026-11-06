import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createCaptureJournal, restoreCaptureSnapshot, type CaptureSnapshot } from "./capture-journal";

const draft = { version: 1, id: "draft-one", imageRef: "file:///owned/image.enc", title: "Edited shop", amount: "123456", purchasedAt: "2026-10-19T12:00:00.000Z", explicitDate: "2026-10-19", attachReceipt: false, provider: "manual", localConfidence: 0, needsFallback: false, rawText: null, lineItems: [], fallbackStoragePath: null } as CaptureSnapshot;
function fixture() {
  const rows = new Map<string, CaptureSnapshot | null>();
  return { rows, journal: createCaptureJournal({ read: async owner => rows.get(owner) ?? null, write: async (owner, value) => { rows.set(owner, value); } }) };
}
test("capture edits survive a fresh journal and stay isolated by owner", async () => {
  const { rows, journal } = fixture();
  await journal.save("A", draft);
  const restart = createCaptureJournal({ read: async owner => rows.get(owner) ?? null, write: async () => undefined });
  assert.deepEqual(await restart.load("A"), draft);
  assert.equal(await restart.load("B"), null);
});
test("loads wait for queued saves, and later edits win", async () => {
  const { journal } = fixture();
  const first = journal.save("A", draft);
  const second = journal.save("A", { ...draft, amount: "45" });
  assert.equal((await journal.load("A"))?.amount, "45");
  await Promise.all([first, second]);
});
test("completing an old capture cannot clear a newer capture", async () => {
  const { journal } = fixture();
  await journal.save("A", { ...draft, id: "newer" });
  assert.equal(await journal.complete("A", draft.id), false);
  assert.equal((await journal.load("A"))?.id, "newer");
});
test("completed capture cannot be resurrected by a stale mounted screen", async () => {
  const { journal } = fixture();
  await journal.save("A", draft);
  assert.equal(await journal.complete("A", draft.id), true);
  assert.equal(await journal.save("A", draft), false);
  assert.equal(await journal.load("A"), null);
});
test("failed write preserves prior draft and does not poison following saves", async () => {
  let saved: CaptureSnapshot | null = draft;
  let fail = true;
  const journal = createCaptureJournal({ read: async () => saved, write: async (_owner, value) => { if (fail) throw Error("disk full"); saved = value; } });
  await assert.rejects(journal.save("A", { ...draft, amount: "9" }), /disk full/);
  assert.equal((await journal.load("A"))?.amount, draft.amount);
  fail = false;
  await journal.save("A", { ...draft, amount: "8" });
  assert.equal((await journal.load("A"))?.amount, "8");
});
test("malformed saved data fails visibly rather than becoming an empty replacement", async () => {
  const journal = createCaptureJournal({ read: async () => ({ version: 99 }), write: async () => undefined });
  await assert.rejects(journal.load("A"), /Invalid capture draft/);
});
test("capture autosave is owner-gated and completed transaction only clears its capture", () => {
  const capture = readFileSync(new URL("../../app/capture/index.tsx", import.meta.url), "utf8");
  assert.match(capture, /!hydrated \|\| !ownerId/);
  assert.match(capture, /persistCaptureImage/);
  assert.match(capture, /generation !== imageGeneration\.current/);
  assert.match(capture, /captureDraftId:/);
  const transaction = readFileSync(new URL("../../app/transactions/new.tsx", import.meta.url), "utf8");
  assert.match(transaction, /captureJournal\.complete/);
  assert.match(transaction, /params\.captureDraftId/);
});


test("photo recovery preserves all metadata and never writes on missing, corrupt or full-disk decode", async () => {
  for (const reason of ["missing", "corrupt", "disk full"]) {
    const restored = await restoreCaptureSnapshot("A", draft, async (owner, ref) => {
      assert.equal(owner, "A"); assert.equal(ref, draft.imageRef); throw new Error(reason);
    });
    assert.deepEqual(restored, { snapshot: draft, imageUri: null, imageUnavailable: true });
  }
  assert.deepEqual(await restoreCaptureSnapshot("A", draft, async () => "file:///decoded.jpg"), {
    snapshot: draft, imageUri: "file:///decoded.jpg", imageUnavailable: false,
  });
});
