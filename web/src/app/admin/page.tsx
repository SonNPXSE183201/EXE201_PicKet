import type { Metadata } from "next";
import Link from "next/link";

import { requireApiSession } from "@/core/auth/require-api-session";
import { performAdminAction } from "./actions";

export const metadata: Metadata = {
  title: "Quản trị Picket",
};

interface PageProps {
  searchParams: Promise<{ page?: string; error?: string; done?: string }>;
}

function pageNumber(raw: string | undefined): number {
  if (!raw || !/^\d{1,6}$/.test(raw)) return 0;
  return Math.min(Number(raw), 100_000);
}

function date(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

export default async function AdminPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const page = pageNumber(query.page);
  const { accessToken, api } = await requireApiSession('admin');
  const overview = await api.adminOverview(accessToken, page);

  return (
    <main className="admin-shell shell" id="main-content">
      <header className="admin-header">
        <div><h1 className="finance-title">Tổng quan quản trị</h1><p>Quản lý tài khoản và cấu hình ứng dụng.</p></div>
        <Link className="button secondary" href="/admin/settings">Cấu hình ứng dụng</Link>
      </header>
      {query.done === "1" && <p className="admin-success" role="status">Thao tác quản trị đã hoàn tất và được ghi audit.</p>}
      {query.error && <p className="mutation-error" role="alert">{query.error === "confirmation" ? "Chuỗi xác nhận không đúng." : "Không thể hoàn thành thao tác quản trị."}</p>}
      {overview.settings.maintenance && <p className="mutation-error" role="status">Hệ thống đang ở chế độ bảo trì. {overview.settings.notice}</p>}
      <section aria-label="Chỉ số hệ thống" className="admin-metrics">
        <article className="metric-card"><span>Người dùng</span><strong>{overview.totalUsers}</strong></article>
        <article className="metric-card"><span>Sổ tài chính</span><strong>{overview.totalLedgers}</strong></article>
        <article className="metric-card"><span>Trang hiện tại</span><strong>{page + 1}</strong></article>
      </section>
      <section className="admin-grid">
        <article className="data-panel">
          <div className="panel-heading"><h2>Người dùng gần đây</h2><span>Tối đa 25 mỗi trang</span></div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Email</th><th>Tạo lúc</th><th>Trạng thái</th><th>Revision</th><th>Giao dịch</th><th>Quản lý</th></tr></thead>
              <tbody>{overview.users.map((user) => {
                const suspended = Boolean(user.bannedUntil && new Date(user.bannedUntil) > new Date());
                return <tr key={user.id}><td>{user.email}</td><td>{date(user.createdAt)}</td><td>{suspended ? "Đã khóa" : "Hoạt động"}</td><td>{user.revision ?? "—"}</td><td>{user.entryCount}</td><td><details className="admin-actions"><summary>Thao tác</summary><form action={performAdminAction}><input name="targetUser" type="hidden" value={user.id} /><input name="page" type="hidden" value={page} /><label>Hành động<select defaultValue={suspended ? "restore" : "suspend"} name="action"><option value={suspended ? "restore" : "suspend"}>{suspended ? "Mở khóa" : "Khóa tài khoản"}</option><option value="reset_password">Gửi email đặt lại mật khẩu</option><option value="grant_plan">Cấp/thu hồi gói 30 ngày</option></select></label><label>Gói<select defaultValue="plus" name="tier"><option value="free">Free</option><option value="plus">Plus</option><option value="pro">Pro</option></select></label><label>Xác nhận<input autoComplete="off" name="confirmation" placeholder={suspended ? "RESTORE / RESET / GRANT" : "SUSPEND / RESET / GRANT"} required /></label><button className="small-button" type="submit">Thực hiện</button></form></details></td></tr>;
              })}</tbody>
            </table>
          </div>
          {overview.users.length === 0 && <p className="empty-state">Không có người dùng trong trang này.</p>}
          <nav aria-label="Phân trang người dùng" className="admin-pagination">
            {page > 0 && <Link className="button secondary" href={`/admin?page=${page - 1}`}>Trang trước</Link>}
            {overview.users.length === 25 && <Link className="button secondary" href={`/admin?page=${page + 1}`}>Trang sau</Link>}
          </nav>
        </article>
        <article className="data-panel">
          <div className="panel-heading"><h2>Nhật ký audit</h2><span>50 sự kiện gần nhất</span></div>
          <ol className="audit-list">{overview.audit.map((item, index) => <li key={`${item.createdAt}-${index}`}><strong>{item.action}</strong><span>{item.target ?? "Không có đối tượng"} · {date(item.createdAt)}</span></li>)}</ol>
        </article>
      </section>
    </main>
  );
}
