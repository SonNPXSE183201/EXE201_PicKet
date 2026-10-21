import assert from "node:assert/strict";
import test from "node:test";
import { isKeepsakeReplayConfirmed, keepsakePhotoPath, persistKeepsakeReplay, sameKeepsakeOutbox, saveWithKeepsakePhoto, saveDurableKeepsake, KeepsakePendingError, withKeepsakeOwnerLock, canCleanupKeepsakePhoto, keepsakeCacheFileName, commitKeepsakePhotoDownload } from "./keepsake-media-policy";

test("a successful download move must not delete the file handle now pointing at the committed image", async () => {
  let pointer = "temporary";
  assert.equal(await commitKeepsakePhotoDownload({
    download: async () => undefined,
    commit: () => { pointer = "committed"; return pointer; },
    discard: () => { assert.fail(`must not delete ${pointer}`); },
  }), "committed");
});
test("partial download is discarded on failure without masking the original exception", async () => {
  let discarded = false;
  await assert.rejects(commitKeepsakePhotoDownload({
    download: async () => { throw new Error("download interrupted"); },
    commit: () => assert.fail("must not publish partial image"),
    discard: () => { discarded = true; throw new Error("cleanup failed"); },
  }), /download interrupted/);
  assert.equal(discarded, true);
});

test("cache image identity includes the remote path so a failed replacement download cannot reuse the old image", () => {
  assert.equal(keepsakeCacheFileName("item", "a/old.jpg"), keepsakeCacheFileName("item", "a/old.jpg"));
  assert.notEqual(keepsakeCacheFileName("item", "a/old.jpg"), keepsakeCacheFileName("item", "a/new.jpg"));
  assert.throws(() => keepsakeCacheFileName("../item", "a/old.jpg"));
});

test("cleanup journal requires a fresh matching replacement and no remote/pending references", () => {
  const task = { itemId: "item", obsoletePath: "a/keepsakes/old.jpg", replacementPath: "a/keepsakes/new.jpg" };
  const fresh = [{ id: "item", mediaPath: task.replacementPath }];
  assert.equal(canCleanupKeepsakePhoto("a", task, fresh, []), true);
  assert.equal(canCleanupKeepsakePhoto("a", task, [], []), false);
  assert.equal(canCleanupKeepsakePhoto("b", task, fresh, []), false);
  assert.equal(canCleanupKeepsakePhoto("a", task, [{ id: "item", mediaPath: task.obsoletePath }], []), false);
  assert.equal(canCleanupKeepsakePhoto("a", task, fresh, [{ mediaPath: task.obsoletePath }]), false);
  assert.equal(canCleanupKeepsakePhoto("a", task, [...fresh, { id: "other", mediaPath: task.obsoletePath }], []), false);
  assert.equal(canCleanupKeepsakePhoto("a", { ...task, obsoletePath: task.replacementPath }, fresh, []), false);
  assert.equal(canCleanupKeepsakePhoto("a", { ...task, obsoletePath: "a/keepsakes/../secret" }, fresh, []), false);
});

test("write-ahead save persists the owned photo and payload before any network side effect", async () => {
  const events: string[] = [];
  assert.equal(await saveDurableKeepsake({
    persist: async () => { events.push("durable"); return "file:///owned.jpg"; },
    send: async pending => { events.push(pending); return "remote"; },
    cache: async saved => { events.push(`cache:${saved}`); },
    acknowledge: async pending => { events.push(`ack:${pending}`); return true; },
  }), "remote");
  assert.deepEqual(events, ["durable", "file:///owned.jpg", "cache:remote", "ack:file:///owned.jpg"]);
});

test("disk-full while persisting intent prevents upload/API and cannot claim a queued save", async () => {
  await assert.rejects(saveDurableKeepsake({
    persist: async () => { throw new Error("disk full"); },
    send: async () => assert.fail("network before durable intent"),
    cache: async () => assert.fail("no confirmed row"),
    acknowledge: async () => assert.fail("must preserve data"),
  }), error => error instanceof Error && !(error instanceof KeepsakePendingError) && error.message === "disk full");
});

test("stopping while network is pending already leaves a recoverable write-ahead intent", async () => {
  let durable: string | null = null;
  let release!: () => void;
  const blocked = new Promise<void>(resolve => { release = resolve; });
  const saving = saveDurableKeepsake({
    persist: async () => { durable = "payload+photo"; return durable; },
    send: async () => { await blocked; throw new Error("lost response"); },
    cache: async () => assert.fail("no acknowledgement"),
    acknowledge: async () => assert.fail("no acknowledgement"),
  });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(durable, "payload+photo");
  release();
  await assert.rejects(saving, error => error instanceof KeepsakePendingError);
  assert.equal(durable, "payload+photo");
});

test("cache failure after commit retains intent and reports pending rather than an unpersisted failure", async () => {
  let acknowledged = false;
  await assert.rejects(saveDurableKeepsake({
    persist: async () => "pending",
    send: async () => "committed",
    cache: async () => { throw new Error("disk full"); },
    acknowledge: async () => { acknowledged = true; return true; },
  }), error => error instanceof KeepsakePendingError);
  assert.equal(acknowledged, false);
});

test("owner lock serializes save/replay, releases after failure, and does not block another owner", async () => {
  const events: string[] = [];
  let release!: () => void;
  const blocked = new Promise<void>(resolve => { release = resolve; });
  const first = withKeepsakeOwnerLock("a", async () => { events.push("a1"); await blocked; throw new Error("offline"); });
  const rejected = assert.rejects(first, /offline/);
  const second = withKeepsakeOwnerLock("a", async () => { events.push("a2"); });
  await withKeepsakeOwnerLock("b", async () => { events.push("b"); });
  assert.deepEqual(events, ["a1", "b"]);
  release();
  await Promise.all([rejected, second]);
  assert.deepEqual(events, ["a1", "b", "a2"]);
});

test("photo retry uses one owner/item/content path regardless of local URI", () => {
  const bytes = new Uint8Array([1, 2, 3]);
  const path = keepsakePhotoPath("owner-a", "item-a", bytes, "jpg");
  assert.equal(path, keepsakePhotoPath("owner-a", "item-a", bytes.slice(), "jpg"));
  assert.notEqual(path, keepsakePhotoPath("owner-b", "item-a", bytes, "jpg"));
  assert.notEqual(path, keepsakePhotoPath("owner-a", "item-b", bytes, "jpg"));
  assert.notEqual(path, keepsakePhotoPath("owner-a", "item-a", new Uint8Array([4]), "jpg"));
  assert.throws(() => keepsakePhotoPath("../b", "item", bytes, "jpg"));
});

test("lost mutation response must not delete an image possibly referenced by the server", async () => {
  const objects = new Set<string>();
  let committed: string | null = null;
  const lost = new Error("response lost after commit");
  await assert.rejects(saveWithKeepsakePhoto({
    previousPath: "old.jpg",
    upload: async () => { objects.add("new.jpg"); return "new.jpg"; },
    mutate: async path => { committed = path; throw lost; },
    remove: async path => { objects.delete(path); },
  }), error => error === lost);
  assert.equal(committed, "new.jpg");
  assert.equal(objects.has("new.jpg"), true);
});

test("confirmed save cleans only the replaced old photo; cleanup failure is not a save failure", async () => {
  const events: string[] = [];
  const result = await saveWithKeepsakePhoto({
    previousPath: "old.jpg",
    upload: async () => { events.push("upload"); return "new.jpg"; },
    mutate: async path => { events.push(`commit:${path}`); return "saved"; },
    remove: async path => { events.push(`remove:${path}`); throw new Error("cleanup offline"); },
  });
  assert.equal(result, "saved");
  assert.deepEqual(events, ["upload", "commit:new.jpg", "remove:old.jpg"]);
});

test("metadata edits retain the existing photo and never remove it", async () => {
  assert.equal(await saveWithKeepsakePhoto({
    previousPath: "same.jpg", upload: async () => null,
    mutate: async path => path,
    remove: async () => { assert.fail("must not remove"); },
  }), "same.jpg");
});

test("upload failure never mutates or removes photos", async () => {
  await assert.rejects(saveWithKeepsakePhoto({
    previousPath: null, upload: async () => { throw new Error("upload failed"); },
    mutate: async () => assert.fail("must not mutate"),
    remove: async () => assert.fail("must not remove"),
  }), /upload failed/);
});

test("lost response can be acknowledged only by identical fresh owner-scoped server content", () => {
  const pending = { id: "item", userId: "a", title: "photo", amount: 10, date: "2026-10-19T00:00:00Z", note: "", photoUri: null, category: "Other", warrantyUntil: null, returnUntil: null, version: 1 };
  const remote = { ...pending, date: "2026-10-19T00:00:00.000Z", version: 2, mediaPath: "new.jpg" };
  assert.equal(isKeepsakeReplayConfirmed(pending, remote, "new.jpg"), true);
  assert.equal(isKeepsakeReplayConfirmed(pending, { ...remote, userId: "b" }, "new.jpg"), false);
  assert.equal(isKeepsakeReplayConfirmed(pending, { ...remote, title: "other-device" }, "new.jpg"), false);
  assert.equal(isKeepsakeReplayConfirmed(pending, { ...remote, version: 1 }, "new.jpg"), false);
  assert.equal(isKeepsakeReplayConfirmed(pending, remote, "different-photo.jpg"), false);
  assert.equal(isKeepsakeReplayConfirmed({ ...pending, version: undefined }, { ...remote, version: 1 }, "new.jpg"), true);
  for (const changed of [{ id: "other" }, { amount: 11 }, { date: "invalid" }, { note: "changed" }, { category: "changed" }, { warrantyUntil: "2027-01-01" }, { returnUntil: "2027-01-01" }, { version: undefined }]) {
    assert.equal(isKeepsakeReplayConfirmed(pending, { ...remote, ...changed }, "new.jpg"), false);
  }
});

test("restart after a lost create acknowledgement reuses one object and acknowledges one server row", async () => {
  const pending = { id: "durable-id", userId: "owner-a", title: "Retry photo", amount: 10, date: "2026-10-19T00:00:00Z", note: "", photoUri: "file:///pending.jpg", category: "Other", warrantyUntil: null, returnUntil: null };
  const objects = new Set<string>();
  const rows: (typeof pending & { version: number; mediaPath: string | null })[] = [];
  const bytes = new Uint8Array([1, 2, 3]);
  const upload = async () => {
    const path = keepsakePhotoPath(pending.userId, pending.id, bytes, "jpg");
    objects.add(path); // The production adapter upserts this same path.
    return path;
  };
  await assert.rejects(saveWithKeepsakePhoto({
    upload, previousPath: null,
    mutate: async path => { rows.push({ ...pending, version: 1, mediaPath: path }); throw new Error("lost response"); },
    remove: async path => { objects.delete(path); },
  }), /lost response/);
  // Only the durable pending payload survives the simulated new JS process.
  const restarted = JSON.parse(JSON.stringify(pending));
  const retriedPath = await upload();
  assert.equal(isKeepsakeReplayConfirmed(restarted, rows[0], retriedPath), true);
  assert.equal(objects.size, 1);
  assert.equal(rows.length, 1);
});

test("failed cache persistence never acknowledges the durable outbox", async () => {
  let acknowledged = false;
  await assert.rejects(persistKeepsakeReplay({
    persist: async () => { throw new Error("disk full"); },
    acknowledge: async () => { acknowledged = true; return true; },
  }), /disk full/);
  assert.equal(acknowledged, false);
});

test("cache commits before acknowledgement; failed acknowledgement remains retryable", async () => {
  const events: string[] = [];
  await assert.rejects(persistKeepsakeReplay({
    persist: async () => { events.push("cache committed"); },
    acknowledge: async () => { events.push("ack"); throw new Error("SQLite busy"); },
  }), /SQLite busy/);
  assert.deepEqual(events, ["cache committed", "ack"]);
  assert.equal(await persistKeepsakeReplay({ persist: async () => undefined, acknowledge: async () => false }), false);
});

test("a replay acknowledgement cannot match another owner, newer edit, or replacement photo intent", () => {
  const row = { id: "id", userId: "a", title: "title", amount: 0, date: "2026-10-20", note: "", photoUri: "file:///pending.jpg", category: "Other", warrantyUntil: null, returnUntil: null, version: 1, mediaPath: "a/old.jpg", photoUploadRequired: true };
  assert.equal(sameKeepsakeOutbox(row, { ...row }), true);
  assert.equal(sameKeepsakeOutbox(row, null), false);
  for (const change of [{ id: "other" }, { userId: "b" }, { title: "new" }, { amount: 1 }, { date: "2026-10-21" }, { note: "new" }, { photoUri: "file:///new.jpg" }, { category: "new" }, { warrantyUntil: "2027-01-01" }, { returnUntil: "2026-12-01" }, { version: 2 }, { mediaPath: "a/new.jpg" }, { photoUploadRequired: false }, { photoUploadRequired: undefined }]) {
    assert.equal(sameKeepsakeOutbox(row, { ...row, ...change }), false);
  }
});
