import * as Crypto from "expo-crypto";
import { createExpoCacheCipher } from "./expo-cache-cipher";

export const cacheCipher = createExpoCacheCipher({
  AESEncryptionKey: Crypto.AESEncryptionKey,
  AESSealedData: { fromParts: (nonce, ciphertext, tagLength) => Crypto.AESSealedData.fromParts(nonce, ciphertext, tagLength as 16) },
  aesEncryptAsync: (plain, key, options) => Crypto.aesEncryptAsync(plain, key as Crypto.AESEncryptionKey, options),
  aesDecryptAsync: (data, key, options) => Crypto.aesDecryptAsync(data as Crypto.AESSealedData, key as Crypto.AESEncryptionKey, options),
});
