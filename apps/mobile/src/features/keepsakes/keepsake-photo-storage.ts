import { fromByteArray, toByteArray } from "base64-js";
import * as Crypto from "expo-crypto";
import { Directory, File, Paths } from "expo-file-system";
import { getFreeDiskStorageAsync } from "expo-file-system/legacy";
import { decryptLocalPayload, encryptLocalPayload, withLocalOwnerAccess } from "@/core/sync/offline-cache";
import { createPhotoLeaseGate, createPhotoVault, MAX_PHOTO_BYTES, requirePhotoWriteSpace, selectPhotoOrphans, type PhotoPayload } from "./keepsake-photo-vault";

const leases = createPhotoLeaseGate();
export const withKeepsakePhotoLease = leases.use;
const vault = createPhotoVault({
  write: async (uri, text) => { new File(uri).write(text); },
  read: uri => new File(uri).text(),
  seal: encryptLocalPayload,
  open: decryptLocalPayload,
});
function directories(owner: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(owner)) throw new Error("Invalid photo owner.");
  return [new Directory(Paths.document, "keepsakes", owner), new Directory(Paths.document, "keepsake-cloud-cache", owner)];
}
function ownedFile(owner: string, uri: string) {
  const allowed = directories(owner).some(dir => { const prefix = dir.uri.replace(/\/$/, "") + "/"; return uri.startsWith(prefix) && /^[A-Za-z0-9_-]+(?:\.[A-Za-z0-9]+)*$/.test(uri.slice(prefix.length)); });
  if (!allowed) throw new Error("Ảnh không thuộc tài khoản hiện tại.");
  return new File(uri);
}
export function keepsakePhotoMime(bytes: Uint8Array): string {
  if (bytes.length > MAX_PHOTO_BYTES) throw new Error("Ảnh vượt giới hạn 10 MB.");
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if ([137,80,78,71,13,10,26,10].every((v,i) => bytes[i] === v)) return "image/png";
  if (new TextDecoder().decode(bytes.slice(0,4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8,12)) === "WEBP") return "image/webp";
  throw new Error("Định dạng ảnh không được hỗ trợ.");
}
export function writeKeepsakePhoto(owner: string, bytes: Uint8Array, cacheName?: string): Promise<string> {
  return leases.use(owner, () => withLocalOwnerAccess(owner, async () => {
    const mime = keepsakePhotoMime(bytes);
    requirePhotoWriteSpace(await getFreeDiskStorageAsync(), bytes.length * 3);
    const dir = directories(owner)[cacheName ? 1 : 0];
    dir.create({ intermediates: true, idempotent: true });
    const destination = new File(dir, cacheName ? `${cacheName}.enc` : `${Crypto.randomUUID()}.enc`);
    ownedFile(owner, destination.uri);
    // New unique ciphertext first; never remove an old usable cache on failed write.
    const temp = new File(dir, `${Crypto.randomUUID()}.tmp`);
    try {
      await vault.write(owner, temp.uri, { mime, base64: fromByteArray(bytes) });
      if (destination.exists) { temp.delete(); return destination.uri; }
      await temp.move(destination);
      return destination.uri;
    } catch (error) { if (temp.exists) temp.delete(); throw error; }
  }));
}
export function readKeepsakePhoto(owner: string, uri: string): Promise<PhotoPayload> {
  return leases.use(owner, () => withLocalOwnerAccess(owner, async () => {
    const file = ownedFile(owner, uri);
    if (uri.endsWith(".enc")) {
      const photo = await vault.read(owner, uri);
      if (keepsakePhotoMime(toByteArray(photo.base64)) !== photo.mime) throw new Error("Ảnh mã hóa không hợp lệ.");
      return photo;
    }
    const bytes = await file.bytes();
    return { mime: keepsakePhotoMime(bytes), base64: fromByteArray(bytes) };
  }));
}
export async function keepsakePhotoSource(owner: string, uri: string) {
  const photo = await readKeepsakePhoto(owner, uri);
  return `data:${photo.mime};base64,${photo.base64}`;
}
/** Reference discovery must use raw DB/cache reads, not acquire a media lease. */
export function cleanupKeepsakePhotos(owner: string, references: () => Promise<string[]>) {
  return leases.clean(owner, async () => {
    let protectedUris: Set<string>;
    try { protectedUris = new Set(await references()); } catch { return 0; }
    const dirs = directories(owner);
    const files = dirs.flatMap(dir => dir.exists ? dir.list().filter((entry): entry is File => entry instanceof File).map(file => ({ uri: file.uri, size: file.size, modifiedAt: file.modificationTime ?? 0 })) : []);
    const candidates = selectPhotoOrphans(files, dirs.map(dir => dir.uri.replace(/\/$/, "") + "/"), protectedUris, Date.now());
    let removed = 0;
    for (const candidate of candidates) { try { ownedFile(owner, candidate.uri).delete(); removed++; } catch { /* Retry a later bounded sweep. */ } }
    return removed;
  });
}
