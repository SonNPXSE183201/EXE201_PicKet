import { NextResponse } from "next/server";

import { safeNext } from "@/core/auth/oauth-redirect";
import { publicOrigin } from "@/core/auth/public-origin";
import { createClient } from "@/core/supabase/server";

/* The API rejected this browser's session (expired, revoked or locked by PIN).
   Clear the local session cookies so /login does not bounce back to /session,
   then ask the user to sign in again. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get("next"));
  try {
    await (await createClient()).auth.signOut({ scope: "local" });
  } catch {
    /* Cookies are cleared below by the redirect either way. */
  }
  const target = new URL("/login", publicOrigin(request));
  target.searchParams.set("error", "expired");
  if (next && next !== "/dashboard") target.searchParams.set("next", next);
  return NextResponse.redirect(target);
}
