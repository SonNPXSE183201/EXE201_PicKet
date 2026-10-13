import { PicketApiClient } from "@picket/api-client";

import { createClient } from "@/core/supabase/server";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export async function GET() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const api = new PicketApiClient(apiBaseUrl);
    const exported = await api.exportFinance(accessToken);
    const date = exported.exportedAt.slice(0, 10);
    return new Response(JSON.stringify(exported, null, 2), {
      headers: {
        "Cache-Control": "no-store, private",
        "Content-Disposition": `attachment; filename="picket-export-${date}.json"`,
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return Response.json({ error: "Unable to export finance data" }, { status: 502 });
  }
}
