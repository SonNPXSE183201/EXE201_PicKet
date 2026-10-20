import assert from "node:assert/strict";
import { createCipheriv, createDecipheriv } from "node:crypto";
import { gcm } from "@noble/ciphers/aes.js";
import test from "node:test";
import { createExpoCacheCipher } from "./expo-cache-cipher";

const key = new Uint8Array(32).fill(7), nonce = new Uint8Array(12).fill(3);
const provider = () => {
  let imports = 0;
  const native = {
    AESEncryptionKey: { async import(bytes: Uint8Array) { imports++; return bytes; } },
    AESSealedData: { fromParts(iv: string, ciphertext: string, tag: number) { assert.equal(tag, 16); return { iv, ciphertext }; } },
    async aesEncryptAsync(plain: Uint8Array, secret: Uint8Array, options: { nonce: { bytes: Uint8Array }; tagLength: number; additionalData?: Uint8Array }) {
      assert.equal(options.tagLength, 16);
      const cipher = createCipheriv("aes-256-gcm", secret, options.nonce.bytes);
      if (options.additionalData) cipher.setAAD(options.additionalData);
      const bytes = Buffer.concat([cipher.update(plain), cipher.final(), cipher.getAuthTag()]);
      return { async ciphertext(options: { includeTag: boolean; encoding: string }) { assert.deepEqual(options, { includeTag: true, encoding: "bytes" }); return bytes; } };
    },
    async aesDecryptAsync(data: { iv: string; ciphertext: string }, secret: Uint8Array, options: { output: string; additionalData?: Uint8Array }) {
      assert.equal(options.output, "bytes");
      const bytes = Buffer.from(data.ciphertext, "base64");
      const decipher = createDecipheriv("aes-256-gcm", secret, Buffer.from(data.iv, "base64"));
      if (options.additionalData) decipher.setAAD(options.additionalData);
      decipher.setAuthTag(bytes.subarray(-16));
      return Buffer.concat([decipher.update(bytes.subarray(0, -16)), decipher.final()]);
    },
  };
  return { native: native as unknown as Parameters<typeof createExpoCacheCipher>[0], imports: () => imports };
};

test("native adapter preserves Noble ciphertext/tag format and owner AAD for Unicode and empty payloads", async () => {
  const p = provider(), cipher = createExpoCacheCipher(p.native);
  for (const text of ["", JSON.stringify({ title: "Hóa đơn 🍀", amount: 1234 })]) {
    const plain = new TextEncoder().encode(text), aad = new TextEncoder().encode("owner-A");
    const sealed = await cipher.seal(key, nonce, plain, aad);
    assert.deepEqual(Buffer.from(sealed, "base64"), Buffer.from(gcm(key, nonce, aad).encrypt(plain)));
    assert.equal(new TextDecoder().decode(await cipher.open(key, Buffer.from(nonce).toString("base64"), sealed, aad)), text);
  }
  assert.equal(p.imports(), 1);
});

test("existing cache without AAD reads unchanged; wrong owner and tampering reject without fallback", async () => {
  const cipher = createExpoCacheCipher(provider().native), plain = new TextEncoder().encode("cached image");
  const encodedNonce = Buffer.from(nonce).toString("base64");
  const oldCache = Buffer.from(gcm(key, nonce).encrypt(plain)).toString("base64");
  assert.deepEqual(Buffer.from(await cipher.open(key, encodedNonce, oldCache)), Buffer.from(plain));
  const sealed = await cipher.seal(key, nonce, plain, new TextEncoder().encode("A"));
  await assert.rejects(cipher.open(key, encodedNonce, sealed, new TextEncoder().encode("B")));
  const damaged = Buffer.from(sealed, "base64"); damaged[0] ^= 1;
  await assert.rejects(cipher.open(key, encodedNonce, damaged.toString("base64"), new TextEncoder().encode("A")));
});

test("invalid dimensions reject and a failed key import can be retried", async () => {
  const p = provider();
  const cipher = createExpoCacheCipher(p.native);
  await assert.rejects(cipher.seal(new Uint8Array(31), nonce, new Uint8Array()));
  await assert.rejects(cipher.seal(key, new Uint8Array(11), new Uint8Array()));
  await assert.rejects(cipher.open(key, Buffer.from(nonce).toString("base64"), "AA=="));
  await assert.rejects(cipher.open(key, "AA==", "AAAAAAAAAAAAAAAAAAAAAA=="));
  let fail = true;
  const original = p.native.AESEncryptionKey.import;
  p.native.AESEncryptionKey.import = async (value: Uint8Array) => { if (fail) { fail = false; throw new Error("native import failed"); } return original(value); };
  const retried = createExpoCacheCipher(p.native);
  await assert.rejects(retried.seal(key, nonce, new Uint8Array()));
  await retried.seal(key, nonce, new Uint8Array());
});
