import Link from 'next/link';
import { formatVnd } from '@picket/domain';
import { requireApiSession } from '@/core/auth/require-api-session';
import { FinancePageHeader } from '../finance-ui';
export default async function NotificationsPage() {
  const {api,accessToken}=await requireApiSession();
  const [{bills},{subscriptions},{keepsakes}]=await Promise.all([api.listBills(accessToken),api.listSubscriptions(accessToken),api.listKeepsakes(accessToken)]);
  const reminders=[...bills.filter(b=>!b.deletedAt&&b.status!=='paid'&&b.status!=='cancelled').map(b=>({id:b.id,title:b.title,date:b.dueAt,amount:b.amount,href:'/bills'})),...subscriptions.filter(s=>!s.deletedAt&&s.active).map(s=>({id:s.id,title:s.title,date:s.nextDueAt,amount:s.amount,href:'/subscriptions'})),...keepsakes.filter(k=>!k.deletedAt&&(k.warrantyUntil||k.returnUntil)).map(k=>({id:k.id,title:k.title,date:k.returnUntil||k.warrantyUntil!,amount:k.amount,href:'/keepsakes'}))].sort((a,b)=>a.date.localeCompare(b.date));
  return <><FinancePageHeader title="Thông báo" description="Các kỳ thanh toán và thời hạn cần chú ý."/><section className="data-panel"><h2>Lịch sắp tới</h2>{reminders.map(r=><Link className="data-row" key={r.id} href={r.href}><div><strong>{r.title}</strong><span>{new Date(r.date).toLocaleDateString('vi-VN')}</span></div><span>{formatVnd(r.amount)}</span></Link>)}{!reminders.length&&<p className="empty-state">Bạn chưa có lịch nhắc.</p>}<p>Đây là lịch nhắc trong web. Nhắc khi đóng trình duyệt và báo thức Android vẫn được quản lý trong ứng dụng điện thoại.</p></section></>;
}
