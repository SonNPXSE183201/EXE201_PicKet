import { formatVnd } from "@picket/domain";

import { requireApiSession } from "@/core/auth/require-api-session";
import { loadAllTransactions } from "@/core/finance/load-transactions";
import { loadSpendingSplits } from "@/core/finance/load-spending-splits";
import { categorySpending, vietnamDate } from "@/core/finance/overview";

import { archiveBudget, createBudget, updateBudget } from "../actions";
import { FinancePageHeader, MutationError } from "../finance-ui";

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function BudgetsPage({ searchParams }: PageProps) {
  const { accessToken, api } = await requireApiSession();
  const month = vietnamDate(new Date().toISOString()).slice(0, 7);
  const [{ budgets }, { categories }, rows, planning] = await Promise.all([
    api.listBudgets(accessToken),
    api.listCategories(accessToken),
    loadAllTransactions(api, accessToken),
    api.getPlanning(accessToken, month),
  ]);
  const spending = categorySpending(
    rows,
    month,
    await loadSpendingSplits(api, accessToken, rows, month),
  );
  const expenseCategories = categories.filter(
    (item) => item.kind === "expense" || item.kind === "both",
  );
  const { error } = await searchParams;
  return (
    <>
      <FinancePageHeader
        title="Ngân sách"
        description="Đặt hạn mức và ngưỡng cảnh báo cho từng danh mục chi tiêu."
      />
      <MutationError visible={Boolean(error)} />
      <section className="finance-columns">
        <article className="finance-panel">
          <h2>Ngân sách mới</h2>
          <form action={createBudget} className="finance-form">
            <label>
              Danh mục
              <select name="categoryId" required>
                {expenseCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Tên ngân sách
              <input maxLength={120} name="name" required />
            </label>
            <label>
              Hạn mức
              <input min="1" name="defaultLimit" required type="number" />
            </label>
            <label>
              Cảnh báo (%)
              <input
                defaultValue="80"
                max="100"
                min="1"
                name="alertPercent"
                required
                type="number"
              />
            </label>
            <button
              className="button primary"
              disabled={expenseCategories.length === 0}
              type="submit"
            >
              Tạo ngân sách
            </button>
          </form>
        </article>
        <section className="finance-stack">
          {budgets
            .filter((b) => !b.deletedAt)
            .map((budget) => (
              <article className="resource-card" key={budget.id}>
                <div className="resource-summary">
                  <div>
                    <h2>{budget.name}</h2>
                    <p>
                      Cảnh báo {budget.alertPercent}% ·{" "}
                      {budget.active ? "Đang bật" : "Đang tắt"} · phiên bản{" "}
                      {budget.version}
                    </p>
                  </div>
                  <strong>{formatVnd(budget.defaultLimit)}</strong>
                </div>
                <p>
                  Tháng {month}: đã chi{" "}
                  {formatVnd(
                    spending.find((s) => s.id === budget.categoryId)?.amount ??
                      0,
                  )}{" "}
                  /{" "}
                  {formatVnd(
                    planning.periods.find((p) => p.budgetId === budget.id)
                      ?.limit ?? budget.defaultLimit,
                  )}
                </p>
                <meter
                  className="budget-meter"
                  min={0}
                  max={Math.max(
                    1,
                    planning.periods.find((p) => p.budgetId === budget.id)
                      ?.limit ?? budget.defaultLimit,
                  )}
                  value={Math.max(
                    0,
                    spending.find((s) => s.id === budget.categoryId)?.amount ??
                      0,
                  )}
                  aria-label={"Mức sử dụng " + budget.name}
                />
                <details>
                  <summary>Chỉnh sửa</summary>
                  <form action={updateBudget} className="inline-form">
                    <input name="id" type="hidden" value={budget.id} />
                    <input
                      name="version"
                      type="hidden"
                      value={budget.version}
                    />
                    <label>
                      Tên
                      <input
                        defaultValue={budget.name}
                        maxLength={120}
                        name="name"
                        required
                      />
                    </label>
                    <label>
                      Hạn mức
                      <input
                        defaultValue={budget.defaultLimit}
                        min="1"
                        name="defaultLimit"
                        type="number"
                      />
                    </label>
                    <label>
                      Cảnh báo
                      <input
                        defaultValue={budget.alertPercent}
                        max="100"
                        min="1"
                        name="alertPercent"
                        type="number"
                      />
                    </label>
                    <label className="checkbox-label">
                      <input
                        defaultChecked={budget.active}
                        name="active"
                        type="checkbox"
                      />{" "}
                      Đang hoạt động
                    </label>
                    <button className="small-button" type="submit">
                      Lưu thay đổi
                    </button>
                  </form>
                </details>
                <form action={archiveBudget}>
                  <input name="id" type="hidden" value={budget.id} />
                  <input name="version" type="hidden" value={budget.version} />
                  <button className="danger-link" type="submit">
                    Lưu trữ ngân sách
                  </button>
                </form>
              </article>
            ))}
          {budgets.length === 0 && (
            <p className="empty-state">Chưa có ngân sách.</p>
          )}
        </section>
      </section>
    </>
  );
}
