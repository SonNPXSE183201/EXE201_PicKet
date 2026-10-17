import * as Crypto from "expo-crypto";
import { Directory, File, Paths } from "expo-file-system";
import * as SQLite from "expo-sqlite";
import { nextKeepsakePhotoUploadRequired } from "./keepsake-outbox-policy";

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
      CREATE TABLE IF NOT EXISTS keepsakes (
        id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, title TEXT NOT NULL,
        amount INTEGER NOT NULL, date TEXT NOT NULL, note TEXT NOT NULL,
        photo_uri TEXT, category TEXT NOT NULL, warranty_until TEXT,
        return_until TEXT
      );
      CREATE INDEX IF NOT EXISTS keepsakes_owner_idx ON keepsakes(user_id, date);
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
  return databasePromise;
}

function fromRow(row: KeepsakeRow): Keepsake {
  return { id: row.id, userId: row.user_id, title: row.title, amount: row.amount,
    date: row.date, note: row.note, photoUri: row.photo_uri, category: row.category,
    warrantyUntil: row.warranty_until, returnUntil: row.return_until,
    version: row.remote_version ?? undefined, mediaPath: row.media_path,
    photoUploadRequired: row.photo_upload_required === null ? undefined : row.photo_upload_required === 1 };
}

export async function listKeepsakes(userId: string): Promise<Keepsake[]> {
  const db = await database();
  const rows = await db.getAllAsync<KeepsakeRow>("SELECT * FROM keepsakes WHERE user_id = ? ORDER BY date DESC", userId);
  return rows.map(fromRow);
}

export async function saveKeepsake(input: Omit<Keepsake, "id"> & { id?: string; pickedPhotoUri?: string | null }): Promise<Keepsake> {
  const db = await database();
  const id = input.id ?? Crypto.randomUUID();
  const photoUploadRequired = nextKeepsakePhotoUploadRequired(input);
  let photoUri = input.photoUri;
  let copied: File | null = null;
  if (input.pickedPhotoUri) {
    const directory = new Directory(Paths.document, "keepsakes", input.userId);
    directory.create({ idempotent: true, intermediates: true });
    const extension = input.pickedPhotoUri.match(/\.(jpe?g|png|webp)(?:\?|$)/i)?.[1]?.toLowerCase() ?? "jpg";
    copied = new File(directory, `${Crypto.randomUUID()}.${extension}`);
    await new File(input.pickedPhotoUri).copy(copied);
    photoUri = copied.uri;
  }
  try {
    await db.runAsync(
      `INSERT INTO keepsakes (id,user_id,title,amount,date,note,photo_uri,category,warranty_until,return_until,remote_version,media_path,photo_upload_required)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET title=excluded.title,amount=excluded.amount,date=excluded.date,
       note=excluded.note,photo_uri=excluded.photo_uri,category=excluded.category,
       warranty_until=excluded.warranty_until,return_until=excluded.return_until,
       remote_version=excluded.remote_version,media_path=excluded.media_path,photo_upload_required=excluded.photo_upload_required
       WHERE keepsakes.user_id=excluded.user_id`,
      id, input.userId, input.title, input.amount, input.date, input.note, photoUri,
      input.category, input.warrantyUntil, input.returnUntil, input.version ?? null, input.mediaPath ?? null, photoUploadRequired ? 1 : 0,
    );
  } catch (error) {
    if (copied?.exists) copied.delete();
    throw error;
  }
  if (input.photoUri && photoUri !== input.photoUri) {
    const old = new File(input.photoUri);
    if (old.exists) old.delete();
  }
  notifyChanged(input.userId);
  return { id, userId: input.userId, title: input.title, amount: input.amount,
    date: input.date, note: input.note, photoUri, category: input.category,
    warrantyUntil: input.warrantyUntil, returnUntil: input.returnUntil,
    version: input.version, mediaPath: input.mediaPath, photoUploadRequired };
}

export async function deleteKeepsake(id: string, userId: string, preservePhotoUri?: string | null) {
  const db = await database();
  const row = await db.getFirstAsync<KeepsakeRow>("SELECT * FROM keepsakes WHERE id = ? AND user_id = ?", id, userId);
  if (!row) return;
  await db.runAsync("DELETE FROM keepsakes WHERE id = ? AND user_id = ?", id, userId);
  if (row.photo_uri && row.photo_uri !== preservePhotoUri) {
    const file = new File(row.photo_uri);
    if (file.exists) file.delete();
  }
  notifyChanged(userId);
}

/** Replaces only one owner's rows. File removal is deliberately handled by the caller after commit. */
export async function replaceKeepsakesForOwner(userId: string, items: Keepsake[]) {
  if (items.some((item) => item.userId !== userId)) throw new Error("Bản sao chứa kỷ vật của tài khoản khác.");
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
}
