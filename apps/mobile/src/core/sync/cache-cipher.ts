import { gcm } from "@noble/ciphers/aes.js";
import { fromByteArray, toByteArray } from "base64-js";

// Portable implementation for Node/web. Metro resolves .native on Android.
export const cacheCipher = {
  async seal(key: Uint8Array, nonce: Uint8Array, plain: Uint8Array, aad?: Uint8Array) {
    return fromByteArray(gcm(key, nonce, aad).encrypt(plain));
  },
  async open(key: Uint8Array, nonce: string, ciphertext: string, aad?: Uint8Array) {
    return gcm(key, toByteArray(nonce), aad).decrypt(toByteArray(ciphertext));
  },
};
