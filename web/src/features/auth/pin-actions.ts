"use server";
import { cookies } from "next/headers";
import { createClient } from "@/core/supabase/server";
import { getSupabasePublicConfig } from "@/core/supabase/config";

const deviceCookie = "picket_quick_device";
function authCookie(name: string) {
  const project = new URL(getSupabasePublicConfig().url).hostname.split(".")[0];
  const prefix = `sb-${project}-auth-token`;
  return name === prefix || name.startsWith(`${prefix}.`);
}
async function request(
  body: Record<string, unknown>,
  token?: string,
): Promise<Record<string, string>> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"}/v1/account/quick-login`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    },
  );
  if (!response.ok) throw new Error("Quick login unavailable");
  return response.json();
}
export async function lockWithPin(form: FormData): Promise<boolean> {
  try {
    const pin = String(form.get("pin") ?? "");
    if (!/^\d{6}$/.test(pin) || pin !== form.get("confirmation")) return false;
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return false;
    const result = await request(
      { action: "save", pin, refreshToken: session.refresh_token },
      session.access_token,
    );
    const store = await cookies();
    store.set(deviceCookie, result.deviceToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });
    for (const cookie of store.getAll())
      if (authCookie(cookie.name)) store.delete(cookie.name);
    return true;
  } catch {
    return false;
  }
}
export async function unlockWithPin(form: FormData): Promise<boolean> {
  try {
    const store = await cookies();
    const deviceToken = store.get(deviceCookie)?.value;
    const pin = String(form.get("pin") ?? "");
    if (!deviceToken || !/^\d{6}$/.test(pin)) return false;
    const result = await request({ action: "unlock", deviceToken, pin });
    const { error } = await (
      await createClient()
    ).auth.setSession({
      access_token: result.accessToken,
      refresh_token: result.refreshToken,
    });
    return !error;
  } catch {
    return false;
  }
}
export async function lockExistingPin(): Promise<boolean> {
  try {
    const store = await cookies();
    const deviceToken = store.get(deviceCookie)?.value;
    const {
      data: { session },
    } = await (await createClient()).auth.getSession();
    if (!deviceToken || !session) return false;
    await request(
      { action: "lock", deviceToken, refreshToken: session.refresh_token },
      session.access_token,
    );
    for (const cookie of store.getAll())
      if (authCookie(cookie.name)) store.delete(cookie.name);
    return true;
  } catch {
    return false;
  }
}
export async function revokePinDevice(): Promise<void> {
  const store = await cookies();
  const deviceToken = store.get(deviceCookie)?.value;
  try {
    if (deviceToken) await request({ action: "revoke", deviceToken });
  } finally {
    store.delete(deviceCookie);
  }
}
