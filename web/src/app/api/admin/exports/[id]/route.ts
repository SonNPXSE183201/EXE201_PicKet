import { requireApiSession } from "@/core/auth/require-api-session";
import { exportCsv } from "@/features/admin/export-csv";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id))
    return Response.json({ error: "Invalid export" }, { status: 400 });
  const { api, accessToken } = await requireApiSession("admin");
  try {
    const result = await api.adminExports<{ status: string; data: unknown }>(
      accessToken,
      id,
    );
    if (result.status !== "ready")
      return Response.json(
        { error: "Báo cáo chưa sẵn sàng hoặc đã hết hạn." },
        { status: 409 },
      );
    return new Response(exportCsv(result.data), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="picket-admin-${id}.csv"`,
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return Response.json(
      { error: "Không có quyền tải báo cáo này." },
      { status: 403 },
    );
  }
}
