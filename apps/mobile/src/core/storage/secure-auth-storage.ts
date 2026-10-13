import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const chunkSize = 1800;

function safeKey(key: string): string {
  return key.replace(/[^A-Za-z0-9._-]/g, "_");
}

function chunkKey(key: string, index: number): string {
  return `${safeKey(key)}.${index}`;
}

function metadataKey(key: string): string {
  return `${safeKey(key)}.chunks`;
}

async function secureGetItem(key: string): Promise<string | null> {
  const rawCount = await SecureStore.getItemAsync(metadataKey(key));
  if (rawCount === null) return SecureStore.getItemAsync(safeKey(key));
  const count = Number.parseInt(rawCount, 10);
  if (!Number.isSafeInteger(count) || count < 0 || count > 100) return null;
  const values = await Promise.all(
    Array.from({ length: count }, (_, index) =>
      SecureStore.getItemAsync(chunkKey(key, index)),
    ),
  );
  return values.some((value) => value === null) ? null : values.join("");
}

async function secureSetItem(key: string, value: string): Promise<void> {
  const oldCount = Number.parseInt(
    (await SecureStore.getItemAsync(metadataKey(key))) ?? "0",
    10,
  );
  const chunks = value.match(new RegExp(`.{1,${chunkSize}}`, "gs")) ?? [];
  await Promise.all(
    chunks.map((chunk, index) =>
      SecureStore.setItemAsync(chunkKey(key, index), chunk),
    ),
  );
  await SecureStore.setItemAsync(metadataKey(key), String(chunks.length));
  await SecureStore.deleteItemAsync(safeKey(key));
  if (Number.isSafeInteger(oldCount) && oldCount > chunks.length) {
    await Promise.all(
      Array.from({ length: oldCount - chunks.length }, (_, index) =>
        SecureStore.deleteItemAsync(chunkKey(key, chunks.length + index)),
      ),
    );
  }
}

async function secureRemoveItem(key: string): Promise<void> {
  const count = Number.parseInt(
    (await SecureStore.getItemAsync(metadataKey(key))) ?? "0",
    10,
  );
  if (Number.isSafeInteger(count) && count > 0 && count <= 100) {
    await Promise.all(
      Array.from({ length: count }, (_, index) =>
        SecureStore.deleteItemAsync(chunkKey(key, index)),
      ),
    );
  }
  await Promise.all([
    SecureStore.deleteItemAsync(metadataKey(key)),
    SecureStore.deleteItemAsync(safeKey(key)),
  ]);
}

export const secureAuthStorage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === "web") return globalThis.localStorage?.getItem(key) ?? null;
    return secureGetItem(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") {
      globalThis.localStorage?.setItem(key, value);
      return;
    }
    await secureSetItem(key, value);
  },
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === "web") {
      globalThis.localStorage?.removeItem(key);
      return;
    }
    await secureRemoveItem(key);
  },
};
