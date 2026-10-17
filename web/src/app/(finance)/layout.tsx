import Link from "next/link";

import { requireApiSession } from "@/core/auth/require-api-session";

import { FinanceRealtime } from "./finance-realtime";

export default async function FinanceLayout({ children }: LayoutProps<"/">) {
  const { claims } = await requireApiSession();
  const userId = typeof claims.sub === "string" ? claims.sub : null;
  return (
    <main className="finance-shell shell" id="main-content">
      <a className="skip-link" href="#finance-content">Bỏ qua điều hướng</a>
      <header className="finance-header">
        <Link className="brand" href="/dashboard"><span className="brand-mark">P</span><span>Picket</span></Link>
        <nav className="finance-nav" aria-label="Quản lý tài chính">
          <Link href="/dashboard">Tổng quan</Link>
          <Link href="/accounts">Tài khoản</Link>
          <Link href="/transactions">Giao dịch</Link>
          <Link href="/receipts">Hóa đơn</Link>
          <Link href="/bills">Kỳ thanh toán</Link>
          <Link href="/subscriptions">Định kỳ</Link>
          <Link href="/transactions/transfer">Chuyển tiền</Link>
          <Link href="/categories">Danh mục</Link>
          <Link href="/budgets">Ngân sách</Link>
          <Link href="/profile">Hồ sơ</Link>
          <Link href="/data">Dữ liệu</Link>
        </nav>
        {userId ? <FinanceRealtime userId={userId} /> : null}
      </header>
      <div id="finance-content" tabIndex={-1}>{children}</div>
    </main>
  );
}
