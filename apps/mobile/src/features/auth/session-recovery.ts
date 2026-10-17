import { AuthRetryableFetchError, isAuthRetryableFetchError, type Session } from "@supabase/supabase-js";

type RecoverySource = {
  getSession: () => Promise<{ data: { session: Session | null }; error: unknown }>;
  readPersisted: () => Promise<string | null>;
  isCurrent: () => boolean;
};

/** Device-only continuity, NOT proof of a valid server credential.
 * Read the SDK's existing secure record only after transient refresh failure.
 * Never write a second token snapshot or restore after explicit sign-out.
 */
export async function recoverDeviceSession(source: RecoverySource, timeoutMs = 8_000): Promise<Session | null> {
  let failure: unknown;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      source.getSession(),
      new Promise<{ data: { session: null }; error: unknown }>(resolve => {
        timer = setTimeout(() => resolve({ data: { session: null }, error: new AuthRetryableFetchError("Device session recovery timed out", 0) }), timeoutMs);
      }),
    ]);
    if (!source.isCurrent()) return null;
    if (result.data.session) return result.data.session;
    failure = result.error;
  } catch (error) {
    failure = error;
  } finally {
    clearTimeout(timer);
  }
  if (!source.isCurrent() || !isAuthRetryableFetchError(failure)) return null;
  try {
    const raw = await source.readPersisted();
    if (!source.isCurrent() || !raw) return null;
    const stored = JSON.parse(raw) as Partial<Session> | null;
    if (!stored || typeof stored.access_token !== "string" || !stored.access_token ||
      typeof stored.refresh_token !== "string" || !stored.refresh_token ||
      stored.token_type !== "bearer" || typeof stored.expires_at !== "number" ||
      !Number.isFinite(stored.expires_at) || stored.expires_at <= 0 ||
      typeof stored.user?.id !== "string" || !stored.user.id) return null;
    return stored as Session;
  } catch {
    return null;
  }
}
