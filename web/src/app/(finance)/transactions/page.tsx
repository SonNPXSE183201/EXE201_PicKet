import { formatVnd } from "@picket/domain";
import Link from "next/link";

import { requireApiSession } from "@/core/auth/require-api-session";
import { loadAllTransactions } from '@/core/finance/load-transactions';
import { filterTransactions,type TransactionFilters } from '@/core/finance/transaction-filter';
import { vietnamDate } from '@/core/finance/overview';

import { archiveTransaction, createTransaction, updateTransaction } from "../actions";
import { FinancePageHeader, MutationError } from "../finance-ui";

interface PageProps { searchParams: Promise<TransactionFilters & { error?: string;page?:string }> }

export default async function TransactionsPage({ searchParams }: PageProps) {
  const { accessToken, api } = await requireApiSession();
  const [{ accounts }, { categories }, allTransactions] = await Promise.all([api.listAccounts(accessToken), api.listCategories(accessToken), loadAllTransactions(api,accessToken)]);
  const query = await searchParams;
  const { error }=query;
  const filtered=filterTransactions(allTransactions,query),pages=Math.max(1,Math.ceil(filtered.length/30)),page=Math.min(pages,Math.max(1,Number(query.page)||1));
  const transactions=filtered.slice((page-1)*30,page*30);
  const pageHref=(n:number)=>{const p=new URLSearchParams();for(const [k,v]of Object.entries(query))if(v&&k!=='error')p.set(k,v);p.set('page',String(n));return '/transactions?'+p;};
  const today = vietnamDate(new Date().toISOString());
  return (
    <>
      <FinancePageHeader title="Giao dịch" description="Tạo khoản thu chi, chuyển tiền, hoàn tiền và chia giao dịch theo danh mục." />
      <MutationError visible={Boolean(error)} />
      <form className="filter-form" role="search"><label>Tìm giao dịch<input name="q" defaultValue={query.q} placeholder="Nội dung hoặc ghi chú" maxLength={160}/></label><label>Từ ngày<input name="from" type="date" defaultValue={query.from}/></label><label>Đến ngày<input name="to" type="date" defaultValue={query.to}/></label><label>Loại<select name="kind" defaultValue={query.kind??''}><option value="">Tất cả</option><option value="expense">Chi tiêu</option><option value="income">Thu nhập</option><option value="transfer">Chuyển tiền</option><option value="refund">Hoàn tiền</option></select></label><label>Ví<select name="account" defaultValue={query.account??''}><option value="">Tất cả ví</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label><button className="button primary" type="submit">Lọc giao dịch</button><Link href="/transactions">Xóa bộ lọc</Link></form>
      <p role="status">{filtered.length} giao dịch · Trang {page}/{pages}</p>
      <div className="finance-toolbar"><Link className="button primary" href="/transactions/transfer">Chuyển tiền</Link><Link className="button secondary" href="/transactions/bulk">Chọn nhiều giao dịch</Link></div>
      <section className="finance-columns wide-form">
        <article className="finance-panel" id="new"><h2>Giao dịch mới</h2>
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
          {transactions.map((transaction) => <article className="resource-card" id={'transaction-'+transaction.id} key={transaction.id}>
            <div className="resource-summary"><div><h2>{transaction.title}</h2><p>{({income:'Thu nhập',expense:'Chi tiêu',refund:'Hoàn tiền',transfer:'Chuyển tiền'})[transaction.kind]} · {new Date(transaction.occurredAt).toLocaleDateString("vi-VN",{timeZone:'Asia/Ho_Chi_Minh'})}</p></div><strong className={transaction.kind === "income"||transaction.kind==='refund' ? "income" : transaction.kind==='expense'?"expense":undefined}>{transaction.kind === "income"||transaction.kind==='refund' ? "+" : transaction.kind==='expense'?"−":"↔ "}{formatVnd(transaction.amount)}</strong></div>
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
          {transactions.length === 0 && <p className="empty-state">Không có giao dịch phù hợp. Thử thay đổi bộ lọc hoặc tạo giao dịch mới.</p>}
          <nav className="pagination" aria-label="Trang giao dịch">{page>1?<Link className="button secondary" href={pageHref(page-1)}>Trang trước</Link>:<span/>}{page<pages&&<Link className="button secondary" href={pageHref(page+1)}>Trang sau</Link>}</nav>
        </section>
      </section>
    </>
  );
}
