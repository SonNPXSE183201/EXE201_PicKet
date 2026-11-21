/**
 * OTP-first sign-up: an account created by an email code has no password yet and carries
 * `user_metadata.password_setup_required = true` until /create-password finishes.
 * Pure helpers so the proxy gate can be unit tested.
 */
export const PASSWORD_SETUP_PATH = "/create-password";

const exemptPrefixes = ["/auth/", "/api/", "/_next/"];
const exemptPaths = new Set([PASSWORD_SETUP_PATH, "/logout", "/auth", "/api", "/favicon.ico", "/robots.txt", "/sitemap.xml"]);

export function passwordSetupRequired(claims: unknown): boolean {
  const metadata = (claims as { user_metadata?: Record<string, unknown> } | null | undefined)?.user_metadata;
  return metadata?.password_setup_required === true;
}

/** Paths a user without a password may still open (setup page, auth callbacks, logout, APIs, static files). */
export function isPasswordSetupExempt(pathname: string): boolean {
  if (exemptPaths.has(pathname)) return true;
  if (exemptPrefixes.some((prefix) => pathname.startsWith(prefix))) return true;
  return /\.[a-z0-9]{2,5}$/i.test(pathname); // static assets such as /admin-paper/x.webp
}

/**
 * Only page navigations are gated. Server actions are POST requests carrying a `next-action`
 * header (e.g. sign out from /create-password); a GET/HEAD is never skipped because of a header
 * the client controls.
 */
export function isPasswordSetupGatedRequest(method: string, hasNextAction: boolean): boolean {
  return !(method.toUpperCase() === "POST" && hasNextAction);
}

/** Where to send the request, or null to continue. */
export function passwordSetupRedirect(pathname: string, claims: unknown): string | null {
  return passwordSetupRequired(claims) && !isPasswordSetupExempt(pathname) ? PASSWORD_SETUP_PATH : null;
}

/** Proxy entry point: the request method and `next-action` header decide whether the gate applies. */
export function passwordSetupRequestRedirect(request: { method: string; pathname: string; hasNextAction: boolean }, claims: unknown): string | null {
  return isPasswordSetupGatedRequest(request.method, request.hasNextAction) ? passwordSetupRedirect(request.pathname, claims) : null;
}

/** The API refuses business calls for accounts without a password (`account_access`). */
export function isPasswordSetupRequiredError(error: unknown): boolean {
  if ((error as { status?: unknown } | null)?.status !== 403) return false;
  const message = (error as { message?: unknown }).message;
  let details = "";
  try {
    details = JSON.stringify((error as { details?: unknown }).details ?? "");
  } catch {
    /* ignore */
  }
  return /password setup required/i.test(`${typeof message === "string" ? message : ""} ${details}`);
}

/** Server check for /create-password: the metadata flag, or `?required=1` set after the API reported setup required. */
export function canOpenPasswordSetup(claims: unknown, required: string | string[] | undefined): boolean {
  if (!claims) return false;
  return passwordSetupRequired(claims) || required === "1";
}

/**
 * Where requireApiSession sends a rejected account check, or null to surface the error:
 * "Password setup required" → /create-password?required=1; other 400/401/403 → sign in again.
 */
export function accountAccessFailureRedirect(error: unknown, next: string): string | null {
  if (isPasswordSetupRequiredError(error)) return `${PASSWORD_SETUP_PATH}?required=1`;
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === "number" && [400, 401, 403].includes(status) ? `/auth/expired?next=${encodeURIComponent(next)}` : null;
}
