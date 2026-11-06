import * as Crypto from "expo-crypto";
import { Directory, File, Paths } from "expo-file-system";
import { toByteArray } from "base64-js";
import type { Keepsake as RemoteKeepsake } from "@picket/domain";

import { picketApi } from "@/core/api/client";
import { supabase } from "@/core/supabase/client";
import { acknowledgeKeepsake, acknowledgeKeepsakePhotoCleanup, deleteKeepsake, enqueueKeepsakePhotoCleanup, listKeepsakePhotoCleanup, listKeepsakes, saveKeepsake, type Keepsake as LocalKeepsake } from "@/features/keepsakes/keepsake-store";
import { readOfflineCache, writeOfflineCache, withLocalOwnerAccess } from "@/core/sync/offline-cache";
import { loadWithKeepsakeCache } from "@/features/keepsakes/keepsake-cache-policy";
import { mergeKeepsakeOutbox, planKeepsakePhotoReplay, planKeepsakeReplay } from "@/features/keepsakes/keepsake-outbox-policy";
import { canCleanupKeepsakePhoto, isKeepsakeReplayConfirmed, keepsakeCacheFileName, keepsakePhotoPath, persistKeepsakeReplay, saveWithKeepsakePhoto, saveDurableKeepsake, withKeepsakeOwnerLock } from "./keepsake-media-policy";
import { readKeepsakePhoto, withKeepsakePhotoLease, writeKeepsakePhoto } from "./keepsake-photo-storage";

export type DisplayKeepsake = LocalKeepsake & { version?: number; mediaPath?: string | null };
const cloudListeners = new Set<(userId: string) => void>();
export function onCloudKeepsakesChanged(listener: (userId: string) => void) {
  cloudListeners.add(listener);
  return () => { cloudListeners.delete(listener); };
}
function announceCloudChange(userId: string) {
  for (const listener of cloudListeners) listener(userId);
}

async function photoUrl(path: string | null) {
  if (!path || !supabase) return null;
  const { data, error } = await supabase.storage.from("picket-media").createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}
async function toDisplay(item: RemoteKeepsake, userId: string): Promise<DisplayKeepsake> {
  let cachedPhotoUri: string | null = null;
  if (item.mediaPath) {
    const directory = new Directory(Paths.document, "keepsake-cloud-cache", userId);
    const name = keepsakeCacheFileName(item.id, item.mediaPath);
    const destination = new File(directory, `${name}.enc`);
    const legacy = new File(directory, name);
    try {
      if (destination.exists) {
        await readKeepsakePhoto(userId, destination.uri);
        cachedPhotoUri = destination.uri;
      } else if (legacy.exists) {
        cachedPhotoUri = await writeKeepsakePhoto(userId, toByteArray((await readKeepsakePhoto(userId, legacy.uri)).base64), name);
      } else {
        const response = await fetch((await photoUrl(item.mediaPath))!);
        if (!response.ok || Number(response.headers.get("content-length")) > 10_485_760) throw new Error("Photo unavailable");
        cachedPhotoUri = await writeKeepsakePhoto(userId, new Uint8Array(await response.arrayBuffer()), name);
      }
    } catch {
      if (legacy.exists) cachedPhotoUri = legacy.uri;
    }
  }
  return { id:item.id, userId, title:item.title, amount:item.amount, date:item.purchasedAt,
    note:item.note, photoUri:cachedPhotoUri, category:item.category,
    warrantyUntil:item.warrantyUntil, returnUntil:item.returnUntil,
    version:item.version, mediaPath:item.mediaPath, photoUploadRequired:false };
}

async function uploadPhoto(userId: string, itemId: string, uri: string, previousPath?: string | null) {
  if (!supabase) throw new Error("Supabase chưa được cấu hình.");
  const photo = await readKeepsakePhoto(userId, uri);
  const extension = photo.mime === "image/png" ? "png" : photo.mime === "image/webp" ? "webp" : "jpg";
  const body = toByteArray(photo.base64);
  const path = keepsakePhotoPath(userId, itemId, body, extension);
  if (previousPath && previousPath !== path) await enqueueKeepsakePhotoCleanup(userId, {
    itemId, obsoletePath: previousPath, replacementPath: path,
  });
  const type = extension === "png" ? "image/png" : extension === "webp" ? "image/webp" : "image/jpeg";
  const { error } = await withLocalOwnerAccess(userId,()=>supabase!.storage.from("picket-media").upload(path, body, { contentType:type, upsert:true }));
  if (error) throw error;
  return path;
}

export function loadKeepsakeCollection(token: string, userId: string): Promise<DisplayKeepsake[]> {
  return withKeepsakePhotoLease(userId, () => withKeepsakeOwnerLock(userId, () => replayKeepsakeCollection(token, userId)));
}

async function replayKeepsakeCollection(token: string, userId: string): Promise<DisplayKeepsake[]> {
  if (!picketApi) throw new Error("Chưa thể thực hiện lúc này. Hãy thử lại sau.");
  const api = picketApi;
  const local = await listKeepsakes(userId);
  const loaded = await loadWithKeepsakeCache<DisplayKeepsake>({
    loadRemote: async () => Promise.all(
      (await api.listKeepsakes(token)).keepsakes.map(
        (item) => toDisplay(item, userId),
      ),
    ),
    loadCached: async () =>
      (await readOfflineCache<DisplayKeepsake[]>(userId, "keepsakes"))?.value ?? null,
    saveCached: (items) => writeOfflineCache(userId, "keepsakes", items),
    fallback: local,
  });
  const remote = loaded.items;
  const migrated: DisplayKeepsake[] = [];
  for (const item of local) {
    try {
      const photo = planKeepsakePhotoReplay(item);
      const mediaPath = photo.uploadUri ? await uploadPhoto(userId, item.id, photo.uploadUri, item.mediaPath) : photo.mediaPath;
      const replay = planKeepsakeReplay(item);
      const payload = { title:item.title, amount:item.amount, purchasedAt:item.date,
        note:item.note, category:item.category, warrantyUntil:item.warrantyUntil,
        returnUntil:item.returnUntil, mediaPath:mediaPath ?? item.mediaPath ?? null };
      // A fresh matching row proves the prior mutation landed even when its
      // response was lost. Cached rows cannot acknowledge a pending mutation.
      const confirmed = !loaded.stale && remote.find(saved => isKeepsakeReplayConfirmed(item, saved, payload.mediaPath));
      const result = confirmed ? null : replay.action === "update"
        ? await picketApi.updateKeepsake(token, item.id, { ...payload, expectedVersion:replay.expectedVersion })
        : await picketApi.createKeepsake(token, { ...payload, id:item.id });
      const display = confirmed || await toDisplay(result!.keepsake, userId);
      await persistKeepsakeReplay({
        persist: () => writeOfflineCache(userId, "keepsakes", mergeKeepsakeOutbox(remote, [...migrated, display])),
        acknowledge: () => acknowledgeKeepsake(item),
      });
      migrated.push(display);
    } catch {
      // Preserve the local item and photo on any upload or API failure.
    }
  }
  const cloud = mergeKeepsakeOutbox(remote, migrated);
  // A save may have replaced a pending row while the network request ran.
  // Read the live queue instead of filtering the stale pre-request snapshot.
  const pending = await listKeepsakes(userId);
  // Never use stale cache as authority to delete an object. A failed removal
  // retains its durable journal row for a later fresh collection load.
  if (!loaded.stale && supabase) for (const task of await listKeepsakePhotoCleanup(userId)) {
    if (!canCleanupKeepsakePhoto(userId, task, cloud, pending)) continue;
    try {
      const { error } = await supabase.storage.from("picket-media").remove([task.obsoletePath]);
      if (error) throw error;
      await acknowledgeKeepsakePhotoCleanup(userId, task);
    } catch { /* Retain cleanup intent; confirmed saves remain successful. */ }
  }
  return mergeKeepsakeOutbox(cloud, pending)
    .sort((left, right) => right.date.localeCompare(left.date));
}

export async function saveCloudKeepsake(token: string, userId: string, input: Omit<DisplayKeepsake, "id" | "userId" | "photoUri"> & { id?: string; photoUri?: string | null; pickedPhotoUri?: string | null }) {
  if (!picketApi || !supabase) throw new Error("Dịch vụ chưa được cấu hình.");
  const id = input.id ?? Crypto.randomUUID();
  return withKeepsakePhotoLease(userId, () => withKeepsakeOwnerLock(userId, () => saveDurableKeepsake({
    persist: () => saveKeepsake({ ...input, id, userId, photoUri: input.photoUri ?? null }),
    send: async pending => {
      const photo = planKeepsakePhotoReplay(pending);
      const result = await saveWithKeepsakePhoto({
        previousPath: pending.mediaPath,
        upload: () => photo.uploadUri ? uploadPhoto(userId, id, photo.uploadUri, pending.mediaPath) : Promise.resolve(null),
        mutate: (mediaPath) => pending.version
        ? picketApi!.updateKeepsake(token, id, { expectedVersion:pending.version, title:pending.title,
        amount:pending.amount, purchasedAt:pending.date, note:pending.note, category:pending.category,
        warrantyUntil:pending.warrantyUntil, returnUntil:pending.returnUntil, mediaPath })
      : picketApi!.createKeepsake(token, { id, title:pending.title,
        amount:pending.amount, purchasedAt:pending.date, note:pending.note, category:pending.category,
        warrantyUntil:pending.warrantyUntil, returnUntil:pending.returnUntil, mediaPath }),
        // Cleanup is journaled before upload and drained only after fresh GET.
        remove: async () => undefined,
      });
      const display = await toDisplay(result.keepsake, userId);
      return { ...display, photoUri: display.photoUri ?? pending.photoUri };
    },
    cache: async display => {
      const cached = (await readOfflineCache<DisplayKeepsake[]>(userId, "keepsakes"))?.value ?? [];
      await writeOfflineCache(userId, "keepsakes", mergeKeepsakeOutbox(cached, [display]));
    },
    acknowledge: async pending => {
      const removed = await acknowledgeKeepsake(pending);
      announceCloudChange(userId);
      return removed;
    },
  })));
}

export async function archiveCloudKeepsake(token: string, item: DisplayKeepsake) {
  if (!picketApi) throw new Error("Chưa thể thực hiện lúc này. Hãy thử lại sau.");
  if (!item.version) return deleteKeepsake(item.id, item.userId);
  await picketApi.archiveKeepsake(token, item.id, item.version);
  announceCloudChange(item.userId);
  if (item.mediaPath && supabase) {
    try { await supabase.storage.from("picket-media").remove([item.mediaPath]); }
    catch { /* Archiving succeeded; storage cleanup must not appear as a failed archive. */ }
  }
}
