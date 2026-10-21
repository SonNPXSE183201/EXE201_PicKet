import assert from "node:assert/strict";
import test from "node:test";
import { restoreWithUploadedMedia } from "./restore-media-policy";

test("lost restore response cannot delete media possibly referenced by committed server data", async () => {
  const paths: string[] = [];
  let committed = false;
  await assert.rejects(restoreWithUploadedMedia({
    prepare: async uploaded => { uploaded.push("owner/backup/image.jpg"); },
    validate: async () => undefined,
    commit: async () => { committed = true; throw new Error("response lost"); },
    remove: async uploaded => { paths.push(...uploaded); },
  }), /response lost/);
  assert.equal(committed, true);
  assert.deepEqual(paths, []);
});

test("validation failure before restore submission cleans only this attempt's uploaded objects", async () => {
  const removed: string[] = [];
  await assert.rejects(restoreWithUploadedMedia({
    prepare: async uploaded => { uploaded.push("owned/new.jpg"); },
    validate: async () => { throw new Error("invalid import"); },
    commit: async () => assert.fail("invalid backup must never be submitted"),
    remove: async uploaded => { removed.push(...uploaded); throw new Error("cleanup offline"); },
  }), /invalid import/);
  assert.deepEqual(removed, ["owned/new.jpg"]);
});

test("partial upload failure cleans completed uploads without hiding upload error", async () => {
  let removed: string[] = [];
  await assert.rejects(restoreWithUploadedMedia({
    prepare: async uploaded => { uploaded.push("first.jpg"); throw new Error("second upload failed"); },
    validate: async () => assert.fail("not ready"),
    commit: async () => assert.fail("not ready"),
    remove: async uploaded => { removed = [...uploaded]; },
  }), /second upload failed/);
  assert.deepEqual(removed, ["first.jpg"]);
});

test("confirmed restore returns result and retains uploaded media", async () => {
  assert.equal(await restoreWithUploadedMedia({
    prepare: async uploaded => { uploaded.push("new.jpg"); },
    validate: async () => undefined,
    commit: async () => "restored",
    remove: async () => assert.fail("live media must survive"),
  }), "restored");
});
