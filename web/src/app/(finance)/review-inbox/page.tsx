import Link from "next/link";
import { requireApiSession } from "@/core/auth/require-api-session";
import { loadAllTransactions } from "@/core/finance/load-transactions";
import { FinancePageHeader } from "../finance-ui";
import { createClient } from "@/core/supabase/server";
export default async function ReviewInboxPage() {
  const { api, accessToken } = await requireApiSession();
  const client = await createClient();
  const [rows, receipts] = await Promise.all([
    loadAllTransactions(api, accessToken),
    client
      .from("receipts")
      .select("id,merchant,status")
      .eq("review_required", true)
      .is("archived_at", null),
  ]);
  if (receipts.error) throw new Error("Chưa tải được hóa đơn cần kiểm tra.");
  const uncategorized = rows.filter(
    (r) => !r.deletedAt && r.kind === "expense" && !r.categoryId,
  );
  const groups = new Map<string, typeof rows>();
  for (const r of rows.filter((r) => !r.deletedAt && r.kind === "expense")) {
    const key = [
      r.accountId,
      r.amount,
      r.occurredAt.slice(0, 10),
      r.title.trim().toLowerCase(),
    ].join("|");
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  const duplicates = [...groups.values()].filter((g) => g.length > 1);
  return (
    <>
      <FinancePageHeader
        title="Cần kiểm tra"
        description="Xem lại hóa đơn nhận diện, các khoản chưa phân loại và nghi trùng."
      />
      <div className="settings-grid">
        <article className="data-panel">
          <h2>Hóa đơn cần xem lại</h2>
          {(receipts.data ?? []).map((r) => (
            <Link key={r.id} className="data-row" href={"/receipts/" + r.id}>
              {r.merchant || "Hóa đơn chưa có tên"}
            </Link>
          ))}
          {!receipts.data?.length && (
            <p className="empty-state">Không có hóa đơn cần xem lại.</p>
          )}
        </article>
        <article className="data-panel">
          <h2>Chưa phân loại</h2>
          {uncategorized.map((r) => (
            <Link
              className="data-row"
              key={r.id}
              href={"/transactions/" + r.id}
            >
              {r.title}
            </Link>
          ))}
          {!uncategorized.length && (
            <p className="empty-state">Các khoản chi đã được phân loại.</p>
          )}
        </article>
        <article className="data-panel">
          <h2>Giao dịch có thể trùng</h2>
          <p>
            Chỉ gợi ý kiểm tra, không tự xóa. Các khoản lặp lại hợp lệ vẫn có
            thể giống nhau.
          </p>
          {duplicates.map((group, i) => (
            <div key={i}>
              <h3>{group[0].title}</h3>
              {group.map((r) => (
                <Link
                  key={r.id}
                  className="data-row"
                  href={"/transactions/" + r.id}
                >
                  Xem khoản {r.amount.toLocaleString("vi-VN")} ·{" "}
                  {new Date(r.occurredAt).toLocaleString("vi-VN")}
                </Link>
              ))}
            </div>
          ))}
          {!duplicates.length && (
            <p className="empty-state">
              Chưa phát hiện nhóm giao dịch nghi trùng.
            </p>
          )}
        </article>
      </div>
    </>
  );
}
