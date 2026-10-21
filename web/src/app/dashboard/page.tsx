import { formatVnd } from '@picket/domain';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireApiSession } from '@/core/auth/require-api-session';
import { loadAllTransactions } from '@/core/finance/load-transactions';
import { monthSummary, walletBalances, vietnamDate } from '@/core/finance/overview';
import { WorkspaceShell, Icon } from '@/core/ui/workspace-shell';
import { ReceiptCalendar } from '@/core/ui/receipt-calendar';
import { FinanceRealtime } from '../(finance)/finance-realtime';

export default async function DashboardPage({searchParams}:{searchParams:Promise<{month?:string}>}) {
  const {api,accessToken,claims}=await requireApiSession();
  const [{profile},{accounts},transactions,query,{receipts}]=await Promise.all([api.currentProfile(accessToken),api.listAccounts(accessToken),loadAllTransactions(api,accessToken),searchParams,api.listReceipts(accessToken)]);
  if(!profile?.onboardingCompleted) redirect('/onboarding');
  const month=/^\d{4}-(0[1-9]|1[0-2])$/.test(query.month??'')?query.month!:vietnamDate(new Date().toISOString()).slice(0,7);
  const currencyAccounts=accounts.filter(a=>a.currencyCode===profile.currencyCode);
  const currencyTransactions=transactions.filter(t=>currencyAccounts.some(a=>a.id===t.accountId));
  const balances=walletBalances(accounts,transactions),summary=monthSummary(currencyTransactions,month);
  const money=(amount:number)=>profile.hideBalance?'••••••':profile.currencyCode==='VND'?formatVnd(amount):new Intl.NumberFormat('vi-VN',{style:'currency',currency:profile.currencyCode}).format(amount);
  const shift=(delta:number)=>{const d=new Date(month+'-15T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+delta);return d.toISOString().slice(0,7);};
  const recent=transactions.filter(t=>!t.deletedAt).slice(0,6);
  return <WorkspaceShell><main>
    <FinanceRealtime userId={String(claims.sub)}/>
    <header className="overview-intro"><p>Chào {profile.displayName}</p><h1>Tài chính của bạn</h1></header>
    <section className="overview-balance" aria-label="Tổng số dư"><p>Tổng số dư · {profile.currencyCode}</p><strong>{money(currencyAccounts.filter(a=>!a.archived&&!a.deletedAt).reduce((sum,a)=>sum+(balances[a.id]??0),0))}</strong><Link href="/accounts">{accounts.filter(a=>!a.archived&&!a.deletedAt).length} ví của bạn</Link>{accounts.some(a=>a.currencyCode!==profile.currencyCode)&&<p>Các ví khác tiền tệ được hiển thị riêng tại mục Ví, không cộng chung hoặc tự quy đổi.</p>}</section>
    <nav className="overview-period" aria-label="Chọn tháng"><Link href={'/dashboard?month='+shift(-1)} aria-label="Tháng trước">‹</Link><span>Tháng {Number(month.slice(5))}, {month.slice(0,4)}</span><Link href={'/dashboard?month='+shift(1)} aria-label="Tháng sau">›</Link></nav>
    <section className="overview-summary" aria-label="Thu chi tháng"><article><Icon name="transfer"/><p>Thu nhập</p><strong className="income">{money(summary.income)}</strong></article><article><Icon name="chart"/><p>Chi tiêu</p><strong className="expense">{money(summary.expense)}</strong></article></section>
    <nav className="overview-actions" aria-label="Thao tác nhanh"><Link className="icon-action" aria-label="Thêm giao dịch" href="/transactions#new">＋</Link><Link className="button secondary" href="/transactions/transfer">Chuyển tiền</Link><Link className="button secondary" href="/receipts">Hóa đơn</Link></nav>
    <section className="data-panel"><div className="panel-heading"><h2>Giao dịch gần đây</h2><Link href="/transactions">Xem tất cả</Link></div>{!recent.length?<p className="empty-state">Chưa có giao dịch. Thêm khoản thu hoặc chi đầu tiên của bạn.</p>:recent.map(row=><div className="data-row" key={row.id}><div><strong>{row.title}</strong><span>{new Date(row.occurredAt).toLocaleDateString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})}</span></div><strong className={row.kind==='income'||row.kind==='refund'?'income':row.kind==='expense'?'expense':undefined}>{row.kind==='income'||row.kind==='refund'?'+':row.kind==='expense'?'−':'↔ '}{profile.hideBalance?'••••••':new Intl.NumberFormat('vi-VN',{style:'currency',currency:accounts.find(a=>a.id===row.accountId)?.currencyCode??profile.currencyCode}).format(row.amount)}</strong></div>)}</section>
    <ReceiptCalendar dates={receipts.flatMap(r=>r.purchasedAt?[r.purchasedAt]:[])} initialMonth={month}/>
  </main></WorkspaceShell>;
}
