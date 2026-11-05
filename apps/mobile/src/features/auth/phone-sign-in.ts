import { AuthError } from "@supabase/supabase-js";

type PhoneLoginApi = {
  phoneLogin(phone: string, password: string): Promise<{ access_token: string; refresh_token: string }>;
};

/**
 * Phone + password sign-in goes through the Picket API (which resolves the
 * phone to the account and lets Supabase Auth check the password). API
 * failures are mapped onto Supabase AuthError codes so the existing error
 * messages stay the single source of wording.
 */
export async function phoneSignInTokens(api: PhoneLoginApi | null, phone: string, password: string) {
  if (!api) throw new AuthError("Sign-in unavailable", 503, "unexpected_failure");
  try {
    const session = await api.phoneLogin(phone, password);
    if (typeof session?.access_token !== "string" || typeof session?.refresh_token !== "string") {
      throw new AuthError("Invalid session", 502, "unexpected_failure");
    }
    return { access_token: session.access_token, refresh_token: session.refresh_token };
  } catch (error) {
    if (error instanceof AuthError) throw error;
    const status = typeof (error as { status?: unknown })?.status === "number" ? (error as { status: number }).status : 0;
    if (status === 401 || status === 400) throw new AuthError("Invalid credentials", 400, "invalid_credentials");
    if (status === 429) throw new AuthError("Too many attempts", 429, "over_request_rate_limit");
    throw new AuthError("Sign-in unavailable", status || 503, "unexpected_failure");
  }
}

/** A phone chosen at sign-up is kept in user metadata until it is attached. */
export function pendingPhone(user: { user_metadata?: Record<string, unknown> } | null | undefined): string | null {
  const value = user?.user_metadata?.pending_phone;
  return typeof value === "string" && /^\+[1-9]\d{7,14}$/.test(value) ? value : null;
}
