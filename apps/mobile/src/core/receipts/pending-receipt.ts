import * as Crypto from "expo-crypto";
import { Directory, File, Paths } from "expo-file-system";
import * as SQLite from "expo-sqlite";
import type { CreateTransactionRequest, ReceiptLineItemInput } from "@picket/domain";
import { decryptLocalPayload, encryptLocalPayload } from "@/core/sync/offline-cache";
import { createReceiptRequestJournal, parseReceiptRequest } from "./receipt-request-journal";

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
    return db;
  });
  return databasePromise;
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
  const operation = (handoffs.get(id) ?? Promise.resolve()).catch(() => undefined)
    .then(() => persistPendingReceiptDraft({ ...input, id }));
  handoffs.set(id, operation);
  void operation.finally(() => { if (handoffs.get(id) === operation) handoffs.delete(id); }).catch(() => undefined);
  return operation;
}

async function persistPendingReceiptDraft(input: PendingReceiptInput & { id: string }) {
  const { id } = input;
  const db = await database();
  const claimed = await db.getFirstAsync<{ user_id: string }>("SELECT user_id FROM pending_receipt_drafts WHERE id=?", id);
  if (claimed && claimed.user_id !== input.userId) throw new Error("Pending receipt owner mismatch");
  const existing = claimed ? await getPendingReceiptDraft(id, input.userId) : null;
  // Keep the original image/payload once upload or transaction submission has
  // made progress. A retry must not acquire a new idempotency identity.
  if (existing?.storagePath || existing?.transactionId || existing?.transactionRequest) return existing;
  const folder = new Directory(Paths.document, "receipt-drafts");
  folder.create({ idempotent: true, intermediates: true });
  const destination = existing ? new File(existing.imageUri) : new File(folder, `${id}.${extensionOf(input.imageUri)}`);
  const createdImage = !existing;
  if (createdImage) {
    const temp = new File(folder, `${id}-${Crypto.randomUUID()}.tmp`);
    try {
      await new File(input.imageUri).copy(temp);
      // A prior process may have died before committing this unreferenced ID.
      if (destination.exists) destination.delete();
      temp.move(destination);
    } finally { if (temp.exists) temp.delete(); }
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
    const persisted = await getPendingReceiptDraft(id, input.userId);
    if (!persisted) throw new Error("Pending receipt was not persisted");
    return persisted;
  } catch (error) {
    // An ambiguous local write must not delete an image referenced by a row
    // that actually committed. Keep the file if even the readback fails.
    if (createdImage) {
      try { if (!await getPendingReceiptDraft(id, input.userId) && destination.exists) destination.delete(); } catch { /* Safe orphan cleanup can retry later. */ }
    }
    throw error;
  }
}

export async function getPendingReceiptDraft(id: string, userId: string) {
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
  }>(
    `SELECT id, user_id, image_uri, merchant, amount, purchased_at, confidence,
            provider, review_required, raw_text, line_items_json, storage_path,
            transaction_id, created_at, transaction_request_payload
       FROM pending_receipt_drafts WHERE id = ? AND user_id = ?`,
    id,
    userId,
  );
  if (!row) return null;
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
  } satisfies PendingReceiptDraft;
}

const receiptRequestJournal = createReceiptRequestJournal({
  read: async (owner,id) => (await getPendingReceiptDraft(id,owner))?.transactionRequest ?? null,
  saveFirst: async (owner,id,request) => {
    const payload = await encryptLocalPayload(request, `pending-receipt-request:${owner}:${id}`);
    await (await database()).runAsync("UPDATE pending_receipt_drafts SET transaction_request_payload=COALESCE(transaction_request_payload,?) WHERE id=? AND user_id=?",payload,id,owner);
  },
});
export async function pinPendingReceiptRequest(draft: PendingReceiptDraft, request: CreateTransactionRequest) {
  const transactionRequest = await receiptRequestJournal.pin(draft.userId,draft.id,request);
  return { ...draft, transactionRequest };
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
}

export async function removePendingReceiptDraft(draft: PendingReceiptDraft) {
  const db = await database();
  await db.runAsync(
    "DELETE FROM pending_receipt_drafts WHERE id = ? AND user_id = ?",
    draft.id,
    draft.userId,
  );
  const file = new File(draft.imageUri);
  if (file.exists) file.delete();
}
