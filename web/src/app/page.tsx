import { redirect } from "next/navigation";

import { createClient } from "@/core/supabase/server";

/* The marketing site lives at picketfinance.com; the web app root only routes.
   Supabase email links may land here with ?code=…, which must finish in
   /auth/callback so the session is created. */
export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const code = typeof params.code === "string" ? params.code : undefined;
  if (code) redirect(`/auth/callback?${new URLSearchParams({ code, next: "/session" })}`);

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  redirect(data?.claims ? "/session" : "/login");
}
