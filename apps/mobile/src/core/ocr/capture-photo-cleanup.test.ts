import assert from "node:assert/strict";
import test from "node:test";
import { capturePhotoLeases, collectCapturePhotoOrphans } from "./capture-photo-cleanup";

test("capture cleanup preserves current and OCR-journal photos and only removes old owned orphans", async () => {
  const prefix = "file:///capture/A/", now = 200_000_000;
  const removed: string[] = [];
  const names = ["current.enc", "ocr-intent.enc", "old.tmp", "uncommitted.enc", "recent.enc"];
  const count = await collectCapturePhotoOrphans("A", {
    references: async () => [prefix + "current.enc", prefix + "ocr-intent.enc"], prefixes: [prefix], now,
    files: () => [...names.map(name => ({ uri: prefix + name, size: 100, modifiedAt: name === "recent.enc" ? now - 100 : 1 })),
      { uri: "file:///capture/B/foreign.enc", size: 100, modifiedAt: 1 }],
    remove: uri => { removed.push(uri); },
  });
  assert.equal(count, 2);
  assert.deepEqual(removed, [prefix + "old.tmp", prefix + "uncommitted.enc"]);
});

test("reference read failure fails closed and cleanup errors remain retryable", async () => {
  let removed = 0;
  const io = { references: async (): Promise<string[]> => { throw new Error("journal unreadable"); },
    prefixes: ["file:///capture/A/"], now: 200_000_000,
    files: () => [{ uri: "file:///capture/A/old.enc", size: 100, modifiedAt: 1 }],
    remove: () => { removed++; } };
  assert.equal(await collectCapturePhotoOrphans("A", io), 0);
  assert.equal(removed, 0);
  io.references = async () => [];
  io.remove = () => { throw new Error("EACCES"); };
  assert.equal(await collectCapturePhotoOrphans("A", io), 0);
  io.remove = () => { removed++; };
  assert.equal(await collectCapturePhotoOrphans("A", io), 1);
});

test("capture cleanup never enters while same-owner image persistence is active", async () => {
  let release!: () => void, inspected = false;
  const held = new Promise<void>(resolve => { release = resolve; });
  const saving = capturePhotoLeases.use("held-owner", () => held);
  const result = await collectCapturePhotoOrphans("held-owner", {
    references: async () => { inspected = true; return []; }, files: () => [], prefixes: [], remove: () => {}, now: 1,
  });
  release(); await saving;
  assert.equal(result, null);
  assert.equal(inspected, false);
});
