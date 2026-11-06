import { fromByteArray, toByteArray } from "base64-js";

interface NativeCacheCrypto {
  AESEncryptionKey: { import(bytes: Uint8Array): Promise<unknown> };
  AESSealedData: { fromParts(nonce: string, ciphertext: string, tagLength: number): unknown };
  aesEncryptAsync(plain: Uint8Array, key: unknown, options: { nonce: { bytes: Uint8Array }; tagLength: 16; additionalData?: Uint8Array }): Promise<{ ciphertext(options: { includeTag: true; encoding: "bytes" }): Promise<Uint8Array> }>;
  aesDecryptAsync(data: unknown, key: unknown, options: { output: "bytes"; additionalData?: Uint8Array }): Promise<Uint8Array>;
}

/** Keep the existing C || tag16 format; never substitute combined IV || C || tag. */
export function createExpoCacheCipher(crypto: NativeCacheCrypto) {
  let keyId: string | undefined, imported: Promise<unknown> | undefined;
  async function key(bytes: Uint8Array) {
    if (bytes.length !== 32) throw new Error("Invalid cache key.");
    const id = fromByteArray(bytes);
    if (!imported || keyId !== id) { keyId = id; imported = crypto.AESEncryptionKey.import(bytes); }
    const pending = imported;
    try { return await pending; }
    catch (error) { if (pending === imported) { imported = undefined; keyId = undefined; } throw error; }
  }
  return {
    async seal(secret: Uint8Array, nonce: Uint8Array, plain: Uint8Array, additionalData?: Uint8Array) {
      if (nonce.length !== 12) throw new Error("Invalid cache nonce.");
      const sealed = await crypto.aesEncryptAsync(plain, await key(secret), { nonce: { bytes: nonce }, tagLength: 16, additionalData });
      // SDK57 Android does not consistently implement the base64 ciphertext
      // overload. Request bytes explicitly and include the authentication tag.
      return fromByteArray(await sealed.ciphertext({ includeTag: true, encoding: "bytes" }));
    },
    async open(secret: Uint8Array, nonce: string, ciphertext: string, additionalData?: Uint8Array) {
      if (toByteArray(nonce).length !== 12 || ciphertext.length < 24) throw new Error("Invalid encrypted cache dimensions.");
      const sealed = crypto.AESSealedData.fromParts(nonce, ciphertext, 16);
      return crypto.aesDecryptAsync(sealed, await key(secret), { output: "bytes", additionalData });
    },
  };
}
