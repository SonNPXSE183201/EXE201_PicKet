/** Browser implementation of the existing mobile .picket envelope; no server password handling. */
export function encodeBase64(bytes: Uint8Array) {
  let text = "";
  for (let i = 0; i < bytes.length; i += 8192)
    text += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(text);
}
export function decodeBase64(value: string) {
  if (
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
      value,
    )
  )
    throw Error("Ảnh hoặc bản sao không hợp lệ.");
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
}
async function derive(password: string, salt: Uint8Array) {
  const source = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      iterations: 210000,
      salt: new Uint8Array(salt),
    },
    source,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}
export async function sealBackup(payload: unknown, password: string) {
  if (password.length < 12)
    throw Error("Mật khẩu bản sao cần ít nhất 12 ký tự.");
  const salt = crypto.getRandomValues(new Uint8Array(32)),
    nonce = crypto.getRandomValues(new Uint8Array(12)),
    key = await derive(password, salt);
  const sealed = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce, tagLength: 128 },
      key,
      new TextEncoder().encode(JSON.stringify(payload)),
    ),
  );
  const encoded = JSON.stringify({
    format: "picket-backup-v1",
    salt: encodeBase64(salt),
    nonce: encodeBase64(nonce),
    mac: encodeBase64(sealed.slice(-16)),
    ciphertext: encodeBase64(sealed.slice(0, -16)),
  });
  if (encoded.length > 100000000) throw Error("Bản sao vượt giới hạn 100 MB.");
  return encoded;
}
export async function openBackup<T = unknown>(
  encoded: string,
  password: string,
): Promise<T> {
  if (encoded.length > 100000000 || !password)
    throw Error("Bản sao quá lớn hoặc chưa nhập mật khẩu.");
  const e = JSON.parse(encoded);
  if (
    e?.format !== "picket-backup-v1" ||
    !["salt", "nonce", "mac", "ciphertext"].every(
      (k) => typeof e[k] === "string",
    )
  )
    throw Error(
      "Đây không phải bản sao cloud Picket. Bản sao chế độ riêng cần khôi phục trong ứng dụng Android.",
    );
  const salt = decodeBase64(e.salt),
    iv = decodeBase64(e.nonce),
    mac = decodeBase64(e.mac),
    ciphertext = decodeBase64(e.ciphertext);
  if (salt.length !== 32 || iv.length !== 12 || mac.length !== 16)
    throw Error("Bản sao không hợp lệ.");
  const sealed = new Uint8Array(ciphertext.length + 16);
  sealed.set(ciphertext);
  sealed.set(mac, ciphertext.length);
  try {
    return JSON.parse(
      new TextDecoder().decode(
        await crypto.subtle.decrypt(
          { name: "AES-GCM", iv, tagLength: 128 },
          await derive(password, salt),
          sealed,
        ),
      ),
    ) as T;
  } catch {
    throw Error("Sai mật khẩu hoặc bản sao đã hỏng.");
  }
}
