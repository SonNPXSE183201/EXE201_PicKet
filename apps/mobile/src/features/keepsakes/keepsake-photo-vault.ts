import { toByteArray } from "base64-js";

export type PhotoPayload = { mime: string; base64: string };
export const MAX_PHOTO_BYTES = 10_485_760;
/** Preflight only: concurrent writes can still exhaust space and must be caught. */
export function requirePhotoWriteSpace(available: number, requested: number): void {
  const headroom = 1024 * 1024;
  if (!Number.isSafeInteger(available) || available < 0
    || !Number.isSafeInteger(requested) || requested < 0
    || requested > Number.MAX_SAFE_INTEGER - headroom
    || available - requested < headroom) {
    throw Object.assign(new Error("Không đủ dung lượng để mở hoặc lưu ảnh. Hãy giải phóng dung lượng rồi thử lại."), { code: "ENOSPC" });
  }
}
export function validatePhoto(value: unknown): PhotoPayload {
  const photo = value as PhotoPayload;
  if (!photo || !/^image\/(jpeg|png|webp)$/.test(photo.mime) || typeof photo.base64 !== "string"
    || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(photo.base64)
    || !photo.base64.length || photo.base64.length > Math.ceil(MAX_PHOTO_BYTES / 3) * 4
    || toByteArray(photo.base64).length > MAX_PHOTO_BYTES) throw new Error("Ảnh không hợp lệ hoặc vượt giới hạn 10 MB.");
  return photo;
}

export function createPhotoVault(io: {
  write(uri: string, value: string): Promise<void>;
  read(uri: string): Promise<string>;
  seal(value: PhotoPayload, owner: string): Promise<string>;
  open(value: string, owner: string): Promise<unknown>;
}) {
  return {
    async write(owner: string, uri: string, value: PhotoPayload) {
      await io.write(uri, await io.seal(validatePhoto(value), `keepsake-photo:${owner}`));
    },
    async read(owner: string, uri: string) {
      const text = await io.read(uri);
      if (!text.startsWith("enc-v1:")) throw new Error("Ảnh mã hóa bị hỏng.");
      return validatePhoto(await io.open(text, `keepsake-photo:${owner}`));
    },
  };
}

export type PhotoFile = { uri: string; size: number; modifiedAt: number };
export function createPhotoLeaseGate() {
  const active = new Map<string, number>();
  const cleaning = new Map<string, Promise<void>>();
  return {
    async use<T>(owner: string, action: () => Promise<T>): Promise<T> {
      while (cleaning.has(owner)) await cleaning.get(owner);
      active.set(owner, (active.get(owner) ?? 0) + 1);
      try { return await action(); }
      finally { const count = (active.get(owner) ?? 1) - 1; if (count) active.set(owner, count); else active.delete(owner); }
    },
    async clean<T>(owner: string, action: () => Promise<T>): Promise<T | null> {
      if (active.has(owner) || cleaning.has(owner)) return null;
      let release!: () => void;
      cleaning.set(owner, new Promise<void>(resolve => { release = resolve; }));
      try { return await action(); }
      finally { cleaning.delete(owner); release(); }
    },
  };
}

export function selectPhotoOrphans(files: PhotoFile[], prefixes: string[], references: Set<string> | null, now: number) {
  if (!references) return [];
  const result: PhotoFile[] = [];
  let bytes = 0;
  for (const file of files) {
    const prefix = prefixes.find(value => file.uri.startsWith(value));
    if (!prefix || !/^[A-Za-z0-9_-]+(?:\.[A-Za-z0-9]+)*$/.test(file.uri.slice(prefix.length))
      || references.has(file.uri) || !Number.isFinite(file.modifiedAt) || file.modifiedAt <= 0
      || now - file.modifiedAt < 86_400_000 || !Number.isFinite(file.size) || file.size < 0
      || bytes + file.size > 20_000_000 || result.length >= 20) continue;
    result.push(file);
    bytes += file.size;
  }
  return result;
}
