function origin(value?: string): string | undefined {
  try {
    const url = new URL(value ?? "");
    return ["http:", "https:"].includes(url.protocol) ? url.origin : undefined;
  } catch {
    return undefined;
  }
}

export function buildCsp({ apiUrl, supabaseUrl, dev }: {
  apiUrl?: string;
  supabaseUrl?: string;
  dev: boolean;
}): string {
  const api = origin(apiUrl);
  const supabase = origin(supabaseUrl);
  const connections = [...new Set([
    "'self'", api, supabase,
    supabase ? supabase.replace(/^https?:/, "wss:") : undefined,
    dev ? "ws:" : undefined,
    "https://accounts.google.com",
  ].filter(Boolean))].join(" ");
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""} https://challenges.cloudflare.com https://accounts.google.com`,
    "style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src ${connections}`,
    "frame-src https://challenges.cloudflare.com https://accounts.google.com",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    ...(!dev ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}
