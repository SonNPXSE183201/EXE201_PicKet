import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as vault from "./keepsake-photo-vault";

function guard(): (available: number, requested: number) => void {
  const value = Reflect.get(vault, "requirePhotoWriteSpace");
  assert.equal(typeof value, "function", "Missing low-storage guard before synchronous native writes");
  return value;
}
test("exhausted or unknown storage refuses photo writes with a recoverable ENOSPC code", () => {
  for (const available of [0, 1024, NaN, Infinity, -1]) {
    assert.throws(() => guard()(available, 2048), (error: unknown) => Reflect.get(error as object, "code") === "ENOSPC");
  }
});
test("photo writes retain one MiB of journal/headroom beyond their actual byte budget", () => {
  const check = guard();
  assert.throws(() => check(1024 * 1024 + 2047, 2048));
  assert.doesNotThrow(() => check(1024 * 1024 + 2048, 2048));
});
test("invalid requested sizes fail closed without attempting allocation", () => {
  const check = guard();
  for (const requested of [-1, NaN, Infinity, Number.MAX_SAFE_INTEGER]) assert.throws(() => check(20 * 1024 * 1024, requested));
});
test("capture restore checks free space before creating/writing its derived preview", () => {
  const source = readFileSync(new URL("../../core/ocr/capture-storage.ts", import.meta.url), "utf8");
  const restore = source.slice(source.indexOf("async function restoreCaptureImageWithLease"), source.indexOf("export function cleanupCaptureImages"));
  assert.match(restore, /requirePhotoWriteSpace\(Paths\.availableDiskSpace/);
  assert.ok(restore.indexOf("requirePhotoWriteSpace") < restore.indexOf("dir.create("));
});
test("new capture and keepsake writes reserve storage before native directory creation", () => {
  const capture = readFileSync(new URL("../../core/ocr/capture-storage.ts", import.meta.url), "utf8");
  const persist = capture.slice(capture.indexOf("async function persistCaptureImageWithLease"), capture.indexOf("export function restoreCaptureImage"));
  assert.ok(persist.indexOf("requirePhotoWriteSpace") >= 0 && persist.indexOf("requirePhotoWriteSpace") < persist.indexOf("dir.create("));
  const photo = readFileSync(new URL("./keepsake-photo-storage.ts", import.meta.url), "utf8");
  const write = photo.slice(photo.indexOf("export function writeKeepsakePhoto"), photo.indexOf("export function readKeepsakePhoto"));
  assert.ok(write.indexOf("requirePhotoWriteSpace") >= 0 && write.indexOf("requirePhotoWriteSpace") < write.indexOf("dir.create("));
});
