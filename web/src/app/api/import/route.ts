import { ApiError, PicketApiClient } from "@picket/api-client";

import { createClient } from "@/core/supabase/server";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
const maxBytes = 11_000_000;

async function authenticatedApi() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) return null;
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  const {data:staff,error:roleError}=await supabase.rpc('is_staff');
  if(roleError || staff !== false) return null;
  return token ? { api: new PicketApiClient(apiBaseUrl), token } : null;
}

async function body(request: Request) {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > maxBytes) throw new ApiError("File too large", 413);
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > maxBytes) {
    throw new ApiError("File too large", 413);
  }
  return JSON.parse(raw);
}

export async function POST(request: Request) {
  const auth = await authenticatedApi();
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const exported = await body(request);
    const summary = await auth.api.validateFinanceImport(auth.token, exported);
    const current = await auth.api.loadFinanceSnapshot(auth.token);
    return Response.json({ ...summary, currentRevision: current.revision }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 400;
    return Response.json({ error: "Invalid backup file" }, { status });
  }
}

export async function PUT(request: Request) {
  const auth = await authenticatedApi();
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const restore = await body(request);
    const result = await auth.api.restoreFinance(auth.token, restore);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 400;
    return Response.json({ error: status === 409 ? "Data changed; validate again" : "Restore failed" }, { status });
  }
}
