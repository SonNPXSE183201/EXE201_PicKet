import { gcm } from "@noble/ciphers/aes.js";
import { utf8ToBytes } from "@noble/hashes/utils.js";
import { fromByteArray, toByteArray } from "base64-js";
import { deriveBackupKey } from "./backup-key-derivation";

const MAX_FILE_BYTES = 100_000_000;

export async function sealBackupEnvelope(
  format: "picket-backup-v1" | "picket-guest-backup-v1",
  payload: unknown,
  password: string,
  salt: Uint8Array,
  nonce: Uint8Array,
) {
  if (password.length < 12 || salt.length !== 32 || nonce.length !== 12) throw new Error("Thông số mã hóa bản sao không hợp lệ.");
  const key = await deriveBackupKey(password, salt);
  const sealed = gcm(key, nonce).encrypt(utf8ToBytes(JSON.stringify(payload)));
  const encoded = JSON.stringify({ format, salt:fromByteArray(salt), nonce:fromByteArray(nonce),
    mac:fromByteArray(sealed.slice(-16)), ciphertext:fromByteArray(sealed.slice(0, -16)) });
  if (encoded.length > MAX_FILE_BYTES) throw new Error("Bản sao vượt giới hạn 100 MB.");
  return encoded;
}

export async function openBackupEnvelope<T>(
  encoded: string,
  format: "picket-backup-v1" | "picket-guest-backup-v1",
  password: string,
): Promise<T> {
  if (encoded.length > MAX_FILE_BYTES || !password) throw new Error("Bản sao quá lớn hoặc chưa nhập mật khẩu.");
  let envelope: Record<string, unknown>;
  try { envelope = JSON.parse(encoded) as Record<string, unknown>; }
  catch { throw new Error("Định dạng bản sao không hợp lệ."); }
  if (envelope.format !== format || typeof envelope.salt !== "string" || typeof envelope.nonce !== "string" ||
      typeof envelope.mac !== "string" || typeof envelope.ciphertext !== "string") throw new Error("Định dạng bản sao không hợp lệ.");
  const salt = toByteArray(envelope.salt);
  const nonce = toByteArray(envelope.nonce);
  const mac = toByteArray(envelope.mac);
  const ciphertext = toByteArray(envelope.ciphertext);
  if (salt.length !== 32 || nonce.length !== 12 || mac.length !== 16 || ciphertext.length > MAX_FILE_BYTES) throw new Error("Bản sao không hợp lệ.");
  const key = await deriveBackupKey(password, salt);
  const sealed = new Uint8Array(ciphertext.length + mac.length);
  sealed.set(ciphertext);
  sealed.set(mac, ciphertext.length);
  try { return JSON.parse(new TextDecoder().decode(gcm(key, nonce).decrypt(sealed))) as T; }
  catch { throw new Error("Sai mật khẩu hoặc bản sao đã hỏng."); }
}
