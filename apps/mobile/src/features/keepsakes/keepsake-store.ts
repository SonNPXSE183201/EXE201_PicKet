import * as Crypto from "expo-crypto";
import { Directory, File, Paths } from "expo-file-system";
import * as SQLite from "expo-sqlite";
import { nextKeepsakePhotoUploadRequired } from "./keepsake-outbox-policy";
import { sameKeepsakeOutbox, type KeepsakePhotoCleanup } from "./keepsake-media-policy";
import { cleanupKeepsakePhotos, readKeepsakePhoto, withKeepsakePhotoLease, writeKeepsakePhoto } from "./keepsake-photo-storage";
import { readOfflineCache, withLocalOwnerAccess, isOfflineCacheOwnerRetired } from "@/core/sync/offline-cache";
import { toByteArray } from "base64-js";
import { purgeKeepsakeOwner } from "./keepsake-retirement";

export interface Keepsake {
  id: string;
  userId: string;
  title: string;
  amount: number;
  date: string;
  note: string;
  photoUri: string | null;
  category: string;
  warrantyUntil: string | null;
  returnUntil: string | null;
  version?: number;
  mediaPath?: string | null;
  photoUploadRequired?: boolean;
}

type KeepsakeRow = {
  id: string; user_id: string; title: string; amount: number; date: string;
  note: string; photo_uri: string | null; category: string;
  warranty_until: string | null; return_until: string | null;
  remote_version: number | null; media_path: string | null;
  photo_upload_required: number | null;
};

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;
const listeners = new Set<(userId: string) => void>();
export function onKeepsakesChanged(listener: (userId: string) => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
function notifyChanged(userId: string) { for (const listener of listeners) listener(userId); }
async function database() {
  databasePromise ??= SQLite.openDatabaseAsync("picket-keepsakes.db").then(async (db) => {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS keepsakes (
        id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, title TEXT NOT NULL,
        amount INTEGER NOT NULL, date TEXT NOT NULL, note TEXT NOT NULL,
        photo_uri TEXT, category TEXT NOT NULL, warranty_until TEXT,
        return_until TEXT
      );
      CREATE INDEX IF NOT EXISTS keepsakes_owner_idx ON keepsakes(user_id, date);
      CREATE TABLE IF NOT EXISTS keepsake_photo_cleanup (
        user_id TEXT NOT NULL, item_id TEXT NOT NULL, obsolete_path TEXT NOT NULL,
        replacement_path TEXT NOT NULL,
        PRIMARY KEY (user_id, item_id, obsolete_path, replacement_path)
      );
    `);
    const columns = await db.getAllAsync<{ name: string }>("PRAGMA table_info(keepsakes)");
    const names = new Set(columns.map((column) => column.name));
    if (!names.has("remote_version")) await db.execAsync("ALTER TABLE keepsakes ADD COLUMN remote_version INTEGER");
    if (!names.has("media_path")) await db.execAsync("ALTER TABLE keepsakes ADD COLUMN media_path TEXT");
    // NULL preserves unknown intent from older queues, rather than discarding
    // a possibly selected replacement image during migration.
    if (!names.has("photo_upload_required")) await db.execAsync("ALTER TABLE keepsakes ADD COLUMN photo_upload_required INTEGER");
    return db;
  });
  try { return await databasePromise; }
  catch (error) { databasePromise = null; throw error; }
}

function fromRow(row: KeepsakeRow): Keepsake {
  return { id: row.id, userId: row.user_id, title: row.title, amount: row.amount,
    date: row.date, note: row.note, photoUri: row.photo_uri, category: row.category,
    warrantyUntil: row.warranty_until, returnUntil: row.return_until,
    version: row.remote_version ?? undefined, mediaPath: row.media_path,
    photoUploadRequired: row.photo_upload_required === null ? undefined : row.photo_upload_required === 1 };
}

export async function listKeepsakes(userId: string): Promise<Keepsake[]> {
  return withKeepsakePhotoLease(userId, async () => {
  const db = await database();
  const rows = await withLocalOwnerAccess(userId,()=>db.getAllAsync<KeepsakeRow>("SELECT * FROM keepsakes WHERE user_id = ? ORDER BY date DESC", userId));
  for (const row of rows) if (row.photo_uri && !row.photo_uri.endsWith(".enc")) {
    try {
      const photo = await readKeepsakePhoto(userId, row.photo_uri);
      const next = await writeKeepsakePhoto(userId, toByteArray(photo.base64));
      const changed = await withLocalOwnerAccess(userId,()=>db.runAsync("UPDATE keepsakes SET photo_uri = ? WHERE id = ? AND user_id = ? AND photo_uri = ?", next, row.id, userId, row.photo_uri));
      if (changed.changes === 1) row.photo_uri = next;
    } catch { /* Preserve legacy reference when storage/key/migration is unavailable. */ }
  }
  return rows.map(fromRow);
  });
}

export async function collectKeepsakePhotoOrphans(userId: string) {
  return cleanupKeepsakePhotos(userId, async () => {
    const db = await database();
    const rows = await withLocalOwnerAccess(userId,()=>db.getAllAsync<{ photo_uri: string | null }>("SELECT photo_uri FROM keepsakes WHERE user_id = ?", userId));
    const cache = await readOfflineCache<Keepsake[]>(userId, "keepsakes");
    return [...rows.map(row => row.photo_uri), ...(cache?.value ?? []).map(row => row.photoUri)].filter((uri): uri is string => !!uri);
  });
}

export async function saveKeepsake(input: Omit<Keepsake, "id"> & { id?: string; pickedPhotoUri?: string | null }): Promise<Keepsake> {
  return withKeepsakePhotoLease(input.userId, () => saveKeepsakeWithLease(input));
}
async function saveKeepsakeWithLease(input: Omit<Keepsake, "id"> & { id?: string; pickedPhotoUri?: string | null }): Promise<Keepsake> {
  const db = await database();
  const id = input.id ?? Crypto.randomUUID();
  const photoUploadRequired = nextKeepsakePhotoUploadRequired(input);
  let photoUri = input.photoUri;
  let copied: File | null = null;
  if (input.pickedPhotoUri) {
    photoUri = await writeKeepsakePhoto(input.userId, await new File(input.pickedPhotoUri).bytes());
    copied = new File(photoUri);
  }
  try {
    const written = await withLocalOwnerAccess(input.userId,()=>db.runAsync(
      `INSERT INTO keepsakes (id,user_id,title,amount,date,note,photo_uri,category,warranty_until,return_until,remote_version,media_path,photo_upload_required)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET title=excluded.title,amount=excluded.amount,date=excluded.date,
       note=excluded.note,photo_uri=excluded.photo_uri,category=excluded.category,
       warranty_until=excluded.warranty_until,return_until=excluded.return_until,
       remote_version=excluded.remote_version,media_path=excluded.media_path,photo_upload_required=excluded.photo_upload_required
       WHERE keepsakes.user_id=excluded.user_id`,
      id, input.userId, input.title, input.amount, input.date, input.note, photoUri,
      input.category, input.warrantyUntil, input.returnUntil, input.version ?? null, input.mediaPath ?? null, photoUploadRequired ? 1 : 0,
    ));
    if (written.changes !== 1) throw new Error("Không thể ghi đè món đồ của tài khoản khác.");
  } catch (error) {
    if (copied?.exists) copied.delete();
    throw error;
  }
  // A cached display or an in-flight replay can still reference the old file.
  // Do not delete it while replacing the pending photo pointer.
  notifyChanged(input.userId);
  return { id, userId: input.userId, title: input.title, amount: input.amount,
    date: input.date, note: input.note, photoUri, category: input.category,
    warrantyUntil: input.warrantyUntil, returnUntil: input.returnUntil,
    version: input.version, mediaPath: input.mediaPath, photoUploadRequired };
}

export async function enqueueKeepsakePhotoCleanup(userId: string, task: KeepsakePhotoCleanup) {
  return withLocalOwnerAccess(userId,async()=>{
  const db = await database();
  await db.runAsync(`INSERT OR IGNORE INTO keepsake_photo_cleanup
    (user_id,item_id,obsolete_path,replacement_path) VALUES (?,?,?,?)`,
  userId, task.itemId, task.obsoletePath, task.replacementPath);
  });
}

export async function listKeepsakePhotoCleanup(userId: string): Promise<KeepsakePhotoCleanup[]> {
  return withLocalOwnerAccess(userId,async()=>{
  const db = await database();
  return db.getAllAsync<KeepsakePhotoCleanup>(`SELECT item_id AS itemId,
    obsolete_path AS obsoletePath, replacement_path AS replacementPath
    FROM keepsake_photo_cleanup WHERE user_id = ?`, userId);
  });
}

export async function acknowledgeKeepsakePhotoCleanup(userId: string, task: KeepsakePhotoCleanup) {
  return withLocalOwnerAccess(userId,async()=>{
  const db = await database();
  await db.runAsync(`DELETE FROM keepsake_photo_cleanup WHERE user_id = ? AND item_id = ?
    AND obsolete_path = ? AND replacement_path = ?`, userId, task.itemId, task.obsoletePath, task.replacementPath);
  });
}

export async function deleteKeepsake(id: string, userId: string, preservePhotoUri?: string | null) {
  return withKeepsakePhotoLease(userId, () => withLocalOwnerAccess(userId, async () => {
  const db = await database();
  const row = await db.getFirstAsync<KeepsakeRow>("SELECT * FROM keepsakes WHERE id = ? AND user_id = ?", id, userId);
  if (!row) return;
  await db.runAsync("DELETE FROM keepsakes WHERE id = ? AND user_id = ?", id, userId);
  // Cached displays, export and rollback may still reference this photo.
  // Only the bounded, reference-aware sweep removes files after its grace period.
  void preservePhotoUri;
  notifyChanged(userId);
  }));
}

/** A concurrent local edit must survive acknowledgement of an older replay. */
export async function acknowledgeKeepsake(expected: Keepsake) {
  return withLocalOwnerAccess(expected.userId,async()=>{
  const db = await database();
  let removed = false;
  await db.withExclusiveTransactionAsync(async transaction => {
    const row = await transaction.getFirstAsync<KeepsakeRow>(
      "SELECT * FROM keepsakes WHERE id = ? AND user_id = ?", expected.id, expected.userId,
    );
    if (!sameKeepsakeOutbox(expected, row ? fromRow(row) : null)) return;
    const result = await transaction.runAsync(
      "DELETE FROM keepsakes WHERE id = ? AND user_id = ?", expected.id, expected.userId,
    );
    removed = result.changes === 1;
  });
  // Keep the source image conservatively. A newer edit or cached display can
  // still reference it; safe orphan cleanup is separate from queue completion.
  if (removed) notifyChanged(expected.userId);
  return removed;
  });
}

/** Replaces only one owner's rows. File removal is deliberately handled by the caller after commit. */
export async function replaceKeepsakesForOwner(userId: string, items: Keepsake[]) {
  if (items.some((item) => item.userId !== userId)) throw new Error("Bản sao chứa kỷ vật của tài khoản khác.");
  return withLocalOwnerAccess(userId,async()=>{
  const db = await database();
  await db.withExclusiveTransactionAsync(async (transaction) => {
    await transaction.runAsync("DELETE FROM keepsakes WHERE user_id = ?", userId);
    for (const item of items) await transaction.runAsync(
      `INSERT INTO keepsakes (id,user_id,title,amount,date,note,photo_uri,category,warranty_until,return_until,remote_version,media_path,photo_upload_required)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      item.id, userId, item.title, item.amount, item.date, item.note, item.photoUri,
      item.category, item.warrantyUntil, item.returnUntil, item.version ?? null, item.mediaPath ?? null,
      item.photoUploadRequired === undefined ? null : item.photoUploadRequired ? 1 : 0,
    );
  });
  notifyChanged(userId);
  });
}

export async function purgeRetiredKeepsakeOwner(owner:string){
  await purgeKeepsakeOwner(owner,{
    root:Paths.document.uri,isRetired:isOfflineCacheOwnerRetired,
    directory:(root,namespace,id)=>new Directory(root,namespace,id).uri.replace(/\/$/,""),
    removeDirectory:async uri=>{const dir=new Directory(uri);if(dir.exists){try{dir.delete();}catch(error){if(dir.exists)throw error;}}},
    database,
  });
  notifyChanged(owner);
}
