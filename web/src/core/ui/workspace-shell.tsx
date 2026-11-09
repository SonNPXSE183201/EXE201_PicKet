"use client";
import Link, { useLinkStatus } from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { signOut } from "@/app/dashboard/actions";

const userLinks = [
  ["/dashboard", "Tổng quan", "home"],
  ["/transactions", "Giao dịch", "receipt"],
  ["/accounts", "Ví", "wallet"],
  ["/budgets", "Ngân sách", "chart"],
] as const;
const accountLinks = [
  ["/profile", "Thông tin cá nhân", "person"],
  ["/insights", "Thống kê thu chi", "chart"],
  ["/planning", "Kế hoạch tháng", "calendar"],
  ["/receipts", "Hóa đơn của bạn", "receipt"],
  ["/capture", "Lưu hóa đơn mới", "receipt"],
  ["/review-inbox", "Các mục cần kiểm tra", "receipt"],
  ["/bills", "Kỳ thanh toán", "calendar"],
  ["/subscriptions", "Khoản định kỳ", "calendar"],
  ["/transactions/transfer", "Chuyển tiền", "transfer"],
  ["/categories", "Quản lý danh mục", "grid"],
  ["/reconcile", "Đối soát số dư ví", "wallet"],
  ["/keepsakes", "Đồ dùng & bảo hành", "shield"],
  ["/security/pin", "Đăng nhập nhanh bằng PIN", "shield"],
  ["/billing", "Gói sử dụng", "shield"],
  ["/data", "Sao lưu & dữ liệu", "shield"],
  ["/transactions/bulk", "Quản lý nhiều giao dịch", "receipt"],
  ["/sync-conflicts", "Kiểm tra đồng bộ", "transfer"],
  ["/help", "Quyền riêng tư & trợ giúp", "shield"],
] as const;
export { Icon } from "./workspace-icon";
import { Icon } from "./workspace-icon";
import { AdminWorkspaceShell } from "@/features/admin/components/admin-workspace-shell";
function NavigationHint() {
  const { pending } = useLinkStatus();
  return <span className="navigation-hint" role="status">{pending ? "Đang mở…" : ""}</span>;
}
function StandardWorkspaceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const menuRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) menuRef.current?.removeAttribute("open");
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  const links = userLinks;
  const utilities = accountLinks;
  const activeHref = links.filter(([href]) => pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"))).sort((a, b) => b[0].length - a[0].length)[0]?.[0];
  const navigation = (mobile = false) => (mobile ? links.slice(0, 4) : links).map(([href, label, icon]) => <Link key={href} href={href} prefetch={true} aria-current={activeHref === href ? "page" : undefined} onNavigate={(event) => { if (pathname === href) event.preventDefault(); }}><Icon name={icon} /><span>{label}</span><NavigationHint /></Link>);
  return <div className="workspace workspace-user">
    <a className="skip-link" href="#workspace-content">Bỏ qua điều hướng</a>
    <aside className="workspace-sidebar">
      <Link className="brand workspace-brand" href="/dashboard"><Image src="/picket-logo.png" alt="" width={40} height={40} /><span>Picket<small>Tài chính của bạn</small></span></Link>
      <nav aria-label="Tài chính cá nhân">{navigation()}</nav>
    </aside>
    <div className="workspace-body">
      <header className="workspace-topbar">
        <div className="workspace-account-actions">
          {<Link href="/notifications" className="workspace-notifications" aria-label="Thông báo"><Icon name="bell" /></Link>}
          <details ref={menuRef} className="workspace-account-menu" onKeyDown={(event) => { if (event.key === "Escape") { event.currentTarget.open = false; event.currentTarget.querySelector("summary")?.focus(); } }}>
            <summary className="workspace-avatar" aria-label="Mở menu tài khoản"><Icon name="person" /></summary>
            <div className="workspace-account-popover">
              <p className="account-menu-heading">Tài khoản & tiện ích</p>
              <form action={signOut} className="workspace-signout" onSubmit={(event) => {
                try {
                  if (Object.keys(localStorage).some(key => key.startsWith("picket-web.reconcile.")) && !window.confirm("Có yêu cầu đối soát chưa xác nhận. Đăng xuất sẽ xóa bản tạm trên trình duyệt này. Sau khi đăng nhập lại, hãy kiểm tra giao dịch trước khi đối soát mới. Vẫn đăng xuất?")) { event.preventDefault(); return; }
                  for (const key of Object.keys(localStorage)) if (key.startsWith("picket-web.")) localStorage.removeItem(key);
                } catch { /* Keep sign-out available when storage is blocked. */ }
              }}><button type="submit"><Icon name="logout" />Đăng xuất</button></form>
              <nav aria-label="Tiện ích tài khoản">{utilities.map(([href, label, icon]) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} onClick={() => menuRef.current?.removeAttribute("open")}><Icon name={icon} />{label}</Link>)}</nav>
            </div>
          </details>
        </div>
      </header>
      <div id="workspace-content" className="workspace-content" tabIndex={-1}>{children}</div>
    </div>
    <nav className="workspace-bottom-nav" aria-label="Điều hướng chính trên điện thoại">{navigation(true)}</nav>
  </div>;
}

export function WorkspaceShell(props: {children:ReactNode;admin?:boolean;adminRole?:string|null;adminPermissions?:string[];adminEmail?:string|null;adminMfaVerified?:boolean}) {
 return props.admin ? <AdminWorkspaceShell role={props.adminRole??null} permissions={props.adminPermissions??[]} email={props.adminEmail} mfaVerified={props.adminMfaVerified}>{props.children}</AdminWorkspaceShell> : <StandardWorkspaceShell>{props.children}</StandardWorkspaceShell>;
}
