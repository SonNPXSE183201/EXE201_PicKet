"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import {
  adminSections,
  canViewAdminSection,
  type AdminSection,
} from "../admin-permissions";
import { adminLabel } from "../admin-labels";
import { Icon } from "@/core/ui/workspace-icon";
import { signOut } from "@/app/dashboard/actions";
import "../admin-platform.css";
const groups: { title: string; icon: string; sections: AdminSection[] }[] = [
  {
    title: "Khách hàng",
    icon: "person",
    sections: ["users", "tickets", "billing", "revenue", "payments"],
  },
  {
    title: "Tăng trưởng",
    icon: "chart",
    sections: ["acquisition", "engagement", "ocr"],
  },
  {
    title: "Vận hành",
    icon: "shield",
    sections: ["health", "incidents", "releases"],
  },
  { title: "Nội dung", icon: "receipt", sections: ["content", "partners"] },
  {
    title: "Hệ thống",
    icon: "grid",
    sections: ["integrations", "audit", "staff", "permissions", "settings", "exports"],
  },
];
export function AdminWorkspaceShell({
  children,
  role,
  permissions,
}: {
  children: ReactNode;
  role: string | null;
  permissions: readonly string[];
}) {
  const path = usePathname(),
    account = useRef<HTMLDetailsElement>(null),
    mobile = useRef<HTMLDetailsElement>(null);
  const current =
    (Object.keys(adminSections) as AdminSection[]).find(
      (s) => adminSections[s].href === path,
    ) ?? "overview";
  useEffect(() => {
    const close = (event: PointerEvent) => {
      for (const ref of [account, mobile])
        if (
          event.target instanceof Node &&
          !ref.current?.contains(event.target)
        )
          ref.current?.removeAttribute("open");
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  function closeMenus() {
    account.current?.removeAttribute("open");
    mobile.current?.removeAttribute("open");
  }
  const navigation = (prefix: string) => (
    <nav aria-label={prefix === "desktop" ? "Quản trị" : "Điều hướng quản trị"}>
      {canViewAdminSection(role,'overview',permissions) && <Link
        className="admin-nav-overview"
        href="/admin"
        aria-current={current === "overview" ? "page" : undefined}
        onClick={closeMenus}
      >
        <Icon name="home" />
        <span>Tổng quan</span>
      </Link>}
      {groups.map((group) => {
        const sections = group.sections.filter((s) =>
          canViewAdminSection(role, s, permissions),
        );
        if (!sections.length) return null;
        return (
          <details
            className="admin-nav-group"
            name={`admin-navigation-${prefix}`}
            key={group.title}
            open={sections.includes(current)}
          >
            <summary>
              <Icon name={group.icon} />
              <span>{group.title}</span>
              <span className="admin-nav-chevron" aria-hidden="true">
                ⌄
              </span>
            </summary>
            <div>
              {sections.map((s) => (
                <Link
                  key={s}
                  href={adminSections[s].href}
                  aria-current={current === s ? "page" : undefined}
                  onClick={closeMenus}
                >
                  {adminSections[s].title}
                </Link>
              ))}
            </div>
          </details>
        );
      })}
    </nav>
  );
  return (
    <div className="workspace-admin admin-shell">
      <a className="skip-link" href="#workspace-content">
        Bỏ qua điều hướng
      </a>
      <aside className="admin-sidebar">
        <Link className="admin-shell-brand" href="/admin">
          <Image src="/picket-logo.png" width={38} height={38} alt="" />
          <span>
            Picket<small>Không gian quản trị</small>
          </span>
        </Link>
        <p className="admin-nav-label">QUẢN LÝ ỨNG DỤNG</p>
        <div className="admin-sidebar-navigation">{navigation("desktop")}</div>
        <div className="admin-sidebar-footer">
          <Link href="/admin/security" onClick={closeMenus}>
            <Icon name="shield" />
            <span>Bảo mật & MFA</span>
          </Link>
          <span className="admin-role-badge">{adminLabel(role ?? "")}</span>
        </div>
      </aside>
      <div className="admin-shell-body">
        <header className="admin-topbar">
          <div className="admin-topbar-context">
            <span>Picket / Quản trị</span>
            <strong>{adminSections[current].title}</strong>
          </div>
          <details
            ref={mobile}
            className="admin-mobile-navigation"
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.currentTarget.open = false;
                e.currentTarget.querySelector("summary")?.focus();
              }
            }}
          >
            <summary>
              <Icon name="grid" />
              <span>Điều hướng</span>
            </summary>
            <div className="admin-mobile-nav-panel">{navigation("mobile")}</div>
          </details>
          <div className="admin-topbar-actions">
            <Link
              className="admin-landing-link"
              href="https://picketfinance.com/"
            >
              Trang giới thiệu ↗
            </Link>
            <details
              ref={account}
              className="admin-account"
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.currentTarget.open = false;
                  e.currentTarget.querySelector("summary")?.focus();
                }
              }}
            >
              <summary aria-label="Mở menu tài khoản">
                <Icon name="shield" />
                <span>{adminLabel(role ?? "")}</span>
                <span aria-hidden="true">⌄</span>
              </summary>
              <div className="admin-account-panel">
                <p>
                  Tài khoản quản trị<small>{adminLabel(role ?? "")}</small>
                </p>
                <Link href="/admin/security" onClick={closeMenus}>
                  <Icon name="shield" />
                  Bảo mật & MFA
                </Link>
                <form action={signOut}>
                  <button type="submit">
                    <Icon name="logout" />
                    Đăng xuất
                  </button>
                </form>
              </div>
            </details>
          </div>
        </header>
        <div
          id="workspace-content"
          className="admin-shell-content"
          tabIndex={-1}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
