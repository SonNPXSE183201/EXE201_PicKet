'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { signOut } from '@/app/dashboard/actions';

const userLinks = [
  ['/dashboard', 'Tổng quan', 'home'], ['/transactions', 'Giao dịch', 'receipt'],
  ['/accounts', 'Ví', 'wallet'], ['/budgets', 'Ngân sách', 'chart'], ['/profile', 'Cá nhân', 'person'],
  ['/receipts', 'Hóa đơn', 'receipt'], ['/bills', 'Kỳ thanh toán', 'calendar'],
  ['/subscriptions', 'Khoản định kỳ', 'calendar'], ['/transactions/transfer', 'Chuyển tiền', 'transfer'],
  ['/categories', 'Danh mục', 'grid'], ['/data', 'Sao lưu dữ liệu', 'shield'],
  ['/insights', 'Thống kê', 'chart'], ['/review-inbox', 'Cần kiểm tra', 'receipt'],
  ['/notifications', 'Thông báo', 'calendar'], ['/billing', 'Gói của bạn', 'shield'],
  ['/planning', 'Kế hoạch', 'chart'], ['/reconcile', 'Đối soát ví', 'wallet'],
  ['/keepsakes', 'Đồ dùng & bảo hành', 'shield'],
  ['/capture', 'Chụp hóa đơn', 'receipt'],
  ['/transactions/bulk', 'Quản lý nhiều giao dịch', 'receipt'], ['/sync-conflicts','Kiểm tra đồng bộ','transfer'],
] as const;
const adminLinks = [
  ['/admin', 'Tổng quan', 'chart'], ['/admin/users', 'Người dùng', 'person'],
  ['/admin/ocr', 'Nhận diện hóa đơn', 'receipt'], ['/admin/partners', 'Đối tác', 'grid'],
  ['/admin/settings', 'Cấu hình ứng dụng', 'shield'], ['/admin/audit', 'Nhật ký hoạt động', 'calendar'],
] as const;

export function Icon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    home: 'm3 10 9-7 9 7v11h-6v-7H9v7H3Z',
    receipt: 'M5 3h14v18l-3-2-4 2-4-2-3 2Zm3 5h8m-8 4h8m-8 4h5',
    wallet: 'M3 6h17v15H3V3h14v3m3 5h-6v5h6m-3-2h.01',
    chart: 'M4 3v18h17M8 17v-4m5 4V8m5 9V4',
    person: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-3a8 8 0 0 1 16 0v3',
    calendar: 'M4 5h16v16H4ZM8 2v6m8-6v6M4 10h16',
    transfer: 'M3 7h17l-4-4m5 14H4l4 4',
    grid: 'M3 3h7v7H3Zm11 0h7v7h-7ZM3 14h7v7H3Zm11 0h7v7h-7Z',
    shield: 'm12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6Zm-5 9 3 3 6-6',
    logout: 'M9 3H3v18h6m4-5 5-4-5-4m-5 4h13',
  };
  return <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] ?? paths.grid} /></svg>;
}

export function WorkspaceShell({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const pathname = usePathname();
  const links = admin ? adminLinks : userLinks;
  const active = (href: string) => pathname === href || (href !== '/admin' && href !== '/dashboard' && pathname.startsWith(href+'/'));
  return <div className={`workspace ${admin ? 'workspace-admin' : 'workspace-user'}`}>
    <a className="skip-link" href="#workspace-content">Bỏ qua điều hướng</a>
    <aside className="workspace-sidebar">
      <Link className="brand workspace-brand" href={admin ? '/admin' : '/dashboard'}><Image src="/picket-logo.png" alt="" width={44} height={44}/><span>Picket<small>{admin ? 'Quản trị ứng dụng' : 'Tài chính của bạn'}</small></span></Link>
      <nav aria-label={admin ? 'Quản trị' : 'Tài chính cá nhân'}>{links.map(([href,label,icon]) => <Link key={href} href={href} aria-current={active(href) ? 'page' : undefined}><Icon name={icon}/><span>{label}</span></Link>)}</nav>
      <form action={signOut} className="workspace-signout" onSubmit={()=>{try{for(const key of Object.keys(localStorage))if(key.startsWith('picket-web.'))localStorage.removeItem(key);}catch{/* Sign-out must remain available when browser storage is blocked. */}}}><button type="submit"><Icon name="logout"/>Đăng xuất</button></form>
    </aside>
    <div className="workspace-body">
      <header className="workspace-topbar"><span>{admin ? 'Không gian quản trị' : 'Không gian cá nhân'}</span><details className="workspace-menu"><summary>Tất cả chức năng</summary><nav aria-label="Tất cả chức năng">{links.map(([href,label,icon])=><Link key={href} href={href} aria-current={active(href)?'page':undefined}><Icon name={icon}/>{label}</Link>)}</nav></details><Link href={admin ? '/admin/settings' : '/profile'} className="workspace-avatar" aria-label={admin ? 'Cấu hình quản trị' : 'Mở cá nhân'}><Icon name={admin ? 'shield' : 'person'}/></Link></header>
      <div id="workspace-content" className="workspace-content" tabIndex={-1}>{children}</div>
    </div>
    <nav className="workspace-bottom-nav" aria-label={admin ? 'Điều hướng quản trị trên điện thoại' : 'Điều hướng chính trên điện thoại'}>{links.slice(0,5).map(([href,label,icon]) => <Link key={href} href={href} aria-current={active(href) ? 'page' : undefined}><Icon name={icon}/><span>{label}</span></Link>)}</nav>
  </div>;
}
