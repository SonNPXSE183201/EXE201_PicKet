'use client';
import Link from 'next/link';
export function WorkspaceError({reset}:{reset:()=>void}){return <main className="finance-panel" role="alert"><h1>Chưa tải được dữ liệu</h1><p>Kết nối hoặc phiên đăng nhập có thể bị gián đoạn. Những thay đổi đã lưu không bị xóa. Kiểm tra mạng rồi thử lại.</p><div className="overview-actions"><button className="button primary" onClick={reset}>Thử tải lại</button><Link className="button secondary" href="/session">Kiểm tra phiên đăng nhập</Link></div></main>;}
