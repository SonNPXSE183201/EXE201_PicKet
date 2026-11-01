import assert from "node:assert/strict";
import test from "node:test";
import { runCorpus, qaEnabled } from "./ocr-corpus";

test("QA is restricted to flag and exact private package path", () => {
  assert.equal(qaEnabled(true, "com.picket.mobile.bugqa", "file:///data/user/0/com.picket.mobile.bugqa/files/"), true);
  assert.equal(qaEnabled(true, "com.picket.mobile", "file:///data/user/0/com.picket.mobile.bugqa/files/"), false);
  assert.equal(qaEnabled(false, "com.picket.mobile.bugqa", "file:///data/user/0/com.picket.mobile.bugqa/files/"), false);
  assert.equal(qaEnabled(true, "com.picket.mobile.bugqa", "file:///data/user/0/com.picket.mobile/files/"), false);
  assert.equal(qaEnabled(true, "com.picket.mobile.bugqa", "file:///data/user/0/com.picket.mobile.bugqa.fake/files/"), false);
});
test("runs each named input sequentially and persists successes and failures", async () => {
  const written: unknown[] = [];
  const entries = [{ name: "a", file: "01.jpg", sha256: "a" }, { name: "b", file: "02.jpg", sha256: "b" }];
  await runCorpus(entries, async e => { if (e.name === "b") throw new Error("bad"); return { draft: { amount: 1 }, samples: ["native"] }; }, r => { written.push(r); });
  assert.equal(written.length, 2);
  assert.deepEqual((written[0] as any).samples, ["native"]);
  assert.match((written[1] as any).error, /bad/);
});

test("manifest preserves duplicate-content inputs while requiring forty distinct indexed files", async () => {
  const { validManifest } = await import("./ocr-corpus");
  const entries = Array.from({ length: 40 }, (_, i) => ({ name: `original-${i}`, file: `${String(i + 1).padStart(2, "0")}.jpg`, sha256: "a".repeat(64) }));
  assert.equal(validManifest(entries), true);
  assert.equal(validManifest(entries.slice(1)), false);
  assert.equal(validManifest([...entries.slice(0, 39), entries[0]]), false);
  assert.equal(validManifest(entries.map((e, i) => i === 0 ? { ...e, file: "../outside.jpg" } : e)), false);
});
