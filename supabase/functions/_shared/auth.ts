import { createClient } from "npm:@supabase/supabase-js@2.57.4";
export const admin = () =>
  createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
export async function requireUser(request: Request) {
  const token = request.headers.get("authorization")?.replace(
    /^Bearer\s+/i,
    "",
  );
  if (!token) throw new Error("Unauthorized");
  const { data, error } = await admin().auth.getUser(token);
  if (error || !data.user) throw new Error("Unauthorized");
  // Consumer Edge endpoints must obey the same fresh session/staff policy as
  // Dart. getUser alone does not prove that a JWT session was not revoked.
  const caller = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data: access, error: accessError } = await caller.rpc("account_access");
  if (accessError || access?.staff !== false || access?.mobileAllowed !== true) {
    throw new Error("Unauthorized");
  }
  return data.user;
}
export async function sha256(value: string) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(bytes)).map((b) =>
    b.toString(16).padStart(2, "0")
  ).join("");
}
export function json(value: unknown, status = 200) {
  return Response.json(value, { status });
}
