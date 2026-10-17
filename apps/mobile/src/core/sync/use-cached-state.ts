import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";

import { readOfflineCache, writeOfflineCache, type CachedResource } from "@/core/sync/offline-cache";

/** The owner must be a persisted, authenticated Supabase user ID. */
export function useCachedState<T>(userId: string | null, resource: CachedResource, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setRawValue] = useState<T>(initial);
  const [ready, setReady] = useState(false);
  const changed = useRef(false);
  const canPersist = useRef(false);

  const setValue = useCallback<Dispatch<SetStateAction<T>>>((next) => {
    changed.current = true;
    canPersist.current = true;
    setRawValue(next);
  }, []);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    void readOfflineCache<T>(userId, resource).then((cached) => {
      if (!active) return;
      if (cached) {
        canPersist.current = true;
        if (!changed.current) setRawValue(cached.value);
      }
    }).catch(() => undefined).finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, [resource, userId]);

  useEffect(() => {
    if (userId && ready && canPersist.current) {
      void writeOfflineCache(userId, resource, value).catch(() => undefined);
    }
  }, [ready, resource, userId, value]);
  return [value, setValue];
}
