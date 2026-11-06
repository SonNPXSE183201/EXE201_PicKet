import { isAuthRetryableFetchError, processLock, type SupabaseClient } from "@supabase/supabase-js";

export function createAuthMutationQueue() {
  let pending: Promise<unknown> = Promise.resolve();
  return <T>(operation: () => Promise<T>): Promise<T> => {
    const result = pending.then(operation);
    pending = result.catch(() => undefined);
    return result;
  };
}

type DeviceSignOutSource = {
  expectedOwner?: string;
  auth: Pick<SupabaseClient["auth"], "signOut">;
  storageKey: string;
  storage: { getItem(key: string): Promise<string | null>; removeItem(key: string): Promise<void> };
};

export async function signOutDeviceSession(source: DeviceSignOutSource): Promise<void> {
  const before = await source.storage.getItem(source.storageKey);
  if(source.expectedOwner!==undefined&&before!==null){
    let storedOwner:unknown;
    try{
      const session:unknown=JSON.parse(before);
      const user=session&&typeof session==="object"&&"user"in session?session.user:null;
      if(user&&typeof user==="object"&&"id"in user)storedOwner=user.id;
    }catch{ /* An unreadable record must not authorize removing another session. */ }
    if(storedOwner!==source.expectedOwner)throw Error("Device sign-out owner changed");
  }
  const { error } = await source.auth.signOut({ scope: "local" });
  if (!error) return;
  if (!isAuthRetryableFetchError(error)) throw error;

  // Explicit device logout must work offline even if an expired refresh fails
  // before the SDK reaches its normal cleanup. Drain SDK refresh work using
  // the SAME lock configured on the client; never clear another auth record.
  const cleanup = await processLock(`lock:${source.storageKey}`, -1, async () => {
    // Return errors through the lock: this SDK's processLock keeps a second
    // internal promise which otherwise rejects unobserved on storage failure.
    try {
      const current = await source.storage.getItem(source.storageKey);
      if (current !== null) {
        if (current !== before) return { error }; // Never erase a newer session.
        await source.storage.removeItem(source.storageKey);
      }
      return { error: null };
    } catch (storageError) {
      return { error: storageError };
    }
  });
  if (cleanup.error) throw cleanup.error;
  // Keep the app mutation queue held, but release the SDK lock before reentry.
  // Its public API clears PKCE/user slots, cached failures and emits SIGNED_OUT.
  const final = await source.auth.signOut({ scope: "local" });
  if (final.error) throw final.error;
}
