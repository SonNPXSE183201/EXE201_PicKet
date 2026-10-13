import { formatVnd } from "@picket/domain";

import { requireApiSession } from "@/core/auth/require-api-session";

import { archiveBudget, createBudget, updateBudget } from "../actions";
import { FinancePageHeader, MutationError } from "../finance-ui";

interface PageProps { searchParams: Promise<{ error?: string }> }

export default async function BudgetsPage({ searchParams }: PageProps) {
  const { accessToken, api } = await requireApiSession();
  const [{ budgets }, { categories }] = await Promise.all([api.listBudgets(accessToken), api.listCategories(accessToken)]);
  const expenseCategories = categories.filter((item) => item.kind === "expense" || item.kind === "both");
  const { error } = await searchParams;
  return (
    <>
      <FinancePageHeader title="Ngân sách" description="Đặt hạn mức và ngưỡng cảnh báo cho từng danh mục chi tiêu." />
      <MutationError visible={Boolean(error)} />
      <section className="finance-columns">
        <article className="finance-panel"><h2>Ngân sách mới</h2><form action={createBudget} className="finance-form">
          <label>Danh mục<select name="categoryId" required>{expenseCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <label>Tên ngân sách<input maxLength={120} name="name" required /></label><label>Hạn mức<input min="1" name="defaultLimit" required type="number" /></label><label>Cảnh báo (%)<input defaultValue="80" max="100" min="1" name="alertPercent" required type="number" /></label>
          <button className="button primary" disabled={expenseCategories.length === 0} type="submit">Tạo ngân sách</button>
        </form></article>
        <section className="finance-stack">{budgets.map((budget) => <article className="resource-card" key={budget.id}>
          <div className="resource-summary"><div><h2>{budget.name}</h2><p>Cảnh báo {budget.alertPercent}% · {budget.active ? "Đang bật" : "Đang tắt"} · phiên bản {budget.version}</p></div><strong>{formatVnd(budget.defaultLimit)}</strong></div>
          <details><summary>Chỉnh sửa</summary><form action={updateBudget} className="inline-form"><input name="id" type="hidden" value={budget.id} /><input name="version" type="hidden" value={budget.version} /><label>Tên<input defaultValue={budget.name} maxLength={120} name="name" required /></label><label>Hạn mức<input defaultValue={budget.defaultLimit} min="1" name="defaultLimit" type="number" /></label><label>Cảnh báo<input defaultValue={budget.alertPercent} max="100" min="1" name="alertPercent" type="number" /></label><label className="checkbox-label"><input defaultChecked={budget.active} name="active" type="checkbox" /> Đang hoạt động</label><button className="small-button" type="submit">Lưu thay đổi</button></form></details>
          <form action={archiveBudget}><input name="id" type="hidden" value={budget.id} /><input name="version" type="hidden" value={budget.version} /><button className="danger-link" type="submit">Lưu trữ ngân sách</button></form>
        </article>)}{budgets.length === 0 && <p className="empty-state">Chưa có ngân sách.</p>}</section>
      </section>
    </>
  );
}
