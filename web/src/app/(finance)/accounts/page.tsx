import { formatVnd } from "@picket/domain";

import { requireApiSession } from "@/core/auth/require-api-session";
import { loadAllTransactions } from '@/core/finance/load-transactions';
import { walletBalances } from '@/core/finance/overview';

import { archiveAccount, createAccount, updateAccount } from "../actions";
import { FinancePageHeader, MutationError } from "../finance-ui";

interface PageProps { searchParams: Promise<{ error?: string }> }

export default async function AccountsPage({ searchParams }: PageProps) {
  const { accessToken, api } = await requireApiSession();
  const [{ accounts },transactions] = await Promise.all([api.listAccounts(accessToken),loadAllTransactions(api,accessToken)]);
  const balances=walletBalances(accounts,transactions);
  const { error } = await searchParams;
  return (
    <>
      <FinancePageHeader title="Ví của bạn" description="Tiền mặt, ngân hàng và ví điện tử. Số dư được tính từ các giao dịch đang hoạt động." />
      <MutationError visible={Boolean(error)} />
      <section className="finance-columns">
        <article className="finance-panel">
          <h2>Thêm tài khoản</h2>
          <form action={createAccount} className="finance-form">
            <label>Tên tài khoản<input name="name" required maxLength={80} /></label>
            <label>Loại<select name="kind" defaultValue="cash"><option value="cash">Tiền mặt</option><option value="bank">Ngân hàng</option><option value="ewallet">Ví điện tử</option><option value="other">Khác</option></select></label>
            <label>Tiền tệ<input defaultValue="VND" maxLength={3} name="currencyCode" required /></label>
            <label>Số dư ban đầu<input defaultValue="0" inputMode="numeric" name="openingBalance" required /></label>
            <button className="button primary" type="submit">Tạo tài khoản</button>
          </form>
        </article>
        <section className="finance-stack">
          {accounts.map((account) => (
            <article className="resource-card" key={account.id}>
              <div className="resource-summary"><div><h2>{account.name}</h2><p>{({cash:'Tiền mặt',bank:'Ngân hàng',ewallet:'Ví điện tử',other:'Khác'})[account.kind]} · {account.currencyCode}{account.archived?' · Đã lưu trữ':''}</p></div><strong>{account.currencyCode==='VND'?formatVnd(balances[account.id]??0):new Intl.NumberFormat('vi-VN',{style:'currency',currency:account.currencyCode}).format(balances[account.id]??0)}</strong></div>
              <details><summary>Chỉnh sửa</summary>
                <form action={updateAccount} className="inline-form">
                  <input name="id" type="hidden" value={account.id} /><input name="version" type="hidden" value={account.version} />
                  <label>Tên<input defaultValue={account.name} maxLength={80} name="name" required /></label>
                  <label>Loại<select defaultValue={account.kind} name="kind"><option value="cash">Tiền mặt</option><option value="bank">Ngân hàng</option><option value="ewallet">Ví điện tử</option><option value="other">Khác</option></select></label>
                  <label>Tiền tệ<input defaultValue={account.currencyCode} maxLength={3} name="currencyCode" required /></label>
                  <button className="small-button" type="submit">Lưu thay đổi</button>
                </form>
              </details>
              {!account.archived && <form action={archiveAccount}><input name="id" type="hidden" value={account.id} /><input name="version" type="hidden" value={account.version} /><button className="danger-link" type="submit">Lưu trữ tài khoản</button></form>}
            </article>
          ))}
          {accounts.length === 0 && <p className="empty-state">Chưa có tài khoản.</p>}
        </section>
      </section>
    </>
  );
}
