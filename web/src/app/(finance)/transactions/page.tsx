import { formatVnd } from "@picket/domain";
import Link from "next/link";

import { requireApiSession } from "@/core/auth/require-api-session";

import { archiveTransaction, createTransaction, updateTransaction } from "../actions";
import { FinancePageHeader, MutationError } from "../finance-ui";

interface PageProps { searchParams: Promise<{ error?: string }> }

export default async function TransactionsPage({ searchParams }: PageProps) {
  const { accessToken, api } = await requireApiSession();
  const [{ accounts }, { categories }, { transactions }] = await Promise.all([api.listAccounts(accessToken), api.listCategories(accessToken), api.listTransactions(accessToken, { limit: 100 })]);
  const { error } = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  return (
    <>
      <FinancePageHeader title="Giao dịch" description="Tạo khoản thu chi, chuyển tiền, hoàn tiền và chia giao dịch theo danh mục." />
      <MutationError visible={Boolean(error)} />
      <div className="finance-toolbar"><Link className="button primary" href="/transactions/transfer">Chuyển tiền</Link></div>
      <section className="finance-columns wide-form">
        <article className="finance-panel"><h2>Giao dịch mới</h2>
          <form action={createTransaction} className="finance-form">
            <label>Loại<select defaultValue="expense" name="kind"><option value="expense">Khoản chi</option><option value="income">Khoản thu</option></select></label>
            <label>Nội dung<input maxLength={160} name="title" required /></label>
            <label>Số tiền<input inputMode="numeric" min="1" name="amount" required type="number" /></label>
            <label>Tài khoản<select name="accountId" required>{accounts.filter((item) => !item.archived).map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
            <label>Danh mục<select name="categoryId"><option value="">Không phân loại</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
            <label>Ngày<input defaultValue={today} name="occurredAt" required type="date" /></label>
            <label>Ghi chú<textarea maxLength={1000} name="note" rows={3} /></label>
            <button className="button primary" disabled={accounts.length === 0} type="submit">Tạo giao dịch</button>
          </form>
        </article>
        <section className="finance-stack">
          {transactions.map((transaction) => <article className="resource-card" key={transaction.id}>
            <div className="resource-summary"><div><h2>{transaction.title}</h2><p>{transaction.kind} · {new Date(transaction.occurredAt).toLocaleDateString("vi-VN")} · phiên bản {transaction.version}</p></div><strong className={transaction.kind === "income" ? "income" : "expense"}>{transaction.kind === "income" ? "+" : "−"}{formatVnd(transaction.amount)}</strong></div>
            {(transaction.kind === "expense" || transaction.kind === "income") && <details><summary>Chỉnh sửa</summary><form action={updateTransaction} className="inline-form transaction-edit">
              <input name="id" type="hidden" value={transaction.id} /><input name="version" type="hidden" value={transaction.version} /><input name="kind" type="hidden" value={transaction.kind} />
              <label>Nội dung<input defaultValue={transaction.title} maxLength={160} name="title" required /></label><label>Số tiền<input defaultValue={transaction.amount} min="1" name="amount" required type="number" /></label>
              <label>Tài khoản<select defaultValue={transaction.accountId} name="accountId">{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
              <label>Danh mục<select defaultValue={transaction.categoryId ?? ""} name="categoryId"><option value="">Không phân loại</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
              <label>Ngày<input defaultValue={transaction.occurredAt.slice(0, 10)} name="occurredAt" type="date" /></label><label>Ghi chú<textarea defaultValue={transaction.note} maxLength={1000} name="note" rows={2} /></label><button className="small-button" type="submit">Lưu thay đổi</button>
            </form></details>}
            {(transaction.kind === "expense" || transaction.kind === "income") && <div className="resource-actions">
              <Link href={`/transactions/${transaction.id}/splits`}>Chia danh mục</Link>
              {transaction.kind === "expense" && <Link href={`/transactions/${transaction.id}/refund`}>Tạo hoàn tiền</Link>}
            </div>}
            <form action={archiveTransaction}><input name="id" type="hidden" value={transaction.id} /><input name="version" type="hidden" value={transaction.version} /><button className="danger-link" type="submit">Lưu trữ giao dịch</button></form>
          </article>)}
          {transactions.length === 0 && <p className="empty-state">Chưa có giao dịch.</p>}
        </section>
      </section>
    </>
  );
}
