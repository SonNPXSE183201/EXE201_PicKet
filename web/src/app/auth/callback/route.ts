import { NextResponse } from "next/server";

import { safeNext } from "@/core/auth/oauth-redirect";
import { publicOrigin } from "@/core/auth/public-origin";
import { createClient } from "@/core/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = publicOrigin(request);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }

  return NextResponse.redirect(new URL("/login?error=oauth_callback", origin));
}
