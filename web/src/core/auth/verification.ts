/** Sign-up verification channels chosen by admins (GET /v1/auth/channels → `verification`). */
export type SignupChannels = { email: boolean; sms: boolean };

export const DEFAULT_SIGNUP_CHANNELS: SignupChannels = { email: true, sms: false };

/** Accepts the API body; anything unexpected falls back to email-only. */
export function parseSignupChannels(body: unknown): SignupChannels {
  const verification = (body as { verification?: unknown } | null | undefined)?.verification;
  if (!verification || typeof verification !== "object") return { ...DEFAULT_SIGNUP_CHANNELS };
  const { email, sms } = verification as Record<string, unknown>;
  if (typeof email !== "boolean" || typeof sms !== "boolean" || (!email && !sms)) return { ...DEFAULT_SIGNUP_CHANNELS };
  return { email, sms };
}

/** Server-side read, cached for 60 s like the API's public cache. */
export async function loadSignupChannels(apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"): Promise<SignupChannels> {
  try {
    const response = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/v1/auth/channels`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(4000),
    } as RequestInit);
    if (!response.ok) return { ...DEFAULT_SIGNUP_CHANNELS };
    return parseSignupChannels(await response.json());
  } catch {
    return { ...DEFAULT_SIGNUP_CHANNELS };
  }
}
