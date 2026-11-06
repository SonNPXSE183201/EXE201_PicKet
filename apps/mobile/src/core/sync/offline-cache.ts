import { fromByteArray, toByteArray } from "base64-js";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import * as SQLite from "expo-sqlite";
import { cacheCipher } from "./cache-cipher";
import { createOwnerCacheLifecycle } from "./owner-cache-lifecycle";
import { createOwnerCacheDatabaseDriver, ownerCacheRetirementSchema } from "./owner-cache-database";

export type CachedResource = "pocket-appearance" | "learning-assessment" | "forecast-observations" | "cashflow-settlements" | "cashflow-schedules" | "learning-weekly" | "learning-attempts" | "learning-draft" | "learning-progress" | "profile" | "accounts" | "categories" | "transactions" | "budgets" | "bills" | "subscriptions" | "keepsakes" | "guest-finance" | "receipt-gallery" | "receipt-images" | "receipt-thumbnails" | "reconciliation-requests" | "spending-splits";
type CacheRow = { nonce: string; ciphertext: string; updated_at: string };
const keyName = "picket_offline_cache_key_v1";
let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;
let keyPromise: Promise<Uint8Array> | null = null;

async function database() {
  databasePromise ??= SQLite.openDatabaseAsync("picket-offline.db").then(async (db) => {
    await db.execAsync(`CREATE TABLE IF NOT EXISTS cached_resources (
      user_id TEXT NOT NULL, resource TEXT NOT NULL, nonce TEXT NOT NULL,
      ciphertext TEXT NOT NULL, updated_at TEXT NOT NULL,
      PRIMARY KEY (user_id, resource)
    );
    ${ownerCacheRetirementSchema}`);
    return db;
  });
  const attempt = databasePromise;
  try { return await attempt; }
  catch (error) {
    if (databasePromise === attempt) databasePromise = null;
    throw error;
  }
}

const lifecycle = createOwnerCacheLifecycle(createOwnerCacheDatabaseDriver(database));

export const retireOfflineCacheOwner = lifecycle.retire;
export const isOfflineCacheOwnerRetired = lifecycle.isRetired;
export const recoverOfflineCacheOwner = lifecycle.recover;
export const withLocalOwnerAccess = lifecycle.run;

async function deviceKey() {
  keyPromise ??= (async () => {
    const stored = await SecureStore.getItemAsync(keyName);
    if (stored) {
      const key = toByteArray(stored);
      if (key.length !== 32) throw new Error("Offline cache key is invalid.");
      return key;
    }
    const key = await Crypto.getRandomBytesAsync(32);
    await SecureStore.setItemAsync(keyName, fromByteArray(key));
    return key;
  })();
  try { return await keyPromise; }
  catch (error) { keyPromise = null; throw error; }
}

export async function encryptLocalPayload(value: unknown, owner: string): Promise<string> {
  const nonce = await Crypto.getRandomBytesAsync(12);
  const plain = new TextEncoder().encode(JSON.stringify(value));
  const ciphertext = await cacheCipher.seal(await deviceKey(), nonce, plain, new TextEncoder().encode(owner));
  return `enc-v1:${fromByteArray(nonce)}:${ciphertext}`;
}

export async function decryptLocalPayload<T>(payload: string, owner: string): Promise<T> {
  // Existing installs have unencrypted pending rows. Read them without deleting
  // user changes; callers migrate each row after a successful decode.
  if (!payload.startsWith("enc-v1:")) return JSON.parse(payload) as T;
  const parts = payload.split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted local payload.");
  const nonce = toByteArray(parts[1]);
  if (nonce.length !== 12) throw new Error("Invalid encrypted local nonce.");
  const bytes = await cacheCipher.open(await deviceKey(), parts[1], parts[2], new TextEncoder().encode(owner));
  return JSON.parse(new TextDecoder().decode(bytes)) as T;
}

export async function readOfflineCache<T>(userId: string, resource: CachedResource): Promise<{ value: T; updatedAt: string } | null> {
  return lifecycle.run(userId, async () => {
    const db = await database();
    const row = await db.getFirstAsync<CacheRow>(
      "SELECT nonce, ciphertext, updated_at FROM cached_resources WHERE user_id = ? AND resource = ?", userId, resource,
    );
    if (!row) return null;
    const nonce = toByteArray(row.nonce);
    if (nonce.length !== 12) throw new Error("Offline cache nonce is invalid.");
    const plain = await cacheCipher.open(await deviceKey(), row.nonce, row.ciphertext);
    return { value: JSON.parse(new TextDecoder().decode(plain)) as T, updatedAt: row.updated_at };
  });
}

async function persist<T>(userId: string, resource: CachedResource, value: T) {
  const nonce = await Crypto.getRandomBytesAsync(12);
  const plain = new TextEncoder().encode(JSON.stringify(value));
  const ciphertext = await cacheCipher.seal(await deviceKey(), nonce, plain);
  const db = await database();
  await db.runAsync(
    `INSERT INTO cached_resources (user_id, resource, nonce, ciphertext, updated_at) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id, resource) DO UPDATE SET nonce = excluded.nonce,
       ciphertext = excluded.ciphertext, updated_at = excluded.updated_at`,
    userId, resource, fromByteArray(nonce), ciphertext, new Date().toISOString(),
  );
}

export function writeOfflineCache<T>(userId: string, resource: CachedResource, value: T): Promise<void> {
  return lifecycle.run(userId, () => persist(userId, resource, value));
}
