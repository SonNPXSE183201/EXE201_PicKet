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

/** Short in-memory cache so moving between auth screens does not refetch settings. */
export function createSignupVerificationLoader(now: () => number = Date.now, ttlMs = signupChannelsCacheMs) {
  let cached: { value: SignupVerification; at: number } | null = null;
  let pending: Promise<SignupVerification> | null = null;
  return async function load(api: ChannelsApi): Promise<SignupVerification> {
    if (cached && now() - cached.at < ttlMs) return cached.value;
    if (!api) return emailOnlyVerification;
    if (pending) return pending;
    pending = api.authChannels()
      .then((response) => {
        const value = parseSignupVerification(response);
        cached = { value, at: now() };
        return value;
      })
      .catch(() => emailOnlyVerification)
      .finally(() => {
        pending = null;
      });
    return pending;
  };
}
