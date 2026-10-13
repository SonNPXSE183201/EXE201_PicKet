import * as Crypto from "expo-crypto";
import { Directory, File, Paths } from "expo-file-system";
import * as SQLite from "expo-sqlite";
import type { ReceiptLineItemInput } from "@picket/domain";

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
    return db;
  });
  return databasePromise;
}

function extensionOf(uri: string) {
  const match = uri.match(/\.(jpe?g|png|webp)(?:\?.*)?$/i);
  return (match?.[1] ?? "jpg").toLowerCase().replace("jpeg", "jpg");
}

export async function savePendingReceiptDraft(input: Omit<PendingReceiptDraft, "id" | "imageUri" | "createdAt"> & { imageUri: string }) {
  const id = Crypto.randomUUID();
  const folder = new Directory(Paths.document, "receipt-drafts");
  folder.create({ idempotent: true, intermediates: true });
  const destination = new File(folder, `${id}.${extensionOf(input.imageUri)}`);
  await new File(input.imageUri).copy(destination);

  const draft: PendingReceiptDraft = {
    ...input,
    id,
    imageUri: destination.uri,
    createdAt: new Date().toISOString(),
  };
  const db = await database();
  try {
    await db.runAsync(
      `INSERT INTO pending_receipt_drafts
       (id, user_id, image_uri, merchant, amount, purchased_at, confidence,
        provider, review_required, raw_text, line_items_json, storage_path,
        transaction_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
    return draft;
  } catch (error) {
    if (destination.exists) destination.delete();
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
  }>(
    `SELECT id, user_id, image_uri, merchant, amount, purchased_at, confidence,
            provider, review_required, raw_text, line_items_json, storage_path,
            transaction_id, created_at
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
  } satisfies PendingReceiptDraft;
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
