import assert from "node:assert/strict";
import test from "node:test";

import { mergeKeepsakeOutbox, nextKeepsakePhotoUploadRequired, planKeepsakePhotoReplay, planKeepsakeReplay, shouldQueueKeepsakeFailure } from "./keepsake-outbox-policy";

const remote = { id: "same", title: "cloud", version: 2 };
const pending = { id: "same", title: "offline edit", version: 2 };

test("metadata-only edits preserve the remote image without uploading its cached copy", () => {
  assert.deepEqual(planKeepsakePhotoReplay({ photoUri: "file:///cloud-cache/a.jpg", mediaPath: "owner/keepsakes/a.jpg", photoUploadRequired: false }), { uploadUri: null, mediaPath: "owner/keepsakes/a.jpg" });
});

test("a newly picked photo remains pending across a later metadata-only edit", () => {
  assert.equal(nextKeepsakePhotoUploadRequired({ photoUri: "file:///old.jpg", photoUploadRequired: false, pickedPhotoUri: "file:///new.jpg" }), true);
  assert.equal(nextKeepsakePhotoUploadRequired({ photoUri: "file:///new.jpg", photoUploadRequired: true }), true);
  assert.deepEqual(planKeepsakePhotoReplay({ photoUri: "file:///new.jpg", mediaPath: "owner/old.jpg", photoUploadRequired: true }), { uploadUri: "file:///new.jpg", mediaPath: "owner/old.jpg" });
});

test("new or legacy photo rows are not silently discarded when intent is unknown", () => {
  assert.equal(nextKeepsakePhotoUploadRequired({ photoUri: "file:///legacy.jpg" }), true);
  assert.equal(nextKeepsakePhotoUploadRequired({ photoUri: null }), false);
  assert.equal(nextKeepsakePhotoUploadRequired({ photoUri: "file:///cache.jpg", photoUploadRequired: false }), false);
  assert.equal(planKeepsakePhotoReplay({ photoUri: "file:///legacy.jpg" }).uploadUri, "file:///legacy.jpg");
});

test("items without a photo retain null media; a missing pending photo fails rather than losing it", () => {
  assert.deepEqual(planKeepsakePhotoReplay({ photoUri: null, photoUploadRequired: false }), { uploadUri: null, mediaPath: null });
  assert.throws(() => planKeepsakePhotoReplay({ photoUri: null, photoUploadRequired: true }), /pending photo/i);
});

test("a pending offline edit overrides the cached cloud row", () => {
  assert.deepEqual(mergeKeepsakeOutbox([remote], [pending]), [pending]);
});

test("a pending offline create is appended without hiding cloud rows", () => {
  const created = { id: "new", title: "offline create" };
  assert.deepEqual(mergeKeepsakeOutbox([remote], [created]), [remote, created]);
});

test("replay updates rows carrying a remote version and creates new rows", () => {
  assert.deepEqual(planKeepsakeReplay(pending), { action: "update", expectedVersion: 2 });
  assert.deepEqual(planKeepsakeReplay({}), { action: "create" });
});

test("queues connectivity failures but surfaces authoritative API rejections", () => {
  assert.equal(shouldQueueKeepsakeFailure(0), true);
  assert.equal(shouldQueueKeepsakeFailure(undefined), true);
  assert.equal(shouldQueueKeepsakeFailure(400), false);
  assert.equal(shouldQueueKeepsakeFailure(409), false);
});
