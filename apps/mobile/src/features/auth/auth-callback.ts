export class AuthCallbackError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthCallbackError";
  }
}

export interface AuthCallbackParameters {
  accessToken: string | null;
  code: string | null;
  errorDescription: string | null;
  refreshToken: string | null;
}

/**
 * Supabase can return a PKCE code in the query string or mobile OAuth tokens
 * in the URL fragment. URL.searchParams only covers the first form.
 */
export function parseAuthCallbackUrl(url: string): AuthCallbackParameters {
  const parsed = new URL(url);
  const fragment = new URLSearchParams(parsed.hash.replace(/^#/, ""));

  const read = (key: string) => parsed.searchParams.get(key) ?? fragment.get(key);

  return {
    accessToken: read("access_token"),
    code: read("code"),
    errorDescription: read("error_description") ?? read("error"),
    refreshToken: read("refresh_token"),
  };
}
