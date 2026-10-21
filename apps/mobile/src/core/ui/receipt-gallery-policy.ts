export interface ReceiptImageCacheEntry { id: string; path: string; dataUri: string; thumbnailUri?: string; usedAt: number }

export function indexReceiptThumbnailPaths(items: ReceiptImageCacheEntry[]) {
  return indexReceiptImagePaths(items);
}

/** Build only from the current owner's decrypted cache; paths are the image identity. */
export function indexReceiptImagePaths(items: ReceiptImageCacheEntry[]) {
  const paths = new Map<string, string>();
  for (const image of [...items].sort((a, b) => a.usedAt - b.usedAt)) paths.set(image.path, image.dataUri);
  return paths;
}

export async function loadReceiptGallery<T>(owner: string, loader: { remote(): Promise<T[]>; cached(owner: string): Promise<T[] | null>; save(owner: string, rows: T[]): Promise<void>; onCached?(rows: T[]): void; onRemote?(rows: T[]): void; hydrateCached?(owner: string, rows: T[]): Promise<T[]> }) {
  // Cache-first metadata makes the calendar usable while network/media work
  // continues. Cache corruption must never prevent a successful remote read.
  let snapshot: T[] | null = null;
  let remoteSettled = false;
  if (loader.onCached) {
    try { snapshot = await loader.cached(owner); } catch { /* Remote may recover. */ }
    if (snapshot !== null) {
      loader.onCached(snapshot);
      // Local media must not wait for a stalled network request. A late local
      // completion must never resurrect metadata replaced by the remote read.
      if (loader.hydrateCached) void loader.hydrateCached(owner, snapshot).then(rows => {
        if (!remoteSettled) loader.onCached?.(rows);
      }).catch(() => undefined);
    }
  }
  let rows: T[];
  try { rows = await loader.remote(); remoteSettled = true; }
  catch (error) { remoteSettled = true; const cached = snapshot ?? await loader.cached(owner); if (cached !== null) return { rows: cached, stale: true }; throw error; }
  // Metadata is useful immediately. Slow encryption/SQLite must not keep the
  // calendar disabled after a successful authoritative response.
  loader.onRemote?.(rows);
  try { await loader.save(owner, rows); } catch { /* A full disk must not hide fresh remote data. */ }
  return { rows, stale: false };
}

/** Budget is base64 character count (~20 MiB maximum before encryption). */
export function trimReceiptImages(items: ReceiptImageCacheEntry[], validIds: Set<string>, budget = 20 * 1024 * 1024, validPaths?: Set<string>): ReceiptImageCacheEntry[] {
  let used = 0;
  const seen = new Set<string>();
  const paths = new Set<string>();
  return [...items].sort((a, b) => b.usedAt - a.usedAt).filter((item) => {
    const referenced = validPaths ? validPaths.has(item.path) : validIds.has(item.id);
    if (!referenced || seen.has(item.id) || paths.has(item.path) || item.dataUri.length > budget - used) return false;
    seen.add(item.id); paths.add(item.path); used += item.dataUri.length; return true;
  });
}
