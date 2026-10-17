import { fromByteArray } from "base64-js";
import { picketApi } from "@/core/api/client";
import { supabase } from "@/core/supabase/client";
import { readOfflineCache, writeOfflineCache } from "@/core/sync/offline-cache";
import { loadReceiptGallery, trimReceiptImages, type ReceiptImageCacheEntry } from "@/core/ui/receipt-gallery-policy";
import { calendarReceiptDay } from "@/core/ui/receipt-calendar";

export type GalleryEntry = { id: string; day: string; title: string; uri?: string; path?: string; transactionId?: string | null };

export async function loadCloudReceiptGallery(owner: string, accessToken: string, month: string, transactionDates: Map<string, string>, signal: AbortSignal) {
  const result = await loadReceiptGallery<GalleryEntry>(owner, {
    remote: async () => {
      if (!picketApi) throw new Error("unavailable");
      const { receipts } = await picketApi.listReceipts(accessToken, signal);
      return receipts.flatMap((r) => { const day = calendarReceiptDay(r, r.transactionId ? transactionDates.get(r.transactionId) : undefined); return day ? [{ id: r.id, day, title: r.merchant || "Hóa đơn", path: r.storagePath, transactionId: r.transactionId }] : []; });
    },
    cached: async (user) => (await readOfflineCache<GalleryEntry[]>(user, "receipt-gallery"))?.value ?? null,
    save: (user, rows) => writeOfflineCache(user, "receipt-gallery", rows),
  });
  if (signal.aborted) throw new Error("aborted");
  let images = (await readOfflineCache<ReceiptImageCacheEntry[]>(owner, "receipt-images").catch(() => null))?.value ?? [];
  const validIds = new Set(result.rows.map((r) => r.id));
  images = trimReceiptImages(images, validIds);
  const rows = result.rows.map((r) => ({ ...r, uri: images.find((image) => image.id === r.id && image.path === r.path)?.dataUri }));
  for (const row of rows.filter((r) => r.day.startsWith(month))) {
    if (signal.aborted) throw new Error("aborted");
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
      images = trimReceiptImages([...images, { id: row.id, path: row.path, dataUri, usedAt: Date.now() }], validIds);
      row.uri = dataUri;
    } catch { /* Keep the signed image or cached gallery usable when download fails. */ }
  }
  if (signal.aborted) throw new Error("aborted");
  try { await writeOfflineCache(owner, "receipt-images", images); } catch { /* Images remain available for this session. */ }
  return { rows, stale: result.stale };
}
