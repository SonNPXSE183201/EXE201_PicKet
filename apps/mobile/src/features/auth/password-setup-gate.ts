type MetadataUser = { user_metadata?: Record<string, unknown> | null } | null | undefined;

/** Metadata flag set by the email OTP sign-up until the user has chosen a password. */
export const passwordSetupMetadataKey = "password_setup_required";

/**
 * The metadata flag, or a server override: the API answered "Password setup required"
 * for this owner (an account whose metadata was edited to bypass the client gate).
 */
export function requiresPasswordSetup(
  session: { user?: (MetadataUser & { id?: string }) | null } | null | undefined,
  serverRequiredOwner: string | null = null,
): boolean {
  if (session?.user?.user_metadata?.[passwordSetupMetadataKey] === true) return true;
  return serverRequiredOwner !== null && typeof session?.user?.id === "string" && session.user.id === serverRequiredOwner;
}

/** 403 from `account_access` for an email/phone account without a password. */
export function isPasswordSetupRequiredError(error: unknown): boolean {
  if ((error as { status?: unknown } | null | undefined)?.status !== 403) return false;
  const message = (error as { message?: unknown }).message;
  let details = "";
  try {
    details = JSON.stringify((error as { details?: unknown }).details ?? "");
  } catch {
    /* ignore */
  }
  return /password setup required/i.test(`${typeof message === "string" ? message : ""} ${details}`);
}

export type CreatePasswordMode = "session" | "phone" | "none";

/**
 * The create-password screen finishes either a signed-in email OTP account
 * (session flagged for setup) or a verified SMS sign-up that has no session yet.
 */
export function createPasswordMode(input: { sessionRequiresSetup: boolean; hasSession: boolean; phoneVerified: boolean }): CreatePasswordMode {
  if (input.sessionRequiresSetup) return "session";
  if (!input.hasSession && input.phoneVerified) return "phone";
  return "none";
}
