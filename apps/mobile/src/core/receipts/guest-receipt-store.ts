import * as SQLite from "expo-sqlite";

import { guestOwnerId } from "@/core/local/guest-finance";
import { decryptLocalPayload, encryptLocalPayload } from "@/core/sync/offline-cache";
import { makeGuestReceipt, type GuestReceipt } from "./guest-receipt-model";

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;
async function database() {
  databasePromise ??= SQLite.openDatabaseAsync("picket-guest-receipts.db").then(async (db) => {
    await db.execAsync("CREATE TABLE IF NOT EXISTS receipts (transaction_id TEXT PRIMARY KEY NOT NULL, owner_id TEXT NOT NULL, encrypted_payload TEXT NOT NULL)");
    return db;
  });
  return databasePromise;
}

function owner(transactionId: string) { return `${guestOwnerId}:receipt:${transactionId}`; }

export async function saveGuestReceipt(receipt: GuestReceipt) {
  makeGuestReceipt(receipt);
  const payload = await encryptLocalPayload(receipt, owner(receipt.transactionId));
  const db = await database();
  await db.runAsync(
    "INSERT INTO receipts (transaction_id, owner_id, encrypted_payload) VALUES (?, ?, ?) ON CONFLICT(transaction_id) DO UPDATE SET encrypted_payload = excluded.encrypted_payload WHERE receipts.owner_id = excluded.owner_id",
    receipt.transactionId, guestOwnerId, payload,
  );
}

export async function getGuestReceipt(transactionId: string): Promise<GuestReceipt | null> {
  const db = await database();
  const row = await db.getFirstAsync<{ encrypted_payload: string }>("SELECT encrypted_payload FROM receipts WHERE transaction_id = ? AND owner_id = ?", transactionId, guestOwnerId);
  return row ? makeGuestReceipt(await decryptLocalPayload<GuestReceipt>(row.encrypted_payload, owner(transactionId))) : null;
}

export async function listGuestReceipts(): Promise<GuestReceipt[]> {
  const db = await database();
  const rows = await db.getAllAsync<{ transaction_id: string; encrypted_payload: string }>("SELECT transaction_id, encrypted_payload FROM receipts WHERE owner_id = ?", guestOwnerId);
  return Promise.all(rows.map(async (row) => makeGuestReceipt(await decryptLocalPayload<GuestReceipt>(row.encrypted_payload, owner(row.transaction_id)))));
}

export async function replaceGuestReceipts(receipts: GuestReceipt[]) {
  const encrypted = await Promise.all(receipts.map(async (receipt) => {
    makeGuestReceipt(receipt);
    return { id:receipt.transactionId, payload:await encryptLocalPayload(receipt, owner(receipt.transactionId)) };
  }));
  const db = await database();
  await db.withExclusiveTransactionAsync(async (transaction) => {
    await transaction.runAsync("DELETE FROM receipts WHERE owner_id = ?", guestOwnerId);
    for (const item of encrypted) await transaction.runAsync("INSERT INTO receipts (transaction_id, owner_id, encrypted_payload) VALUES (?, ?, ?)", item.id, guestOwnerId, item.payload);
  });
}
