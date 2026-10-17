export interface ReceiptImageCacheEntry { id: string; path: string; dataUri: string; usedAt: number }

export async function loadReceiptGallery<T>(owner: string, loader: { remote(): Promise<T[]>; cached(owner: string): Promise<T[] | null>; save(owner: string, rows: T[]): Promise<void> }) {
  let rows: T[];
  try { rows = await loader.remote(); }
  catch (error) { const cached = await loader.cached(owner); if (cached !== null) return { rows: cached, stale: true }; throw error; }
  try { await loader.save(owner, rows); } catch { /* A full disk must not hide fresh remote data. */ }
  return { rows, stale: false };
}

/** Budget is base64 character count (~20 MiB maximum before encryption). */
export function trimReceiptImages(items: ReceiptImageCacheEntry[], validIds: Set<string>, budget = 20 * 1024 * 1024): ReceiptImageCacheEntry[] {
  let used = 0;
  const seen = new Set<string>();
  return [...items].sort((a, b) => b.usedAt - a.usedAt).filter((item) => {
    if (!validIds.has(item.id) || seen.has(item.id) || item.dataUri.length > budget - used) return false;
    seen.add(item.id); used += item.dataUri.length; return true;
  });
}
