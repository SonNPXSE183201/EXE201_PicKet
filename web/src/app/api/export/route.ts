import { PicketApiClient } from "@picket/api-client";

import { createClient } from "@/core/supabase/server";
import { loadAllTransactions } from "@/core/finance/load-transactions";
import { projectLiveBackup } from "@/core/finance/backup-live-guard";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export async function GET() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { data: staff, error: roleError } = await supabase.rpc("is_staff");
  if (roleError || staff !== false)
    return Response.json({ error: "User workspace required" }, { status: 403 });

  try {
    const api = new PicketApiClient(apiBaseUrl);
    let exported = await api.exportFinance(accessToken);
    const [
      { accounts },
      transactions,
      { budgets },
      { bills },
      { keepsakes },
      { subscriptions },
    ] = await Promise.all([
      api.listAccounts(accessToken),
      loadAllTransactions(api, accessToken),
      api.listBudgets(accessToken),
      api.listBills(accessToken),
      api.listKeepsakes(accessToken),
      api.listSubscriptions(accessToken),
    ]);
    try {
      exported = {
        ...exported,
        data: projectLiveBackup(exported.data, {
          wallets: new Set(
            accounts
              .filter((a) => !a.archived && !a.deletedAt)
              .map((a) => a.id),
          ),
          entries: new Set(
            transactions.filter((t) => !t.deletedAt).map((t) => t.id),
          ),
          budgets: new Set(
            budgets.filter((b) => !b.deletedAt && b.active).map((b) => b.id),
          ),
          bills: new Set(bills.filter((b) => !b.deletedAt).map((b) => b.id)),
          keepsakes: new Set(
            keepsakes.filter((k) => !k.deletedAt).map((k) => k.id),
          ),
          subscriptions: new Set(
            subscriptions.filter((s) => !s.deletedAt).map((s) => s.id),
          ),
        }),
      };
      await api.validateFinanceImport(accessToken, exported);
      const current = await api.loadFinanceSnapshot(accessToken);
      if (current.revision !== exported.revision)
        throw Error("Data changed during export.");
    } catch {
      return Response.json(
        {
          error:
            "Chưa thể tạo bản sao an toàn: dữ liệu xuất không khớp bản ghi đang hoạt động hoặc vừa thay đổi. Chưa có file nào được tạo. Cần kiểm tra dịch vụ xuất dữ liệu trước khi thử lại.",
        },
        { status: 409, headers: { "Cache-Control": "no-store, private" } },
      );
    }
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
    return Response.json(
      { error: "Unable to export finance data" },
      { status: 502 },
    );
  }
}
