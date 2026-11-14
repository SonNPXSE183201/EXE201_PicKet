// Read on the server at request time, just like the Turnstile site key.
export function googleWebClientId(): string | undefined {
  return process.env.GOOGLE_WEB_CLIENT_ID?.trim() || undefined;
}
