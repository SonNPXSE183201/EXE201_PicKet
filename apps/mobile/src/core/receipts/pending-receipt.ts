import * as Crypto from "expo-crypto";
import { Directory, File, Paths } from "expo-file-system";
import * as SQLite from "expo-sqlite";
import type { CreateTransactionRequest, ReceiptLineItemInput } from "@picket/domain";
import { decryptLocalPayload, encryptLocalPayload, withLocalOwnerAccess, isOfflineCacheOwnerRetired } from "@/core/sync/offline-cache";
import { createReceiptRequestJournal, parseReceiptRequest } from "./receipt-request-journal";
import { purgeReceiptOwner, receiptImageIsOwned } from "./receipt-retirement";

export type PendingReceiptDraft = {
  id: string;
  userId: string;
  imageUri: string;
  merchant: string;
  amount: number;
  purchasedAt: string | null;
  confidence: number | null;
  provider: "ml-kit" | "pp-ocr" | "manual";
  reviewRequired: boolean;
  rawText: string | null;
  lineItems: ReceiptLineItemInput[];
  storagePath: string | null;
  transactionId: string | null;
  createdAt: string;
  transactionRequest: CreateTransactionRequest | null;
  transactionAttemptId?: string;
};

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function database() {
  databasePromise ??= SQLite.openDatabaseAsync("picket-sync.db").then(async (db) => {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS pending_receipt_drafts (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        image_uri TEXT NOT NULL,
        merchant TEXT NOT NULL,
        amount INTEGER NOT NULL,
        purchased_at TEXT,
        confidence REAL,
        provider TEXT NOT NULL,
        review_required INTEGER NOT NULL,
        raw_text TEXT,
        line_items_json TEXT NOT NULL DEFAULT '[]',
        storage_path TEXT,
        transaction_id TEXT,
        transaction_request_payload TEXT,
        transaction_attempt_id TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS pending_receipt_drafts_owner_idx
        ON pending_receipt_drafts(user_id, created_at);
    `);
    const columns = await db.getAllAsync<{ name: string }>(
      "PRAGMA table_info(pending_receipt_drafts)",
    );
    if (!columns.some((column) => column.name === "line_items_json")) {
      await db.execAsync(
        "ALTER TABLE pending_receipt_drafts ADD COLUMN line_items_json TEXT NOT NULL DEFAULT '[]'",
      );
    }
    if (!columns.some((column) => column.name === "transaction_request_payload")) await db.execAsync("ALTER TABLE pending_receipt_drafts ADD COLUMN transaction_request_payload TEXT");
    if (!columns.some((column) => column.name === "transaction_attempt_id")) await db.execAsync("ALTER TABLE pending_receipt_drafts ADD COLUMN transaction_attempt_id TEXT");
    return db;
  });
  const attempt=databasePromise;
  try{return await attempt;}catch(error){if(databasePromise===attempt)databasePromise=null;throw error;}
}

function extensionOf(uri: string) {
  const match = uri.match(/\.(jpe?g|png|webp)(?:\?.*)?$/i);
  return (match?.[1] ?? "jpg").toLowerCase().replace("jpeg", "jpg");
}

type PendingReceiptInput = Omit<PendingReceiptDraft, "id" | "imageUri" | "createdAt" | "transactionRequest"> & { imageUri: string; id?: string };
const handoffs = new Map<string, Promise<PendingReceiptDraft>>();

export function savePendingReceiptDraft(input: PendingReceiptInput) {
  const id = input.id ?? Crypto.randomUUID();
  if (!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(id)) return Promise.reject(new Error("Invalid pending receipt identity"));
  const previous=handoffs.get(id)??Promise.resolve();
  const operation = withLocalOwnerAccess(input.userId,()=>previous.catch(() => undefined)
    .then(() => persistPendingReceiptDraft({ ...input, id })));
  handoffs.set(id, operation);
  void operation.finally(() => { if (handoffs.get(id) === operation) handoffs.delete(id); }).catch(() => undefined);
  return operation;
}

async function persistPendingReceiptDraft(input: PendingReceiptInput & { id: string }) {
  const { id } = input;
  const db = await database();
  const claimed = await db.getFirstAsync<{ user_id: string }>("SELECT user_id FROM pending_receipt_drafts WHERE id=?", id);
  if (claimed && claimed.user_id !== input.userId) throw new Error("Pending receipt owner mismatch");
  const existing = claimed ? await getStoredPendingReceiptDraft(id, input.userId) : null;
  // Keep the original image/payload once upload or transaction submission has
  // made progress. A retry must not acquire a new idempotency identity.
  if (existing?.storagePath || existing?.transactionId || existing?.transactionRequest) return existing;
  const folder = new Directory(Paths.document, "receipt-drafts", input.userId);
  folder.create({ idempotent: true, intermediates: true });
  const destination = existing ? new File(existing.imageUri) : new File(folder, `${id}.${extensionOf(input.imageUri)}`);
  if(!receiptImageIsOwned(Paths.document.uri,input.userId,id,destination.uri))throw Error("Invalid pending receipt image");
  // A process interrupted before submission may have left metadata without
  // its copy. The intact capture can repair it, but never replace an image
  // once a canonical request or remote progress has been pinned above.
  const createdImage = !existing || !destination.exists;
  if (createdImage) {
    const temp = new File(folder, `${id}-${Crypto.randomUUID()}.tmp`);
    const tempUri = temp.uri;
    try {
      await new File(input.imageUri).copy(temp);
      // A prior process may have died before committing this unreferenced ID.
      if (destination.exists) destination.delete();
      await temp.move(destination);
    } finally {
      // File.move mutates the File instance URI; never delete its new target.
      if (temp.uri === tempUri && temp.exists) temp.delete();
    }
  }

  const draft: PendingReceiptDraft = {
    ...input,
    id,
    imageUri: destination.uri,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    transactionRequest: null,
  };
  try {
    await db.runAsync(
      `INSERT INTO pending_receipt_drafts
       (id, user_id, image_uri, merchant, amount, purchased_at, confidence,
        provider, review_required, raw_text, line_items_json, storage_path,
        transaction_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         merchant=excluded.merchant, amount=excluded.amount,
         purchased_at=excluded.purchased_at, confidence=excluded.confidence,
         provider=excluded.provider, review_required=excluded.review_required,
         raw_text=excluded.raw_text, line_items_json=excluded.line_items_json
       WHERE pending_receipt_drafts.user_id=excluded.user_id
         AND pending_receipt_drafts.transaction_id IS NULL
         AND pending_receipt_drafts.storage_path IS NULL
         AND pending_receipt_drafts.transaction_request_payload IS NULL`,
      draft.id,
      draft.userId,
      draft.imageUri,
      draft.merchant,
      draft.amount,
      draft.purchasedAt,
      draft.confidence,
      draft.provider,
      draft.reviewRequired ? 1 : 0,
      draft.rawText,
      JSON.stringify(draft.lineItems),
      draft.storagePath,
      draft.transactionId,
      draft.createdAt,
    );
    const persisted = await getStoredPendingReceiptDraft(id, input.userId);
    if (!persisted) throw new Error("Pending receipt was not persisted");
    return persisted;
  } catch (error) {
    // An ambiguous local write must not delete an image referenced by a row
    // that actually committed. Keep the file if even the readback fails.
    if (createdImage) {
      try { if (!await getStoredPendingReceiptDraft(id, input.userId) && destination.exists) destination.delete(); } catch { /* Safe orphan cleanup can retry later. */ }
    }
    throw error;
  }
}

async function getStoredPendingReceiptDraft(id: string, userId: string) {
  const db = await database();
  const row = await db.getFirstAsync<{
    id: string;
    user_id: string;
    image_uri: string;
    merchant: string;
    amount: number;
    purchased_at: string | null;
    confidence: number | null;
    provider: PendingReceiptDraft["provider"];
    review_required: number;
    raw_text: string | null;
    line_items_json: string;
    storage_path: string | null;
    transaction_id: string | null;
    created_at: string;
    transaction_request_payload: string | null;
    transaction_attempt_id: string | null;
  }>(
    `SELECT id, user_id, image_uri, merchant, amount, purchased_at, confidence,
            provider, review_required, raw_text, line_items_json, storage_path,
            transaction_id, created_at, transaction_request_payload, transaction_attempt_id
       FROM pending_receipt_drafts WHERE id = ? AND user_id = ?`,
    id,
    userId,
  );
  if (!row) return null;
  if(!receiptImageIsOwned(Paths.document.uri,userId,id,row.image_uri))throw Error("Pending receipt image ownership mismatch");
  return {
    id: row.id,
    userId: row.user_id,
    imageUri: row.image_uri,
    merchant: row.merchant,
    amount: row.amount,
    purchasedAt: row.purchased_at,
    confidence: row.confidence,
    provider: row.provider,
    reviewRequired: row.review_required === 1,
    rawText: row.raw_text,
    lineItems: parseLineItems(row.line_items_json),
    storagePath: row.storage_path,
    transactionId: row.transaction_id,
    createdAt: row.created_at,
    transactionRequest: row.transaction_request_payload === null ? null : parseReceiptRequest(await decryptLocalPayload(row.transaction_request_payload, `pending-receipt-request:${userId}:${id}`)),
    transactionAttemptId: row.transaction_attempt_id ?? id,
  } satisfies PendingReceiptDraft;
}

export function getPendingReceiptDraft(id:string,userId:string){
 return withLocalOwnerAccess(userId,()=>getStoredPendingReceiptDraft(id,userId));
}

const receiptRequestJournal = createReceiptRequestJournal({
  read: async (owner,id) => (await getStoredPendingReceiptDraft(id,owner))?.transactionRequest ?? null,
  saveFirst: async (owner,id,request) => {
    const payload = await encryptLocalPayload(request, `pending-receipt-request:${owner}:${id}`);
    await (await database()).runAsync("UPDATE pending_receipt_drafts SET transaction_request_payload=COALESCE(transaction_request_payload,?) WHERE id=? AND user_id=?",payload,id,owner);
  },
});
export async function pinPendingReceiptRequest(draft: PendingReceiptDraft, request: CreateTransactionRequest) {
  return withLocalOwnerAccess(draft.userId,async()=>{
  const transactionRequest = await receiptRequestJournal.pin(draft.userId,draft.id,request);
  return { ...draft, transactionRequest };
  });
}

/** Call only after the server permanently fenced this exact old attempt. */
export async function resetPendingReceiptAttempt(draft: PendingReceiptDraft) {
  return withLocalOwnerAccess(draft.userId,async()=>{
  const db = await database();
  const row = await db.getFirstAsync<{ transaction_request_payload: string | null }>(
    "SELECT transaction_request_payload FROM pending_receipt_drafts WHERE id=? AND user_id=?", draft.id,draft.userId,
  );
  if (!row?.transaction_request_payload || draft.transactionId) throw new Error("Receipt attempt changed");
  const result = await db.runAsync(`UPDATE pending_receipt_drafts SET transaction_request_payload=NULL,
    transaction_attempt_id=? WHERE id=? AND user_id=? AND transaction_id IS NULL
    AND COALESCE(transaction_attempt_id,id)=? AND transaction_request_payload=?`,
    Crypto.randomUUID(),draft.id,draft.userId,draft.transactionAttemptId ?? draft.id,row.transaction_request_payload);
  if (result.changes !== 1) throw new Error("Receipt attempt changed");
  const next = await getStoredPendingReceiptDraft(draft.id,draft.userId);
  if (!next) throw new Error("Receipt draft disappeared");
  return next;
  });
}

function parseLineItems(raw: string): ReceiptLineItemInput[] {
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value) || value.length > 100) return [];
    return value.filter((item): item is ReceiptLineItemInput => {
      if (!item || typeof item !== "object") return false;
      const line = item as Partial<ReceiptLineItemInput>;
      return typeof line.name === "string" && line.name.length > 0 &&
        line.name.length <= 200 && typeof line.quantity === "number" &&
        line.quantity > 0 && typeof line.total === "number" &&
        Number.isSafeInteger(line.total) && line.total > 0 &&
        (line.unitPrice === undefined || line.unitPrice === null ||
          (Number.isSafeInteger(line.unitPrice) && line.unitPrice >= 0)) &&
        (line.confidence === undefined || line.confidence === null ||
          (typeof line.confidence === "number" && line.confidence >= 0 &&
            line.confidence <= 1));
    });
  } catch {
    return [];
  }
}

export async function updatePendingReceiptProgress(
  draft: PendingReceiptDraft,
  progress: { storagePath?: string; transactionId?: string },
) {
  return withLocalOwnerAccess(draft.userId,async()=>{
  const next = {
    storagePath: progress.storagePath ?? draft.storagePath,
    transactionId: progress.transactionId ?? draft.transactionId,
  };
  const db = await database();
  await db.runAsync(
    `UPDATE pending_receipt_drafts
        SET storage_path = ?, transaction_id = ?
      WHERE id = ? AND user_id = ?`,
    next.storagePath,
    next.transactionId,
    draft.id,
    draft.userId,
  );
  return { ...draft, ...next };
  });
}

export async function removePendingReceiptDraft(draft: PendingReceiptDraft) {
  return withLocalOwnerAccess(draft.userId,async()=>{
  const db = await database();
  const stored=await db.getFirstAsync<{image_uri:string}>("SELECT image_uri FROM pending_receipt_drafts WHERE id = ? AND user_id = ?",draft.id,draft.userId);
  if(!stored)return;
  const otherReference=await db.getFirstAsync("SELECT id FROM pending_receipt_drafts WHERE user_id <> ? AND lower(image_uri) = lower(?)",draft.userId,stored.image_uri);
  if(!otherReference&&receiptImageIsOwned(Paths.document.uri,draft.userId,draft.id,stored.image_uri)){
    const file=new File(stored.image_uri);
    if(file.exists){try{file.delete();}catch(error){if(file.exists)throw error;}}
  }
  await db.runAsync(
    "DELETE FROM pending_receipt_drafts WHERE id = ? AND user_id = ?",
    draft.id,
    draft.userId,
  );
  });
}

export async function purgeRetiredReceiptOwner(owner:string){
  await purgeReceiptOwner(owner,{
    root:Paths.document.uri,isRetired:isOfflineCacheOwnerRetired,
    directory:(root,id)=>new Directory(root,"receipt-drafts",id).uri.replace(/\/$/,""),
    files:async root=>{
      const dir=new Directory(root);
      return dir.exists?dir.list().filter((entry):entry is File=>entry instanceof File).map(file=>file.uri):[];
    },
    removeFile:async uri=>{const file=new File(uri);if(file.exists){try{file.delete();}catch(error){if(file.exists)throw error;}}},
    removeDirectory:async uri=>{const dir=new Directory(uri);if(dir.exists){try{dir.delete();}catch(error){if(dir.exists)throw error;}}},
    database,
  });
}
