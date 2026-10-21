import { requireApiSession } from "@/core/auth/require-api-session";
import { loadAllTransactions } from "@/core/finance/load-transactions";
import {
  monthSummary,
  vietnamDate,
  categorySpending,
} from "@/core/finance/overview";
import { loadSpendingSplits } from "@/core/finance/load-spending-splits";
import { FinancePageHeader } from "../finance-ui";
export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { api, accessToken } = await requireApiSession();
  const query = await searchParams;
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(query.month ?? "")
    ? query.month!
    : vietnamDate(new Date().toISOString()).slice(0, 7);
  const [allRows, { categories }, { accounts }, { profile }] =
    await Promise.all([
      loadAllTransactions(api, accessToken),
      api.listCategories(accessToken),
      api.listAccounts(accessToken),
      api.currentProfile(accessToken),
    ]);
  const currency = profile?.currencyCode ?? "VND",
    wallets = new Set(
      accounts.filter((a) => a.currencyCode === currency).map((a) => a.id),
    ),
    rows = allRows.filter((t) => wallets.has(t.accountId)),
    summary = monthSummary(rows, month);
  const spending = categorySpending(
      rows,
      month,
      await loadSpendingSplits(api, accessToken, rows, month),
    ),
    max = Math.max(1, ...spending.map((s) => s.amount));
  const money = (n: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency }).format(n);
  return (
    <>
      <FinancePageHeader
        title="Thống kê"
        description={
          "Theo dõi thu nhập và chi tiêu ròng theo tháng · " + currency
        }
      />
      <form className="filter-form">
        <label>
          Tháng
          <input type="month" name="month" defaultValue={month} />
        </label>
        <button className="button secondary">Xem thống kê</button>
      </form>
      <section className="overview-summary">
        <article>
          <h2>Thu nhập</h2>
          <strong className="income">{money(summary.income)}</strong>
        </article>
        <article>
          <h2>Chi tiêu ròng</h2>
          <strong className="expense">{money(summary.expense)}</strong>
        </article>
      </section>
      <article className="data-panel">
        <h2>Chi tiêu theo danh mục</h2>
        {spending.map((s) => (
          <div className="spending-row" key={s.id}>
            <div>
              <span>
                {categories.find((c) => c.id === s.id)?.name ??
                  "Chưa phân loại"}
              </span>
              <strong>{money(s.amount)}</strong>
            </div>
            <meter
              min={0}
              max={max}
              value={Math.max(0, s.amount)}
              aria-label={
                "Chi tiêu " +
                (categories.find((c) => c.id === s.id)?.name ??
                  "chưa phân loại")
              }
            />
          </div>
        ))}
        {!spending.length && (
          <p className="empty-state">Chưa có chi tiêu trong tháng này.</p>
        )}
        <p>Đã tính các phần chia danh mục và hoàn tiền theo giao dịch gốc.</p>
      </article>
      <article className="data-panel">
        <h2>Chênh lệch thu chi</h2>
        <p>{money(summary.income - summary.expense)}</p>
        <p>
          Hoàn tiền được trừ khỏi chi tiêu, không tính thêm vào thu nhập. Chỉ
          tổng hợp các ví cùng tiền tệ {currency}.
        </p>
      </article>
    </>
  );
}
