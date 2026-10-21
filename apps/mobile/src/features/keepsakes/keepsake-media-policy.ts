import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import type { Keepsake } from "./keepsake-store";

/** Distinguish an already durable save from failure to write anything locally. */
export class KeepsakePendingError extends Error {
  constructor(readonly cause: unknown) {
    super("Kỷ vật đã lưu trên điện thoại và đang chờ xác nhận đồng bộ.");
    this.name = "KeepsakePendingError";
  }
}

export async function saveDurableKeepsake<Pending, Saved>(options: {
  persist(): Promise<Pending>;
  send(pending: Pending): Promise<Saved>;
  cache(saved: Saved): Promise<void>;
  acknowledge(pending: Pending): Promise<boolean>;
}): Promise<Saved> {
  // No network/upload side effects are allowed before this commit completes.
  const pending = await options.persist();
  try {
    const saved = await options.send(pending);
    await options.cache(saved);
    await options.acknowledge(pending);
    return saved;
  } catch (error) {
    throw new KeepsakePendingError(error);
  }
}

const ownerOperations = new Map<string, Promise<unknown>>();
/** Keep a background replay from racing an explicit save of the same owner. */
export function withKeepsakeOwnerLock<T>(owner: string, action: () => Promise<T>): Promise<T> {
  const previous = ownerOperations.get(owner) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(action);
  ownerOperations.set(owner, next);
  void next.finally(() => {
    if (ownerOperations.get(owner) === next) ownerOperations.delete(owner);
  }).catch(() => undefined);
  return next;
}

export type KeepsakePhotoCleanup = { itemId: string; obsoletePath: string; replacementPath: string };

export function canCleanupKeepsakePhoto(owner: string, task: KeepsakePhotoCleanup,
  fresh: { id: string; mediaPath?: string | null }[], pending: { mediaPath?: string | null }[]) {
  const prefix = `${owner}/keepsakes/`;
  const ownedPath = (path: string) => path.startsWith(prefix)
    && /^[a-zA-Z0-9_.-]+$/.test(path.slice(prefix.length)) && !path.slice(prefix.length).includes("..");
  return /^[a-zA-Z0-9_-]+$/.test(owner) && ownedPath(task.obsoletePath) && ownedPath(task.replacementPath)
    && task.obsoletePath !== task.replacementPath
    && fresh.some(item => item.id === task.itemId && item.mediaPath === task.replacementPath)
    && ![...fresh, ...pending].some(item => item.mediaPath === task.obsoletePath);
}

export function keepsakeCacheFileName(id: string, mediaPath: string) {
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error("Invalid keepsake cache ID.");
  const extension = mediaPath.match(/\.(jpg|jpeg|png|webp)$/i)?.[1]?.toLowerCase() ?? "jpg";
  return `${id}-${bytesToHex(sha256(new TextEncoder().encode(mediaPath)))}.${extension}`;
}

/** Expo File.move changes the handle URI; cleanup must run only on failure. */
export async function commitKeepsakePhotoDownload(options: {
  download(): Promise<void>;
  commit(): string;
  discard(): void;
}) {
  try {
    await options.download();
    return options.commit();
  } catch (error) {
    try { options.discard(); } catch { /* Preserve the original download error. */ }
    throw error;
  }
}

const outboxFields = ["id", "userId", "title", "amount", "date", "note", "photoUri", "category", "warrantyUntil", "returnUntil", "version", "mediaPath", "photoUploadRequired"] as const;

export function sameKeepsakeOutbox(expected: Keepsake, current: Keepsake | null) {
  return current !== null && outboxFields.every(field => expected[field] === current[field]);
}

/** Keep pending data until the confirmed remote row is durable locally. */
export async function persistKeepsakeReplay(options: {
  persist: () => Promise<void>;
  acknowledge: () => Promise<boolean>;
}) {
  await options.persist();
  return options.acknowledge();
}

/** Fresh server data may acknowledge a lost response; stale cache must never call this. */
export function isKeepsakeReplayConfirmed(pending: Keepsake, remote: Keepsake, mediaPath: string | null) {
  return pending.id === remote.id && pending.userId === remote.userId
    && (remote.version ?? 0) > (pending.version ?? 0)
    && remote.mediaPath === mediaPath
    && pending.title === remote.title && pending.amount === remote.amount
    && Date.parse(pending.date) === Date.parse(remote.date)
    && pending.note === remote.note && pending.category === remote.category
    && pending.warrantyUntil === remote.warrantyUntil && pending.returnUntil === remote.returnUntil;
}

/** Retrying identical bytes cannot allocate another object, even after restart. */
export function keepsakePhotoPath(owner: string, id: string, bytes: Uint8Array, extension: "jpg" | "png" | "webp") {
  if (![owner, id].every(value => /^[a-zA-Z0-9_-]+$/.test(value))) throw new Error("Invalid photo owner or item ID.");
  return `${owner}/keepsakes/${id}-${bytesToHex(sha256(bytes))}.${extension}`;
}

export async function saveWithKeepsakePhoto<T>(options: {
  previousPath?: string | null;
  upload: () => Promise<string | null>;
  mutate: (path: string | null) => Promise<T>;
  remove: (path: string) => Promise<unknown>;
}): Promise<T> {
  const uploadedPath = await options.upload();
  // A rejected promise can mean the server committed but its response was lost.
  // Never delete the new object on that ambiguous path: a live row may own it.
  const result = await options.mutate(uploadedPath ?? options.previousPath ?? null);
  if (uploadedPath && options.previousPath && options.previousPath !== uploadedPath) {
    try { await options.remove(options.previousPath); }
    catch { /* A confirmed save must not appear failed because cleanup failed. */ }
  }
  return result;
}
