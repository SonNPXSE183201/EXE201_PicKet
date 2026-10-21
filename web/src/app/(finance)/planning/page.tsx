import { formatVnd } from '@picket/domain';
import { requireApiSession } from '@/core/auth/require-api-session';
import { vietnamDate } from '@/core/finance/overview';
import { FinancePageHeader } from '../finance-ui';
import { changeMethod,closeMonth,transferLimit } from './planning-actions';

export default async function PlanningPage({searchParams}:{searchParams:Promise<{month?:string;error?:string;done?:string}>}) {
  const {api,accessToken}=await requireApiSession();
  const query=await searchParams;
  const month=/^\d{4}-(0[1-9]|1[0-2])$/.test(query.month??'')?query.month!:vietnamDate(new Date().toISOString()).slice(0,7);
  const [planning,{budgets}]=await Promise.all([api.getPlanning(accessToken,month),api.listBudgets(accessToken)]);
  const options=budgets.filter(b=>!b.deletedAt&&b.active);
  return <><FinancePageHeader title="Kế hoạch" description="Chọn cách lập ngân sách và quản lý từng tháng."/>{query.error&&<p role="alert" className="mutation-error">Chưa lưu được. Kiểm tra hạn mức, tháng đã đóng và thử lại.</p>}{query.done&&<p role="status" className="admin-success">Đã lưu kế hoạch.</p>}
    <form className="finance-toolbar"><label>Tháng<input type="month" name="month" defaultValue={month}/></label><button className="button secondary">Xem tháng</button></form>
    <div className="settings-grid"><article className="finance-panel"><h2>Phương pháp</h2><form action={changeMethod} className="finance-form"><input type="hidden" name="month" value={month}/><label>Cách lập kế hoạch<select name="method" defaultValue={planning.method}><option value="simple">Đơn giản</option><option value="envelope">Phong bì</option><option value="zero_based">Zero-based</option><option value="fifty_thirty_twenty">50 / 30 / 20</option><option value="event">Theo sự kiện</option></select></label><button className="button primary">Lưu phương pháp</button></form></article>
    <article className="data-panel"><h2>Hạn mức trong tháng</h2>{options.map(b=>{const period=planning.periods.find(p=>p.budgetId===b.id);return <div className="data-row" key={b.id}><span>{b.name}</span><strong>{formatVnd(period?.limit??b.defaultLimit)}</strong></div>;})}{!options.length&&<p className="empty-state">Tạo ngân sách để bắt đầu lập kế hoạch.</p>}</article>
    <article className="finance-panel"><h2>Điều chuyển ngân sách</h2><form action={transferLimit} className="finance-form"><input type="hidden" name="month" value={month}/><label>Từ ngân sách<select name="source" required>{options.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label><label>Sang ngân sách<select name="destination" required>{options.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label><label>Số tiền<input type="number" inputMode="numeric" name="amount" min="1" step="1" required/></label><button disabled={options.length<2||Boolean(planning.close)} className="button primary">Điều chuyển</button></form></article>
    <article className="finance-panel"><h2>Chốt tháng</h2>{planning.close?<p role="status">Tháng này đã chốt. Thu nhập {formatVnd(planning.close.income)}, chi tiêu {formatVnd(planning.close.expense)}.</p>:<form action={closeMonth} className="finance-form"><input type="hidden" name="month" value={month}/><label className="checkbox-label"><input type="checkbox" name="rollover"/>Chuyển phần dư sang tháng sau</label><label>Ghi chú<textarea name="note" maxLength={1000} rows={3}/></label><p>Giao dịch trong tháng đã chốt sẽ bị khóa sửa. Nhập CLOSE để xác nhận.</p><label>Xác nhận<input required pattern="CLOSE" name="confirmation" autoComplete="off"/></label><button className="button primary">Chốt tháng {month}</button></form>}</article></div></>;
}
