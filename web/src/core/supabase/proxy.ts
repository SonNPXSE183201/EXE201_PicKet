import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { passwordSetupRequestRedirect } from "@/core/auth/password-setup";
import { getSupabasePublicConfig } from "@/core/supabase/config";

export async function updateSession(request: NextRequest) {
  const { publishableKey, url } = getSupabasePublicConfig();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, options, value }) => {
          response.cookies.set(name, value, options);
        });
        Object.entries(headers).forEach(([name, value]) => {
          response.headers.set(name, value);
        });
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  // OTP-first sign-up: the account must set a password before using the app.
  // Server actions (POST + next-action, e.g. sign out) pass through; GET/HEAD are always gated.
  const target = passwordSetupRequestRedirect({
    method: request.method,
    pathname: request.nextUrl.pathname,
    hasNextAction: request.headers.has("next-action"),
  }, data?.claims);
  if (target) {
    const redirect = NextResponse.redirect(new URL(target, request.url));
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }
  return response;
}
