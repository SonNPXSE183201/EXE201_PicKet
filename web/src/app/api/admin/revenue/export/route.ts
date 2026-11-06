import { requireApiSession } from "@/core/auth/require-api-session";

const ALLOWED = ["source", "status", "kind", "ref", "from", "to", "userId"];
const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

/** Streams the API's traceable revenue CSV with the admin's own session. */
export async function GET(request: Request) {
  const { accessToken } = await requireApiSession("admin");
  const incoming = new URL(request.url).searchParams;
  const query = new URLSearchParams({ view: "csv" });
  for (const key of ALLOWED) {
    const value = incoming.get(key);
    if (value) query.set(key, value.slice(0, 120));
  }
  const response = await fetch(`${apiBaseUrl}/v1/admin/revenue?${query}`, {
    headers: { authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok)
    return Response.json(
      { error: "Không có quyền tải sổ doanh thu." },
      { status: response.status === 401 ? 401 : 403 },
    );
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(await response.text(), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="picket-revenue-${stamp}.csv"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
