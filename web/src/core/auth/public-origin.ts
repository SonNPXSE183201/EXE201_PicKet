/** Public site origin behind the reverse proxy (APP_BASE_URL, then forwarded headers). */
export function publicOrigin(request: Request): string {
  const configured = process.env.APP_BASE_URL?.trim();
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      // Fall through to proxy headers for local development or invalid config.
    }
  }

  const forwardedHost = request.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim();
  const host = forwardedHost || request.headers.get("host");
  const forwardedProtocol = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  if (host) return `${forwardedProtocol || "https"}://${host}`;
  return new URL(request.url).origin;
}
