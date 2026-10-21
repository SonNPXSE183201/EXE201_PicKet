import type { SupabaseClient } from "@supabase/supabase-js";

export function createAuthMutationQueue() {
  let pending: Promise<unknown> = Promise.resolve();
  return <T>(operation: () => Promise<T>): Promise<T> => {
    const result = pending.then(operation);
    pending = result.catch(() => undefined);
    return result;
  };
}

type DeviceSignOutSource = {
  auth: Pick<SupabaseClient["auth"], "signOut">;
  storageKey: string;
  storage: { getItem(key: string): Promise<string | null>; removeItem(key: string): Promise<void> };
};

export async function signOutDeviceSession(source: DeviceSignOutSource): Promise<void> {
  const { error } = await source.auth.signOut({ scope: "local" });
  if (error) throw error;
}
