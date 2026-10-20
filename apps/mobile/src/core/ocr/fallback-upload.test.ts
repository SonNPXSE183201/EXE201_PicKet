import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { uploadVerifiedFallbackImage } from "./fallback-upload";
const image = Uint8Array.of(1, 2, 3).buffer;
const digest = async (bytes: ArrayBuffer) => createHash("sha256").update(new Uint8Array(bytes)).digest("hex");

test("lost upload response and a duplicate object are accepted only with exact length and digest", async () => {
  let uploads = 0, reads = 0;
  await uploadVerifiedFallbackImage(image, await digest(image), { digest,
    upload: async () => { uploads++; throw Error("ack lost"); },
    readExisting: async () => { reads++; return image; } });
  assert.equal(uploads, 1); assert.equal(reads, 1);
});
test("a 409, missing object, different bytes, or remote read failure is not success", async () => {
  for (const readExisting of [async () => new ArrayBuffer(0), async () => Uint8Array.of(3, 2, 1).buffer, async () => { throw Error("offline"); }]) {
    await assert.rejects(uploadVerifiedFallbackImage(image, await digest(image), {
      digest, upload: async () => { throw Error("409 or transport failure"); }, readExisting,
    }), /409 or transport/);
  }
});
test("local image mismatch, empty and oversized files never start upload", async () => {
  for (const bytes of [image, new ArrayBuffer(0), new ArrayBuffer(10 * 1024 * 1024 + 1)]) {
    await assert.rejects(uploadVerifiedFallbackImage(bytes, "wrong", { digest, upload: async () => assert.fail("No upload"), readExisting: async () => assert.fail("No read") }), /identity mismatch/);
  }
});
test("a successful first upload does not read the object again", async () => {
  await uploadVerifiedFallbackImage(image, await digest(image), { digest, upload: async () => undefined, readExisting: async () => assert.fail("No read") });
});
