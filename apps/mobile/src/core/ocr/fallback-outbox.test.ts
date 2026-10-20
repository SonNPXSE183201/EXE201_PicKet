import assert from "node:assert/strict";
import test from "node:test";
import { createFallbackOutbox, type FallbackIntent } from "./fallback-outbox";

const input = { owner: "owner-A", captureId: "11111111-1111-4111-8111-111111111111", imageRef: "file:///owned/image.enc", sha256: "a".repeat(64), extension: "jpg", localConfidence: 0.4 };
const job = { id: "job-1", storagePath: `${input.owner}/ocr/${input.captureId}.jpg`, status: "queued" };

function fixture() {
  const rows = new Map<string, FallbackIntent>();
  const events: string[] = [];
  const io = { read: async (owner: string, id: string) => rows.get(owner + ":" + id) ?? null,
    write: async (intent: FallbackIntent) => { rows.set(intent.owner + ":" + intent.captureId, structuredClone(intent)); } };
  const effects = { upload: async (intent: FallbackIntent) => { events.push("upload"); assert.equal(rows.get(intent.owner + ":" + intent.captureId)?.phase, "prepared"); },
    create: async (intent: FallbackIntent) => { events.push("create"); assert.equal(rows.get(intent.owner + ":" + intent.captureId)?.phase, "submitted"); return job; },
    get: async (intent: FallbackIntent) => { events.push("get"); assert.equal(intent.jobId, job.id); return job; } };
  return { rows, events, io, effects };
}

test("fallback consent is durable before upload and concurrent taps submit only once", async () => {
  const f = fixture(), outbox = createFallbackOutbox(f.io);
  const results = await Promise.all([outbox.run(input, f.effects), outbox.run(input, f.effects)]);
  assert.deepEqual(results, [job, job]);
  assert.deepEqual(f.events, ["upload", "create", "get"]);
});

test("a committed job with a lost response reuses its key without reuploading or deleting its image", async () => {
  const f = fixture(); let first = true;
  const effects = { ...f.effects, create: async (intent: FallbackIntent) => {
    await f.effects.create(intent); if (first) { first = false; throw Error("response lost"); } return job;
  } };
  await assert.rejects(createFallbackOutbox(f.io).run(input, effects), /response lost/);
  assert.equal(f.rows.get(input.owner + ":" + input.captureId)?.phase, "submitted");
  assert.deepEqual(await createFallbackOutbox(f.io).run({ ...input, localConfidence: 0.9 }, effects), job);
  assert.deepEqual(f.events, ["upload", "create", "create"]);
  assert.equal(f.rows.get(input.owner + ":" + input.captureId)?.localConfidence, 0.4);
});

test("restart resumes the exact recorded job, including an expired job without reupload", async () => {
  const f = fixture(); await createFallbackOutbox(f.io).run(input, f.effects);
  const expired = { ...job, status: "expired" };
  assert.deepEqual(await createFallbackOutbox(f.io).run(input, { ...f.effects, get: async () => expired }), expired);
  assert.deepEqual(f.events, ["upload", "create"]);
});

test("failed durable consent or submission marker never starts the next external mutation", async () => {
  const f = fixture();
  await assert.rejects(createFallbackOutbox({ ...f.io, write: async () => { throw Error("disk full"); } }).run(input, f.effects), /disk full/);
  assert.deepEqual(f.events, []);
  await assert.rejects(createFallbackOutbox({ ...f.io, write: async value => {
    if (value.phase === "submitted") throw Error("WAL failure"); await f.io.write(value);
  } }).run(input, f.effects), /WAL failure/);
  assert.deepEqual(f.events, ["upload"]);
});

test("owner/image/canonical digest mismatches fail closed before any mutation", async () => {
  const f = fixture(); await createFallbackOutbox(f.io).run(input, f.effects); f.events.length = 0;
  for (const change of [{ imageRef: "file:///different.enc" }, { sha256: "b".repeat(64) }, { extension: "png" }]) {
    await assert.rejects(createFallbackOutbox(f.io).run({ ...input, ...change }, f.effects), /identity mismatch/);
  }
  const foreign = f.rows.get(input.owner + ":" + input.captureId)!;
  await assert.rejects(createFallbackOutbox({ ...f.io, read: async () => ({ ...foreign, owner: "owner-B" }) }).run(input, f.effects), /identity mismatch/);
  assert.deepEqual(f.events, []);
});

test("a mismatched server job path is never persisted or applied", async () => {
  const f = fixture();
  await assert.rejects(createFallbackOutbox(f.io).run(input, { ...f.effects, create: async () => ({ ...job, storagePath: "other/ocr/image.jpg" }) }), /job identity mismatch/);
  assert.equal(f.rows.get(input.owner + ":" + input.captureId)?.jobId, null);
});

test("lost local acknowledgement after job ID persistence recovers through GET", async () => {
  const f = fixture(); let lost = true;
  const io = { ...f.io, write: async (intent: FallbackIntent) => {
    await f.io.write(intent); if (intent.jobId && lost) { lost = false; throw Error("local ack lost"); }
  } };
  await assert.rejects(createFallbackOutbox(io).run(input, f.effects), /local ack lost/);
  await createFallbackOutbox(io).run(input, f.effects);
  assert.deepEqual(f.events, ["upload", "create", "get"]);
});
