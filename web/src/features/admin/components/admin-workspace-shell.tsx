"use client";
import Link, { useLinkStatus } from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { adminSections, canViewAdminSection, type AdminSection } from "../admin-permissions";
import { adminLabel } from "../admin-labels";
import { signOut } from "@/app/dashboard/actions";
import { AdminIcon } from "../ui/admin-icon";
import "../admin-platform.css";
import "../ui/admin-paper.css";

/* Navigation groups follow Figma › Admin Web; modules that exist only in the
   backend (revenue, payments, announcements, promotions, permissions) sit in
   the group they belong to. */
const groups: { title: string; sections: AdminSection[] }[] = [
  { title: "Khách hàng", sections: ["users", "tickets", "billing", "revenue", "payments"] },
  { title: "Tăng trưởng", sections: ["acquisition", "engagement", "ocr"] },
  { title: "Vận hành", sections: ["health", "incidents", "releases", "announcements"] },
  { title: "Nội dung", sections: ["content", "partners", "promotions"] },
  { title: "Hệ thống", sections: ["integrations", "audit", "staff", "permissions", "settings", "exports"] },
];
export const sectionIcons: Record<AdminSection, string> = {
  overview: "home", users: "users", tickets: "mail", billing: "wallet", revenue: "chart", payments: "receipt",
  acquisition: "chart", engagement: "calendar", ocr: "receipt", health: "shield", incidents: "alert", releases: "grid",
  announcements: "bell", content: "note", partners: "heart", promotions: "sparkle", integrations: "bolt", audit: "list",
  staff: "lock", permissions: "shield", settings: "filter", exports: "download", security: "shield",
};
const ranges = ["7", "30", "90"] as const;

export function AdminWorkspaceShell({ children, role, permissions, email, mfaVerified }: {
  children: ReactNode; role: string | null; permissions: readonly string[]; email?: string | null; mfaVerified?: boolean;
}) {
  const path = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  // The mobile menu is open only for the path it was opened on, so navigating closes it.
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const menuOpen = menuPath === path;
  const setMenuOpen = (open: boolean | ((v: boolean) => boolean)) => setMenuPath((typeof open === "function" ? open(menuOpen) : open) ? path : null);
  const account = useRef<HTMLDetailsElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const [navigating, startNavigation] = useTransition();
  const go = (href: string) => startNavigation(() => router.push(href));
  const current = (Object.keys(adminSections) as AdminSection[]).find((s) => adminSections[s].href === path) ?? "overview";
  const days = ranges.includes(params.get("days") as (typeof ranges)[number]) ? params.get("days") : "30";
  const name = displayName(email);
  const roleLabel = adminLabel(role ?? "");

  useEffect(() => { account.current?.removeAttribute("open"); }, [path]);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (event.target instanceof Node && !account.current?.contains(event.target)) account.current?.removeAttribute("open");
    };
    const key = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
      if (event.key === "/" && !typing) { event.preventDefault(); search.current?.focus(); }
      if (event.key === "Escape") { setMenuOpen(false); account.current?.removeAttribute("open"); }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", key); };
  }, []);

  // Filter forms (method="get") navigate client-side instead of reloading the
  // whole document; server-action forms (POST) are left alone.
  useEffect(() => {
    const onSubmit = (event: SubmitEvent) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || form.getAttribute("method")?.toLowerCase() !== "get") return;
      if (!form.closest(".ap-root")) return;
      event.preventDefault();
      const target = new URL(form.getAttribute("action") || window.location.pathname, window.location.origin);
      const query = new URLSearchParams();
      for (const [key, value] of new FormData(form, event.submitter)) {
        if (typeof value === "string" && value.trim() !== "") query.append(key, value);
      }
      startNavigation(() => router.push(`${target.pathname}${query.size ? `?${query}` : ""}`));
    };
    document.addEventListener("submit", onSubmit);
    return () => document.removeEventListener("submit", onSubmit);
  }, [router]);

  const rangeHref = (value: string) => {
    const next = new URLSearchParams(params.toString());
    next.set("days", value);
    next.delete("page");
    return `${path}?${next}`;
  };
  const visible = (s: AdminSection) => canViewAdminSection(role, s, permissions);

  return (
    <div className={`ap-root ap-shell workspace-admin${menuOpen ? " is-menu-open" : ""}`}>
      <a className="ap-skip" href="#workspace-content">Bỏ qua điều hướng</a>
      <div className={`ap-route-progress${navigating ? " is-active" : ""}`} role="progressbar" aria-hidden={!navigating} aria-label="Đang tải dữ liệu" />
      <div className="ap-scrim" onClick={() => setMenuOpen(false)} aria-hidden="true" />
      <aside className="ap-sidebar" id="admin-sidebar" aria-label="Điều hướng quản trị">
        <Link className="ap-brand" href="/admin">
          <span className="ap-coin"><img src="/admin-paper/picket-mark-192.png" alt="" width={30} height={30} /></span>
          <span><strong>Picket</strong><small>Không gian quản trị</small></span>
        </Link>
        <p className="ap-nav-label">QUẢN LÝ ỨNG DỤNG</p>
        <nav className="ap-nav" aria-label="Quản trị">
          {visible("overview") && (
            <Link className="ap-nav-item" href="/admin" aria-current={current === "overview" ? "page" : undefined}>
              <AdminIcon name="home" />Tổng quan<NavPending />
            </Link>
          )}
          {groups.map((group) => {
            const sections = group.sections.filter(visible);
            if (!sections.length) return null;
            return (
              <details className="ap-nav-group" key={group.title} open={sections.includes(current) || undefined}>
                <summary>{group.title}<AdminIcon name="chevron-right" size={14} /></summary>
                <div>
                  {sections.map((s) => (
                    <Link key={s} className="ap-nav-item" href={adminSections[s].href} aria-current={current === s ? "page" : undefined}>
                      <AdminIcon name={sectionIcons[s]} />{adminSections[s].title}<NavPending />
                    </Link>
                  ))}
                </div>
              </details>
            );
          })}
        </nav>
        <div className={`ap-security${mfaVerified === false ? " is-unverified" : ""}`}>
          <Link href="/admin/security"><AdminIcon name="shield" size={16} />Bảo mật &amp; MFA</Link>
          <p><span className="ap-dot" />{mfaVerified === false ? "MFA chưa xác minh" : "MFA đã xác minh"}{roleLabel ? ` · ${roleLabel}` : ""}</p>
        </div>
      </aside>

      <div className="ap-main">
        <header className="ap-topbar">
          <button className="ap-icon-btn ap-menu-toggle" type="button" aria-controls="admin-sidebar" aria-expanded={menuOpen} aria-label="Mở menu quản trị" onClick={() => setMenuOpen((v) => !v)}>
            <AdminIcon name="list" size={20} />
          </button>
          <div className="ap-context">
            <span>Picket / Quản trị</span>
            <h1>{adminSections[current].title}</h1>
          </div>
          {visible("users") && (
            <form className="ap-search" role="search" action="/admin/users" onSubmit={(e) => {
              e.preventDefault();
              const value = search.current?.value.trim() ?? "";
              go(value ? `/admin/users?search=${encodeURIComponent(value.slice(0, 160))}` : "/admin/users");
            }}>
              <AdminIcon name="search" size={16} />
              <input ref={search} name="search" type="search" placeholder="Tìm email, User ID…" aria-label="Tìm người dùng theo email, số điện thoại hoặc User ID" maxLength={160} />
              <kbd className="ap-kbd" aria-hidden="true">/</kbd>
            </form>
          )}
          <nav className="ap-range" aria-label="Khoảng thời gian">
            {ranges.map((r) => <Link key={r} href={rangeHref(r)} aria-current={days === r ? "true" : undefined}>{r} ngày<NavPending /></Link>)}
          </nav>
          {visible("incidents") && (
            <Link className="ap-icon-btn" href="/admin/incidents" aria-label="Sự cố và cảnh báo"><AdminIcon name="bell" size={22} /></Link>
          )}
          <details ref={account} className="ap-account">
            <summary aria-label="Mở menu tài khoản">
              <span className="ap-avatar">{name.slice(0, 1)}</span>
              <span className="ap-account-who"><b>{name}</b><small>{roleLabel || "Quản trị"}</small></span>
              <AdminIcon name="chevron-down" size={14} />
            </summary>
            <div className="ap-account-panel">
              <p>Tài khoản quản trị<small>{email ?? roleLabel}</small></p>
              <Link href="/admin/security"><AdminIcon name="shield" size={16} />Bảo mật &amp; MFA</Link>
              <a href="https://picketfinance.com/"><AdminIcon name="arrow-up-right" size={16} />Trang giới thiệu</a>
              <form action={signOut}><button type="submit"><AdminIcon name="logout" size={16} />Đăng xuất</button></form>
            </div>
          </details>
        </header>
        <div id="workspace-content" className="ap-stack" tabIndex={-1} aria-busy={navigating}>{children}</div>
      </div>
    </div>
  );
}

function displayName(email?: string | null) {
  const local = (email ?? "").split("@")[0];
  if (!local) return "Quản trị viên";
  return local.split(/[._-]+/).filter(Boolean).map((p) => p[0].toUpperCase() + p.slice(1)).join(" ");
}

/** Small pulsing dot on the link being opened, so a click gets instant feedback. */
function NavPending() {
  const { pending } = useLinkStatus();
  return <span className={`ap-nav-pending${pending ? " is-pending" : ""}`} aria-hidden="true" />;
}
