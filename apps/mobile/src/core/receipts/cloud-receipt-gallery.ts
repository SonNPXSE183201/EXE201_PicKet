import { fromByteArray } from "base64-js";
import { picketApi } from "@/core/api/client";
import { supabase } from "@/core/supabase/client";
import { readOfflineCache, writeOfflineCache, withLocalOwnerAccess } from "@/core/sync/offline-cache";
import { loadReceiptGallery, trimReceiptImages, indexReceiptImagePaths, indexReceiptThumbnailPaths, hydrateReceiptPreviews, type ReceiptPreview, type ReceiptImageCacheEntry } from "@/core/ui/receipt-gallery-policy";
import { calendarReceiptDay } from "@/core/ui/receipt-calendar";
import { createReceiptThumbnail } from "./receipt-thumbnail";

export type GalleryEntry = { id: string; day: string; title: string; uri?: string; thumbnailUri?: string; path?: string; transactionId?: string | null };

export async function loadCloudReceiptGallery(owner: string, accessToken: string, month: string, transactionDates: Map<string, string>, signal: AbortSignal, onSnapshot?: (result: { rows: GalleryEntry[]; stale: boolean }) => void) {
  const previews = await readOfflineCache<ReceiptPreview[]>(owner, "receipt-thumbnails").then(result => Array.isArray(result?.value) ? result.value : []).catch(() => []);
  let imageRead: Promise<ReceiptImageCacheEntry[]> | null = null;
  const readCachedImages = () => imageRead ??= readOfflineCache<ReceiptImageCacheEntry[]>(owner, "receipt-images")
    .then(result => result?.value ?? []).catch(() => []);
  const publish = (rows: GalleryEntry[], stale: boolean) => {
    if (!signal.aborted) onSnapshot?.({ rows: rows.map((row) => ({ ...row })), stale });
  };
  const result = await loadReceiptGallery<GalleryEntry>(owner, {
    remote: async () => {
      if (!picketApi) throw new Error("unavailable");
      const { receipts } = await picketApi.listReceipts(accessToken, signal);
      return receipts.flatMap((r) => { const day = calendarReceiptDay(r, r.transactionId ? transactionDates.get(r.transactionId) : undefined); return day ? [{ id: r.id, day, title: r.merchant || "Hóa đơn", path: r.storagePath, transactionId: r.transactionId }] : []; });
    },
    cached: async (user) => (await readOfflineCache<GalleryEntry[]>(user, "receipt-gallery"))?.value ?? null,
    save: (user, rows) => writeOfflineCache(user, "receipt-gallery", rows),
    onCached: onSnapshot ? (rows) => publish(rows, true) : undefined,
    onRemote: onSnapshot ? (rows) => publish(rows, false) : undefined,
    hydrateCached: onSnapshot ? async (_user, rows) => {
      return hydrateReceiptPreviews(rows, previews);
    } : undefined,
  });
  if (signal.aborted) throw new Error("aborted");
  result.rows = hydrateReceiptPreviews(result.rows, previews);
  publish(result.rows, result.stale);
  const monthly = result.rows.filter(row => row.day.startsWith(month));
  if (monthly.every(row => !row.path || row.thumbnailUri)) return result;
  let images = await readCachedImages();
  const validIds = new Set(result.rows.map((r) => r.id));
  const validPaths = new Set(result.rows.flatMap(row => row.path ? [row.path] : []));
  const originalImageCount = images.length;
  images = trimReceiptImages(images, validIds, undefined, validPaths);
  const imagePaths = indexReceiptImagePaths(images);
  const thumbnailPaths = indexReceiptThumbnailPaths(images);
  const rows = result.rows.map((r) => ({ ...r, uri: r.path ? imagePaths.get(r.path) : undefined, thumbnailUri: (r.path ? thumbnailPaths.get(r.path) : undefined) ?? r.thumbnailUri }));
  publish(rows, result.stale);
  let cacheChanged = images.length !== originalImageCount;
  async function persistPreviews() {
    let remaining = 2 * 1024 * 1024;
    const compact = rows.flatMap(row => {
      if (!row.path || !row.thumbnailUri || row.thumbnailUri.length > Math.min(131_104, remaining)) return [];
      remaining -= row.thumbnailUri.length;
      return [{ path: row.path, thumbnailUri: row.thumbnailUri }];
    });
    try { await writeOfflineCache(owner, "receipt-thumbnails", compact); } catch { /* Preserve original full-photo cache on a failed small-cache write. */ }
  }
  await persistPreviews();
  async function thumbnail(row: GalleryEntry) {
    if (row.thumbnailUri || !row.path || !row.uri?.startsWith("data:image/") || signal.aborted) return;
    try {
      const uri = await withLocalOwnerAccess(owner,()=>createReceiptThumbnail(row.uri!));
      if (signal.aborted) return;
      row.thumbnailUri = uri; thumbnailPaths.set(row.path, uri);
      images = trimReceiptImages(images.map(image => image.path === row.path ? { ...image, thumbnailUri: uri } : image), validIds, undefined, validPaths);
      cacheChanged = true; publish(rows, result.stale);
      await persistPreviews();
    } catch { /* Preserve the full offline image even when its preview fails. */ }
  }
  for (const row of rows.filter((r) => r.day.startsWith(month))) {
    if (signal.aborted) throw new Error("aborted");
    if (!row.uri && row.path) row.uri = imagePaths.get(row.path);
    if (!row.thumbnailUri && row.path) row.thumbnailUri = thumbnailPaths.get(row.path);
    await thumbnail(row);
    if (row.uri || result.stale || !row.path || !supabase) continue;
    try {
      const signed = await supabase.storage.from("picket-media").createSignedUrl(row.path, 300);
      if (signed.error) continue;
      row.uri = signed.data.signedUrl;
      const response = await fetch(row.uri, { signal });
      if (!response.ok || !/^image\/(jpeg|png|webp)(?:;|$)/i.test(response.headers.get("content-type") ?? "")) continue;
      const size = Number(response.headers.get("content-length"));
      if (size > 10 * 1024 * 1024) continue;
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (!bytes.length || bytes.length > 10 * 1024 * 1024 || signal.aborted) continue;
      const mime = response.headers.get("content-type")!.split(";")[0];
      const dataUri = `data:${mime};base64,${fromByteArray(bytes)}`;
      images = trimReceiptImages([...images, { id: row.id, path: row.path, dataUri, usedAt: Date.now() }], validIds, undefined, validPaths);
      row.uri = dataUri;
      imagePaths.set(row.path, dataUri);
      cacheChanged = true;
      await thumbnail(row);
      publish(rows, result.stale);
    } catch { /* Keep the signed image or cached gallery usable when download fails. */ }
  }
  if (signal.aborted) throw new Error("aborted");
  if (cacheChanged) {
    try { await writeOfflineCache(owner, "receipt-images", images); } catch { /* Images remain available for this session. */ }
  }
  return { rows, stale: result.stale };
}

/** The selected-photo viewer, not calendar startup, reads full-size bytes. */
export async function loadCloudReceiptImage(owner: string, path: string, signal: AbortSignal): Promise<string | null> {
  if (!path.startsWith(owner + "/") || signal.aborted) return null;
  const cached = await readOfflineCache<ReceiptImageCacheEntry[]>(owner, "receipt-images").catch(() => null);
  if (signal.aborted) return null;
  const uri = cached?.value.find(row => row.path === path)?.dataUri;
  if (uri) return uri;
  if (!supabase) return null;
  const signed = await supabase.storage.from("picket-media").createSignedUrl(path, 300);
  if (signal.aborted || signed.error) return null;
  return signed.data.signedUrl;
}
