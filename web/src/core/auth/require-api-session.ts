import { PicketApiClient } from "@picket/api-client";
import { redirect } from "next/navigation";

import { createClient } from "@/core/supabase/server";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export async function requireApiSession() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) redirect("/login");

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) redirect("/login");

  return {
    accessToken,
    api: new PicketApiClient(apiBaseUrl),
    claims: claimsData.claims,
  };
}
