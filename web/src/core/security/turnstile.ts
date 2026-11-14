// Read inside functions: these keys are runtime configuration, never build args.
export function turnstileSiteKey(): string | undefined {
  const siteKey = process.env.TURNSTILE_SITE_KEY?.trim();
  return siteKey && process.env.TURNSTILE_SECRET_KEY?.trim() ? siteKey : undefined;
}

export async function verifyTurnstile(token: string, remoteIp?: string): Promise<boolean> {
  if (!turnstileSiteKey()) return true;
  if (!token.trim() || token.length > 2048) return false;
  try {
    const body = new URLSearchParams({
      secret: process.env.TURNSTILE_SECRET_KEY!.trim(),
      response: token,
    });
    if (remoteIp) body.set("remoteip", remoteIp);
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return false;
    const result = await response.json();
    return result?.success === true;
  } catch {
    return false;
  }
}
