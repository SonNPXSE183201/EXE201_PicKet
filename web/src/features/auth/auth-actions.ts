"use server";

import { headers } from "next/headers";

import { verifyTurnstile } from "@/core/security/turnstile";

const botError = "Xác minh chống bot không thành công. Vui lòng thử lại.";

/**
 * Checks a Turnstile token before the browser runs its own auth call. Auth itself stays in the
 * browser: proxying it through this server would make Supabase and the API rate limits see one IP
 * (the server) for every visitor.
 */
export async function confirmHuman(token: string): Promise<{ error: string | null }> {
  const requestHeaders = await headers();
  const ip = requestHeaders.get("cf-connecting-ip")?.trim()
    || requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim()
    || undefined;
  return await verifyTurnstile(typeof token === "string" ? token : "", ip) ? { error: null } : { error: botError };
}
