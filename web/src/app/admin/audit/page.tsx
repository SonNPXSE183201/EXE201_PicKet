import { requireApiSession } from '@/core/auth/require-api-session';
export default async function AuditPage() {
  const {api,accessToken} = await requireApiSession('admin');
  const {audit} = await api.adminOverview(accessToken,0);
  return <main className="admin-shell shell"><header className="admin-header"><h1 className="finance-title">Nhật ký hoạt động</h1></header><section className="data-panel"><h2>50 hoạt động gần nhất</h2><ol className="audit-list">{audit.map((item,index)=><li key={index}><strong>{item.action}</strong><span>{item.target ?? 'Hệ thống'} · {new Date(item.createdAt).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})}</span></li>)}</ol>{!audit.length && <p className="empty-state">Chưa có hoạt động.</p>}</section></main>;
}
