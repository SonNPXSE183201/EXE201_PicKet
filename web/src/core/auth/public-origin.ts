/** Public site origin behind the reverse proxy (APP_BASE_URL, then forwarded headers). */
export function publicOrigin(request: Request): string {
  const requestUrl = new URL(request.url);
  const directHost = request.headers.get("host")?.split(",")[0]?.trim();

  // A local browser callback must stay on the local app even if a production
  // APP_BASE_URL is inherited by the dev process or a proxy adds forwarded
  // production headers. Supabase otherwise completes OAuth on the wrong site.
  if (
    directHost &&
    /^(localhost|127(?:\.\d{1,3}){3}|\[::1\])(?::\d+)?$/i.test(directHost)
  ) {
    return `http://${directHost}`;
  }

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
  if (host) return `${forwardedProtocol || requestUrl.protocol.slice(0, -1)}://${host}`;
  return requestUrl.origin;
}
