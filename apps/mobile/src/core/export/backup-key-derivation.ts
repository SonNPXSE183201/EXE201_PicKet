import { pbkdf2Async } from "@noble/hashes/pbkdf2.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { utf8ToBytes } from "@noble/hashes/utils.js";

type NativeDeriver = (password: string, salt: Uint8Array) => Promise<Uint8Array>;
let nativeDeriver: NativeDeriver | null = null;
export function configureNativeBackupKey(derive: NativeDeriver | null) { nativeDeriver = derive; }
/** Same format/work factor on native and fallback; native errors never downgrade. */
export async function deriveBackupKey(password: string, salt: Uint8Array) {
  if (!password || salt.length !== 32) throw new Error("Thông số mã hóa bản sao không hợp lệ.");
  const key = nativeDeriver ? await nativeDeriver(password, salt)
    : await pbkdf2Async(sha256, utf8ToBytes(password), salt, { c: 210_000, dkLen: 32 });
  if (key.length !== 32) throw new Error("Khóa bản sao không hợp lệ.");
  return key;
}
