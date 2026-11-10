"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminIcon } from "../ui/admin-icon";
import { formatDateTime } from "../ui/paper";

export type AdminNotice = { id: string; title: string; status: string; updatedAt: string };

export function AdminNotificationMenu({ notices, storageKey }: { notices: AdminNotice[]; storageKey: string }) {
  const [readIds, setReadIds] = useState<string[]>([]);
  const menu = useRef<HTMLDetailsElement>(null);
  const router = useRouter();

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (!active) return;
      try {
        const stored = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
        setReadIds(Array.isArray(stored) ? stored.filter((value): value is string => typeof value === "string") : []);
      } catch { setReadIds([]); }
    });
    return () => { active = false; };
  }, [storageKey]);

  useEffect(() => {
    const closeOnOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !menu.current?.contains(event.target)) menu.current?.removeAttribute("open");
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && menu.current?.open) {
        menu.current.removeAttribute("open");
        menu.current.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const unread = notices.filter((notice) => !readIds.includes(notice.id)).length;
  const visit = (notice: AdminNotice) => {
    let persisted: unknown;
    try { persisted = JSON.parse(localStorage.getItem(storageKey) ?? "[]"); } catch { persisted = []; }
    const saved = Array.isArray(persisted) ? persisted.filter((value): value is string => typeof value === "string") : [];
    const next = [...new Set([...saved, ...readIds, notice.id])];
    setReadIds(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* Menu remains usable when storage is blocked. */ }
    menu.current?.removeAttribute("open");
    router.push(`/admin/incidents?incidentId=${encodeURIComponent(notice.id)}`);
  };

  return (
    <details ref={menu} className="ap-notifications">
      <summary className="ap-icon-btn" aria-label={unread ? `Thông báo hệ thống, ${unread} chưa đọc` : "Thông báo hệ thống"}>
        <AdminIcon name="bell" size={22} />
        {unread > 0 && <span className="ap-notification-count" aria-hidden="true">{unread > 9 ? "9+" : unread}</span>}
      </summary>
      <section className="ap-notification-panel" aria-label="Thông báo hệ thống">
        <header><div><b>Thông báo</b><small>{unread ? `${unread} chưa đọc` : "Đã xem hết"}</small></div><span className="ap-notification-route">Sự cố</span></header>
        <div className="ap-notification-list">
          {notices.length ? notices.map((notice) => {
            const read = readIds.includes(notice.id);
            return (
              <button type="button" className={`ap-notification-item${read ? " is-read" : ""}`} key={notice.id} onClick={() => visit(notice)}>
                <span className={`ap-notification-dot${read ? " is-read" : ""}`} aria-hidden="true" />
                <span className="ap-notification-copy"><b>{notice.title}</b><small>{notice.status} · {formatDateTime(notice.updatedAt)}</small></span>
                <AdminIcon name="chevron-right" size={14} />
              </button>
            );
          }) : <p className="ap-notification-empty">Chưa có thông báo sự cố.</p>}
        </div>
        <button type="button" className="ap-notification-all" onClick={() => { menu.current?.removeAttribute("open"); router.push("/admin/incidents"); }}>Xem tất cả sự cố</button>
      </section>
    </details>
  );
}
