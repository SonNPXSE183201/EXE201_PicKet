import { fromByteArray, toByteArray } from "base64-js";
import * as Crypto from "expo-crypto";
import { Directory, File, Paths } from "expo-file-system";
import { getFreeDiskStorageAsync } from "expo-file-system/legacy";
import * as SQLite from "expo-sqlite";
import { decryptLocalPayload, encryptLocalPayload, withLocalOwnerAccess, isOfflineCacheOwnerRetired } from "@/core/sync/offline-cache";
import { MAX_PHOTO_BYTES, requirePhotoWriteSpace, validatePhoto } from "@/features/keepsakes/keepsake-photo-vault";
import { createCaptureJournal, createPickerRecoveryStore, type CaptureSnapshot } from "./capture-journal";
import { capturePhotoLeases, collectCapturePhotoOrphans } from "./capture-photo-cleanup";
import { fallbackImageReferences } from "./fallback-storage";
import { captureOwnerSchema, purgeCaptureOwner } from "./capture-retirement";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
async function database() {
  dbPromise ??= SQLite.openDatabaseAsync("picket-capture.db").then(async db => {
    await db.execAsync(`PRAGMA journal_mode=WAL; ${captureOwnerSchema}`);
    return db;
  });
  const attempt = dbPromise;
  try { return await attempt; } catch(error) { if(dbPromise===attempt)dbPromise=null;throw error; }
}
function folder(owner: string, cache = false) {
  if (!/^[A-Za-z0-9_-]+$/.test(owner)) throw new Error("Invalid capture owner");
  return new Directory(cache ? Paths.cache : Paths.document, "capture-drafts", owner);
}
export const pickerRecovery = createPickerRecoveryStore(database, withLocalOwnerAccess);
function imageFile(owner: string, uri: string) {
  const prefix = folder(owner).uri.replace(/\/$/, "") + "/";
  if (!uri.startsWith(prefix) || !/^[A-Za-z0-9_-]+\.enc$/.test(uri.slice(prefix.length))) throw new Error("Invalid owned capture image");
  return new File(uri);
}
async function readStored(owner: string) {
  const row = await (await database()).getFirstAsync<{ payload: string }>("SELECT payload FROM capture_drafts WHERE owner_id=?", owner);
  if (!row) return null;
  if (!row.payload.startsWith("enc-v1:")) throw new Error("Invalid encrypted capture draft");
  return decryptLocalPayload<CaptureSnapshot>(row.payload, `capture-draft:${owner}`);
}
function read(owner:string) { return withLocalOwnerAccess(owner,()=>readStored(owner)); }
export const captureJournal = createCaptureJournal({
  read,
  write: (owner, value) => capturePhotoLeases.use(owner, () => withLocalOwnerAccess(owner, async () => {
    const db = await database();
    const previous = await readStored(owner);
    if (value) {
      // Editing text on an existing damaged draft must remain durable. A new
      // image reference still cannot commit until its file exists.
      if (!imageFile(owner, value.imageRef).exists && previous?.imageRef !== value.imageRef) throw new Error("Capture image is missing");
      const payload = await encryptLocalPayload(value, `capture-draft:${owner}`);
      await db.runAsync("INSERT INTO capture_drafts(owner_id,payload) VALUES(?,?) ON CONFLICT(owner_id) DO UPDATE SET payload=excluded.payload", owner, payload);
    } else await db.runAsync("DELETE FROM capture_drafts WHERE owner_id=?", owner);
    // A submitted OCR journal may still need the superseded image. Leave
    // deletion to the age-bounded, reference-aware sweep after in-flight work.
  })),
});
export function persistCaptureImage(owner: string, uri: string) {
  return capturePhotoLeases.use(owner, () => withLocalOwnerAccess(owner, () => persistCaptureImageWithLease(owner, uri)));
}
async function persistCaptureImageWithLease(owner: string, uri: string) {
  const source = new File(uri);
  if (source.size <= 0 || source.size > MAX_PHOTO_BYTES) throw new Error("Ảnh vượt giới hạn 10 MB.");
  requirePhotoWriteSpace(await getFreeDiskStorageAsync(), source.size * 3);
  const bytes = await source.bytes();
  const mime = bytes[0] === 137 && bytes[1] === 80 ? "image/png" : bytes[0] === 0xff && bytes[1] === 0xd8 ? "image/jpeg" : "image/webp";
  const photo = validatePhoto({ mime, base64: fromByteArray(bytes) });
  const dir = folder(owner); dir.create({ intermediates: true, idempotent: true });
  const id = Crypto.randomUUID();
  const temp = new File(dir, `${id}.tmp`);
  const destination = new File(dir, `${id}.enc`);
  try {
    temp.write(await encryptLocalPayload(photo, `capture-photo:${owner}`));
    await temp.move(destination);
    return { id, imageRef: destination.uri };
  } catch (error) { if (temp.exists) temp.delete(); throw error; }
}
export function restoreCaptureImage(owner: string, imageRef: string) {
  return capturePhotoLeases.use(owner, () => withLocalOwnerAccess(owner, () => restoreCaptureImageWithLease(owner, imageRef)));
}
async function restoreCaptureImageWithLease(owner: string, imageRef: string) {
  const file = imageFile(owner, imageRef);
  if (!file.exists || file.size > 30_000_000) throw new Error("Không đọc được ảnh bản nháp.");
  requirePhotoWriteSpace(await getFreeDiskStorageAsync(), file.size);
  const raw = await file.text();
  if (!raw.startsWith("enc-v1:")) throw new Error("Ảnh bản nháp bị hỏng.");
  const photo = validatePhoto(await decryptLocalPayload(raw, `capture-photo:${owner}`));
  const dir = folder(owner, true); dir.create({ intermediates: true, idempotent: true });
  const result = new File(dir, file.name.replace(/\.enc$/, photo.mime === "image/png" ? ".png" : photo.mime === "image/jpeg" ? ".jpg" : ".webp"));
  result.write(toByteArray(photo.base64));
  return result.uri;
}

export function cleanupCaptureImages(owner: string) {
  const dirs = [folder(owner), folder(owner, true)];
  return collectCapturePhotoOrphans(owner, {
    now: Date.now(), prefixes: dirs.map(dir => dir.uri.replace(/\/$/, "") + "/"),
    references: async () => {
      const current = await read(owner);
      const refs = [...(current ? [current.imageRef] : []), ...await fallbackImageReferences(owner)];
      // The decrypted preview is derived from the encrypted filename. Keep
      // all supported extensions while its encrypted source is referenced.
      return refs.flatMap(uri => {
        const file = imageFile(owner, uri);
        const base = file.name.replace(/\.enc$/, "");
        return [uri, ...["jpg", "png", "webp"].map(ext => new File(dirs[1], `${base}.${ext}`).uri)];
      });
    },
    files: () => dirs.flatMap(dir => dir.exists ? dir.list().filter((entry): entry is File => entry instanceof File)
      .map(file => ({ uri: file.uri, size: file.size, modifiedAt: file.modificationTime ?? 0 })) : []),
    remove: uri => { new File(uri).delete(); },
  });
}

export async function purgeRetiredCaptureOwner(owner:string) {
  await purgeCaptureOwner(owner,{
    isRetired:isOfflineCacheOwnerRetired,
    roots:[Paths.document.uri,Paths.cache.uri],
    directory:(root,id)=>new Directory(root,"capture-drafts",id).uri.replace(/\/$/,""),
    removeDirectory:async uri=>{
      const dir=new Directory(uri);
      if(dir.exists) {
        try {dir.delete();}catch(error){if(dir.exists)throw error;}
      }
    },
    database,
  });
}
