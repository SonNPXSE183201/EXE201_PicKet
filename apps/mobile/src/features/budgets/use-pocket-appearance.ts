import { useEffect, useState } from "react";
import { readOfflineCache, writeOfflineCache } from "@/core/sync/offline-cache";
import { guestOwnerId } from "@/core/local/guest-finance";
import { useAuth } from "@/features/auth/auth-context";
import { createPocketAppearanceStore, type PocketAppearances } from "./pocket-appearance";

const store = createPocketAppearanceStore({
  read: async owner => (await readOfflineCache(owner, "pocket-appearance"))?.value,
  write: (owner, value) => writeOfflineCache(owner, "pocket-appearance", value),
});
export function usePocketAppearance() {
  const { session, localMode } = useAuth();
  const owner = session?.user.id ?? (localMode ? guestOwnerId : null);
  const [snapshot, setSnapshot] = useState<{ owner: string; pockets: PocketAppearances } | null>(null);
  const [failedOwner, setFailedOwner] = useState<string | null>(null);
  useEffect(() => {
    if (!owner) return;
    let active = true;
    const load = () => { void store.load(owner).then(pockets => { if (active) { setSnapshot({ owner, pockets }); setFailedOwner(null); } }).catch(() => { if (active) setFailedOwner(owner); }); };
    const stop = store.subscribe(owner, load); load();
    return () => { active = false; stop(); };
  }, [owner]);
  return { appearances: snapshot?.owner === owner ? snapshot.pockets : {}, error: !!owner && failedOwner === owner, save: (id: string, value: Parameters<typeof store.save>[2]) => owner ? store.save(owner, id, value) : Promise.reject(new Error("Missing preference owner")) };
}
