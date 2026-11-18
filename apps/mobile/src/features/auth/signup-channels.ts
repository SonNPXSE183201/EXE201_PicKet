import { perfLog, perfStart } from "./perf-log";

export type SignupMethod = "email" | "phone";
export type SignupVerification = { email: boolean; sms: boolean };

export const emailOnlyVerification: SignupVerification = { email: true, sms: false };
export const signupChannelsCacheMs = 5 * 60 * 1000;

/** Reads `verification` from GET /v1/auth/channels; anything unexpected means email only. */
export function parseSignupVerification(response: unknown): SignupVerification {
  const verification = (response as { verification?: unknown } | null | undefined)?.verification as
    | { email?: unknown; sms?: unknown }
    | undefined;
  if (!verification || typeof verification !== "object") return emailOnlyVerification;
  const email = verification.email === true;
  const sms = verification.sms === true;
  if (!email && !sms) return emailOnlyVerification;
  return { email, sms };
}

/**
 * Methods offered on the register screen. SMS needs the Firebase native
 * module; without it the screen falls back to email so sign-up never dead-ends.
 */
export function availableSignupMethods(verification: SignupVerification, smsSupported: boolean): SignupMethod[] {
  const methods: SignupMethod[] = [];
  if (verification.email) methods.push("email");
  if (verification.sms && smsSupported) methods.push("phone");
  return methods.length ? methods : ["email"];
}

type ChannelsApi = { authChannels(): Promise<unknown> } | null;

/** Persists the last good channel settings (SecureStore on device). */
export type SignupChannelsStorage = {
  read(): Promise<string | null>;
  write(value: string): Promise<void>;
};

/**
 * Stale-while-revalidate channel settings: the register screen renders the last
 * good value (memory, then storage) at once while GET /v1/auth/channels refreshes
 * it. With nothing stored yet (first run) any failure means email only, and that
 * fallback is never persisted.
 */
export function createSignupVerificationLoader(
  now: () => number = Date.now,
  ttlMs = signupChannelsCacheMs,
  storage: SignupChannelsStorage | null = null,
) {
  let fresh: { value: SignupVerification; at: number } | null = null;
  let stored: SignupVerification | null = null;
  let fallback: SignupVerification | null = null;
  let pending: Promise<SignupVerification> | null = null;
  let hydrating: Promise<void> | null = null;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());

  function hydrate(): Promise<void> {
    if (!storage) return Promise.resolve();
    hydrating ??= storage.read()
      .then((raw) => {
        if (stored || !raw) return;
        stored = parseSignupVerification({ verification: JSON.parse(raw) as unknown });
        notify();
      })
      .catch(() => undefined);
    return hydrating;
  }

  function revalidate(api: NonNullable<ChannelsApi>): Promise<SignupVerification> {
    if (pending) return pending;
    const startedAt = perfStart();
    pending = api.authChannels()
      .then((response) => {
        perfLog("channels-load", startedAt);
        const value = parseSignupVerification(response);
        fresh = { value, at: now() };
        stored = value;
        void storage?.write(JSON.stringify(value)).catch(() => undefined);
        notify();
        return value;
      })
      .catch(() => {
        perfLog("channels-load-failed", startedAt);
        if (stored) return stored;
        fallback = emailOnlyVerification;
        notify();
        return emailOnlyVerification;
      })
      .finally(() => {
        pending = null;
      });
    return pending;
  }

  const isFresh = () => fresh !== null && now() - fresh.at < ttlMs;

  async function load(api: ChannelsApi): Promise<SignupVerification> {
    if (fresh && isFresh()) return fresh.value;
    await hydrate();
    if (!api) {
      if (!stored && !fallback) {
        fallback = emailOnlyVerification;
        notify();
      }
      return stored ?? emailOnlyVerification;
    }
    const next = revalidate(api);
    return stored ?? next;
  }

  return Object.assign(load, {
    /** Best value known right now (null until anything loaded): stable between changes. */
    peek(): SignupVerification | null {
      return stored ?? fallback;
    },
    /** App start / login screen: read storage and refresh in the background. */
    prefetch(api: ChannelsApi): void {
      void hydrate();
      if (api && !isFresh()) void revalidate(api);
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  });
}
