import * as Crypto from "expo-crypto";
import { Directory, File, Paths } from "expo-file-system";
import type { Keepsake as RemoteKeepsake } from "@picket/domain";

import { picketApi } from "@/core/api/client";
import { supabase } from "@/core/supabase/client";
import { deleteKeepsake, listKeepsakes, type Keepsake as LocalKeepsake } from "@/features/keepsakes/keepsake-store";
import { readOfflineCache, writeOfflineCache } from "@/core/sync/offline-cache";
import { loadWithKeepsakeCache } from "@/features/keepsakes/keepsake-cache-policy";
import { mergeKeepsakeOutbox, planKeepsakePhotoReplay, planKeepsakeReplay } from "@/features/keepsakes/keepsake-outbox-policy";

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
    const extension = item.mediaPath.match(/\.([a-z0-9]+)$/i)?.[1] ?? "jpg";
    const directory = new Directory(Paths.document, "keepsake-cloud-cache", userId);
    directory.create({ idempotent: true, intermediates: true });
    const destination = new File(directory, `${item.id}.${extension}`);
    try {
      cachedPhotoUri = (await File.downloadFileAsync(
        (await photoUrl(item.mediaPath))!,
        destination,
        { idempotent: true },
      )).uri;
    } catch {
      if (destination.exists) cachedPhotoUri = destination.uri;
    }
  }
  return { id:item.id, userId, title:item.title, amount:item.amount, date:item.purchasedAt,
    note:item.note, photoUri:cachedPhotoUri, category:item.category,
    warrantyUntil:item.warrantyUntil, returnUntil:item.returnUntil,
    version:item.version, mediaPath:item.mediaPath, photoUploadRequired:false };
}

async function uploadPhoto(userId: string, uri: string) {
  if (!supabase) throw new Error("Supabase chưa được cấu hình.");
  const match = uri.match(/\.(jpe?g|png|webp)(?:\?|$)/i);
  const extension = match?.[1]?.toLowerCase().replace("jpeg", "jpg") ?? "jpg";
  const path = `${userId}/keepsakes/${Crypto.randomUUID()}.${extension}`;
  const file = new File(uri);
  const body = await file.arrayBuffer();
  const type = extension === "png" ? "image/png" : extension === "webp" ? "image/webp" : "image/jpeg";
  const { error } = await supabase.storage.from("picket-media").upload(path, body, { contentType:type, upsert:false });
  if (error) throw error;
  return path;
}

export async function loadKeepsakeCollection(token: string, userId: string): Promise<DisplayKeepsake[]> {
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
      const mediaPath = photo.uploadUri ? await uploadPhoto(userId, photo.uploadUri) : photo.mediaPath;
      const replay = planKeepsakeReplay(item);
      const payload = { title:item.title, amount:item.amount, purchasedAt:item.date,
        note:item.note, category:item.category, warrantyUntil:item.warrantyUntil,
        returnUntil:item.returnUntil, mediaPath:mediaPath ?? item.mediaPath ?? null };
      const result = replay.action === "update"
        ? await picketApi.updateKeepsake(token, item.id, { ...payload, expectedVersion:replay.expectedVersion })
        : await picketApi.createKeepsake(token, { ...payload, id:item.id });
      const display = await toDisplay(result.keepsake, userId);
      migrated.push(display);
      // Metadata-only outbox entries may reference the same downloaded cache
      // file as the fresh display row. Removing the queue must not delete it.
      await deleteKeepsake(item.id, userId, display.photoUri);
    } catch {
      // Preserve the local item and photo on any upload or API failure.
    }
  }
  const cloud = mergeKeepsakeOutbox(remote, migrated);
  if (migrated.length > 0) await writeOfflineCache(userId, "keepsakes", cloud);
  const pending = local.filter((item) => !migrated.some((saved) => saved.id === item.id));
  return mergeKeepsakeOutbox(cloud, pending)
    .sort((left, right) => right.date.localeCompare(left.date));
}

export async function saveCloudKeepsake(token: string, userId: string, input: Omit<DisplayKeepsake, "id" | "userId" | "photoUri"> & { id?: string; photoUri?: string | null; pickedPhotoUri?: string | null }) {
  if (!picketApi || !supabase) throw new Error("Dịch vụ chưa được cấu hình.");
  const uploadedPath = input.pickedPhotoUri ? await uploadPhoto(userId, input.pickedPhotoUri) : null;
  let committed = false;
  try {
    const mediaPath = uploadedPath ?? input.mediaPath ?? null;
    const result = input.id && input.version
      ? await picketApi.updateKeepsake(token, input.id, { expectedVersion:input.version, title:input.title,
        amount:input.amount, purchasedAt:input.date, note:input.note, category:input.category,
        warrantyUntil:input.warrantyUntil, returnUntil:input.returnUntil, mediaPath })
      : await picketApi.createKeepsake(token, { id:input.id ?? Crypto.randomUUID(), title:input.title,
        amount:input.amount, purchasedAt:input.date, note:input.note, category:input.category,
        warrantyUntil:input.warrantyUntil, returnUntil:input.returnUntil, mediaPath });
    committed = true;
    announceCloudChange(userId);
    if (uploadedPath && input.mediaPath && input.mediaPath !== uploadedPath) {
      try { await supabase.storage.from("picket-media").remove([input.mediaPath]); }
      catch { /* The saved record owns the new image; old-image cleanup can be retried later. */ }
    }
    return toDisplay(result.keepsake, userId);
  } catch (error) {
    if (uploadedPath && !committed) {
      try { await supabase.storage.from("picket-media").remove([uploadedPath]); }
      catch { /* Keep the original API error. */ }
    }
    throw error;
  }
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
