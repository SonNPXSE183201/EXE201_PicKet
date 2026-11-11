"use client";

import Link, { useLinkStatus } from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { signOut } from "@/app/dashboard/actions";
import { Icon } from "./workspace-icon";
import { UserNotificationMenu } from "./user-notification-menu";
import { AdminWorkspaceShell } from "@/features/admin/components/admin-workspace-shell";
import type { AdminNotice } from "@/features/admin/components/admin-notification-menu";

type UserLink = readonly [href: string, label: string, icon: string];

const overviewLink: UserLink = ["/dashboard", "Tổng quan", "home"];
const userGroups: { title: string; links: UserLink[] }[] = [
  {
    title: "TIỀN CỦA TÔI",
    links: [
      ["/transactions", "Giao dịch", "receipt"],
      ["/accounts", "Ví & tài khoản", "wallet"],
      ["/budgets", "Túi ngân sách", "wallet"],
      ["/planning", "Kế hoạch", "calendar"],
    ],
  },
  {
    title: "QUẢN LÝ",
    links: [
      ["/receipts", "Hóa đơn", "receipt"],
      ["/subscriptions", "Giao dịch định kỳ", "calendar"],
      ["/categories", "Danh mục", "grid"],
      ["/keepsakes", "Kỷ niệm", "heart"],
    ],
  },
  { title: "BÁO CÁO", links: [["/insights", "Thống kê", "chart"]] },
  { title: "TÀI KHOẢN", links: [["/profile", "Cài đặt", "person"]] },
];

const accountLinks = [
  ["/capture", "Lưu hóa đơn mới", "receipt"],
  ["/review-inbox", "Các mục cần kiểm tra", "receipt"],
  ["/bills", "Kỳ thanh toán", "calendar"],
  ["/transactions/transfer", "Chuyển tiền", "transfer"],
  ["/reconcile", "Đối soát số dư ví", "wallet"],
  ["/security/pin", "Đăng nhập nhanh bằng PIN", "shield"],
  ["/billing", "Gói sử dụng", "shield"],
  ["/data", "Sao lưu & dữ liệu", "shield"],
  ["/transactions/bulk", "Quản lý nhiều giao dịch", "receipt"],
  ["/sync-conflicts", "Kiểm tra đồng bộ", "transfer"],
  ["/help", "Quyền riêng tư & trợ giúp", "shield"],
] as const;

export { Icon } from "./workspace-icon";

function NavigationPending() {
  const { pending } = useLinkStatus();
  return <span className={`navigation-pending${pending ? " is-pending" : ""}`} aria-hidden="true" />;
}

function UserNavLink({
  href,
  label,
  current,
  icon,
  onNavigate,
}: {
  href: string;
  label: string;
  current: boolean;
  icon?: string;
  onNavigate: () => void;
}) {
  const [intent, setIntent] = useState(false);
  const warm = () => setIntent(true);
  return (
    <Link
      href={href}
      prefetch={intent ? true : null}
      aria-current={current ? "page" : undefined}
      onMouseEnter={warm}
      onFocus={warm}
      onTouchStart={warm}
      onClick={onNavigate}
    >
      {icon ? <Icon name={icon} /> : null}
      <span>{label}</span>
      <NavigationPending />
    </Link>
  );
}

function StandardWorkspaceShell({
  children,
  userEmail,
  userName,
  userAvatar,
}: {
  children: ReactNode;
  userEmail?: string | null;
  userName?: string | null;
  userAvatar?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const menuRef = useRef<HTMLDetailsElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const mobileSearchRef = useRef<HTMLInputElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [navigationPath, setNavigationPath] = useState(pathname);

  // Reset transient controls before rendering a new route, without committing
  // a second render from an effect. Keep the shell and sidebar groups mounted.
  if (navigationPath !== pathname) {
    setNavigationPath(pathname);
    setDrawerOpen(false);
    setMobileSearchOpen(false);
  }

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
  const activeLink = [overviewLink, ...userGroups.flatMap((group) => group.links)].find(([href]) => isActive(href));
  const pageLabel = activeLink?.[1] ?? "Không gian cá nhân";
  const initial = (userName?.trim().slice(0, 1) || userEmail?.trim().slice(0, 1) || "P").toLocaleUpperCase("vi-VN");

  useEffect(() => {
    menuRef.current?.removeAttribute("open");
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const drawer = sidebarRef.current;
    const focusable = () => drawer?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    const focusFrame = requestAnimationFrame(() => focusable()?.[0]?.focus());
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDrawerOpen(false);
        menuButtonRef.current?.focus();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items?.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
      cancelAnimationFrame(focusFrame);
    };
  }, [drawerOpen]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 900px)");
    const updateViewport = () => {
      setIsMobileViewport(media.matches);
      if (!media.matches) setDrawerOpen(false);
    };
    updateViewport();
    media.addEventListener("change", updateViewport);
    return () => media.removeEventListener("change", updateViewport);
  }, []);

  useEffect(() => {
    if (sidebarRef.current) sidebarRef.current.inert = isMobileViewport && !drawerOpen;
  }, [drawerOpen, isMobileViewport]);

  useEffect(() => {
    if (mobileSearchOpen) mobileSearchRef.current?.focus();
  }, [mobileSearchOpen]);

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) {
        menuRef.current?.removeAttribute("open");
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
      if (event.key === "/" && !typing) {
        event.preventDefault();
        if (isMobileViewport) setMobileSearchOpen(true);
        else mobileSearchRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isMobileViewport]);

  const closeDrawer = () => {
    setDrawerOpen(false);
    menuButtonRef.current?.focus();
  };
  const navigateFilter = (event: FormEvent<HTMLDivElement>) => {
    if (event.defaultPrevented || !(event.target instanceof HTMLFormElement)) return;
    const form = event.target;
    if (form.method.toLowerCase() !== "get" || (form.target && form.target !== "_self")) return;
    const url = new URL(form.action || window.location.href, window.location.href);
    if (url.origin !== window.location.origin) return;
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    if (submitter?.hasAttribute("formaction") || submitter?.hasAttribute("formmethod")) return;
    const query = new URLSearchParams();
    for (const [key, value] of new FormData(form, submitter)) {
      if (typeof value === "string") query.append(key, value);
    }
    url.search = query.toString();
    event.preventDefault();
    router.push(`${url.pathname}${url.search}${url.hash}`);
  };
  const navLink = ([href, label, icon]: UserLink) => (
    <UserNavLink
      key={href}
      href={href}
      label={label}
      icon={icon}
      current={isActive(href)}
      onNavigate={closeDrawer}
    />
  );

  return (
    <div className={`workspace workspace-user${pathname === "/dashboard" ? " is-dashboard" : ""}${drawerOpen ? " is-drawer-open" : ""}`} onSubmit={navigateFilter}>
      <a className="skip-link" href="#workspace-content">Bỏ qua điều hướng</a>
      <div className="workspace-route-progress" aria-hidden="true" />
      <button
        className="workspace-scrim"
        type="button"
        aria-label="Đóng điều hướng"
        tabIndex={drawerOpen ? 0 : -1}
        onClick={closeDrawer}
      />
      <aside
        ref={sidebarRef}
        className="workspace-sidebar"
        id="workspace-sidebar"
        aria-hidden={isMobileViewport && !drawerOpen ? true : undefined}
        aria-label="Điều hướng cá nhân"
      >
        <div className="workspace-sidebar-heading">
          <Link className="brand workspace-brand" href="/dashboard" onClick={closeDrawer}>
            <Image src="/picket-logo.png" alt="" width={40} height={40} />
            <span>PicKet<small>KHÔNG GIAN CÁ NHÂN</small></span>
          </Link>
          <button className="workspace-drawer-close" type="button" aria-label="Đóng menu" onClick={closeDrawer}>
            <Icon name="close" />
          </button>
        </div>
        <nav className="workspace-user-nav" aria-label="Tài chính cá nhân">
          <p className="workspace-nav-label">QUẢN LÝ ỨNG DỤNG</p>
          <UserNavLink
            href={overviewLink[0]}
            label={overviewLink[1]}
            icon={overviewLink[2]}
            current={isActive(overviewLink[0])}
            onNavigate={closeDrawer}
          />
          {userGroups.map((group) => (
            <details
              className="workspace-nav-group"
              key={group.title}
              open={group.links.some(([href]) => isActive(href)) || undefined}
            >
              <summary>
                {group.title}
                <Icon name="chevronRight" />
              </summary>
              <div>{group.links.map(navLink)}</div>
            </details>
          ))}
        </nav>
      </aside>

      <div className="workspace-body">
        <header className="workspace-topbar">
          <button
            ref={menuButtonRef}
            className="workspace-drawer-toggle"
            type="button"
            aria-controls="workspace-sidebar"
            aria-expanded={drawerOpen}
            aria-label={drawerOpen ? "Đóng menu" : "Mở menu"}
            onClick={() => setDrawerOpen((open) => !open)}
          >
            <Icon name={drawerOpen ? "close" : "menu"} />
          </button>
          <p className="workspace-breadcrumb"><span>Picket</span><span aria-hidden="true">/</span><strong>{pageLabel}</strong></p>
          <button
            className="workspace-mobile-search-toggle"
            type="button"
            aria-label={mobileSearchOpen ? "Đóng tìm kiếm" : "Mở tìm kiếm"}
            aria-expanded={mobileSearchOpen}
            onClick={() => setMobileSearchOpen((open) => !open)}
          >
            <Icon name="search" />
          </button>
          <form action="/transactions" className={`workspace-global-search${mobileSearchOpen ? " is-open" : ""}`} role="search">
            <Icon name="search" />
            <input className="workspace-global-search-input" ref={mobileSearchRef} name="q" type="search" placeholder="Tìm kiếm..." aria-label="Tìm giao dịch" maxLength={160} />
            <kbd className="workspace-search-shortcut" aria-hidden="true">/</kbd>
            <button className="workspace-mobile-search-close" type="button" aria-label="Đóng tìm kiếm" onClick={() => setMobileSearchOpen(false)}>
              <Icon name="close" />
            </button>
          </form>
          <div className="workspace-account-actions">
            <UserNotificationMenu />
            <details
              ref={menuRef}
              className="workspace-account-menu"
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.currentTarget.open = false;
                  event.currentTarget.querySelector("summary")?.focus();
                }
              }}
            >
              <summary className="workspace-avatar" aria-label="Mở menu tài khoản" aria-haspopup="menu">
                {userAvatar ? (
                  <img src={userAvatar} alt="" referrerPolicy="no-referrer" />
                ) : (
                  <span>{initial}</span>
                )}
                <Icon name="chevronDown" />
              </summary>
              <div className="workspace-account-popover">
                <div className="workspace-account-identity">
                  <span className="workspace-avatar-large" aria-hidden="true">{initial}</span>
                  <div>
                    <strong>{userName || "Tài khoản Picket"}</strong>
                    {userEmail ? <small>{userEmail}</small> : null}
                  </div>
                </div>
                <Link className="workspace-profile-link" href="/profile" onClick={() => menuRef.current?.removeAttribute("open")}>
                  Thông tin cá nhân
                </Link>
                <p className="account-menu-heading">Tiện ích</p>
                <nav aria-label="Tiện ích tài khoản">
                  {accountLinks.map(([href, label, icon]) => (
                    <Link
                      key={href}
                      href={href}
                      aria-current={pathname === href ? "page" : undefined}
                      onClick={() => menuRef.current?.removeAttribute("open")}
                    >
                      <Icon name={icon} />{label}
                    </Link>
                  ))}
                </nav>
                <form action={signOut} className="workspace-signout" onSubmit={(event) => {
                  try {
                    if (Object.keys(localStorage).some(key => key.startsWith("picket-web.reconcile.")) && !window.confirm("Có yêu cầu đối soát chưa xác nhận. Đăng xuất sẽ xóa bản tạm trên trình duyệt này. Sau khi đăng nhập lại, hãy kiểm tra giao dịch trước khi đối soát mới. Vẫn đăng xuất?")) { event.preventDefault(); return; }
                    for (const key of Object.keys(localStorage)) if (key.startsWith("picket-web.")) localStorage.removeItem(key);
                  } catch { /* Keep sign-out available when storage is blocked. */ }
                }}>
                  <button type="submit"><Icon name="logout" />Đăng xuất</button>
                </form>
              </div>
            </details>
          </div>
        </header>
        <div id="workspace-content" className="workspace-content" tabIndex={-1}>{children}</div>
      </div>
    </div>
  );
}

export function WorkspaceShell(props: {
  children: ReactNode;
  admin?: boolean;
  adminRole?: string | null;
  adminPermissions?: string[];
  adminEmail?: string | null;
  adminAvatar?: string | null;
  adminNotices?: AdminNotice[];
  adminMfaVerified?: boolean;
  userEmail?: string | null;
  userName?: string | null;
  userAvatar?: string | null;
}) {
  return props.admin ? (
    <AdminWorkspaceShell
      role={props.adminRole ?? null}
      permissions={props.adminPermissions ?? []}
      email={props.adminEmail}
      avatarUrl={props.adminAvatar}
      notices={props.adminNotices ?? []}
      mfaVerified={props.adminMfaVerified}
    >
      {props.children}
    </AdminWorkspaceShell>
  ) : (
    <StandardWorkspaceShell userEmail={props.userEmail} userName={props.userName} userAvatar={props.userAvatar}>
      {props.children}
    </StandardWorkspaceShell>
  );
}
