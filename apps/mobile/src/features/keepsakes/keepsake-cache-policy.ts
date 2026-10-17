interface KeepsakeCacheLoader<T> {
  loadRemote(): Promise<T[]>;
  loadCached(): Promise<T[] | null>;
  saveCached(items: T[]): Promise<void>;
  fallback?: T[];
}

export async function loadWithKeepsakeCache<T>(loader: KeepsakeCacheLoader<T>) {
  let items: T[];
  try {
    items = await loader.loadRemote();
  } catch (error) {
    const cached = await loader.loadCached().catch(() => null);
    if (cached !== null) return { items: cached, stale: true };
    if (loader.fallback !== undefined) return { items: loader.fallback, stale: true };
    throw error;
  }
  // A failed local write must not resurrect a stale/archived cloud snapshot.
  try { await loader.saveCached(items); } catch { /* Fresh remote data remains usable this session. */ }
  return { items, stale: false };
}
