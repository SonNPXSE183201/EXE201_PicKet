"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { loadNotificationFeedAction } from "@/app/(finance)/notifications/actions";
import type { WebReminder } from "@/core/finance/reminders";
import { Icon } from "./workspace-icon";

export function UserNotificationMenu() {
  const menu = useRef<HTMLDetailsElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const [rows, setRows] = useState<WebReminder[]>([]);
  const [owner, setOwner] = useState<string | null>(null);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [hasPartialData, setHasPartialData] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    menu.current?.removeAttribute("open");
  }, [pathname]);

  useEffect(() => {
    const closeOnOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !menu.current?.contains(event.target)) {
        menu.current?.removeAttribute("open");
      }
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

  async function loadRows() {
    if (loaded || loading) return;
    setLoading(true);
    setLoadError(false);
    try {
      const result = await loadNotificationFeedAction();
      const storageKey = `picket-web.notifications.${result.owner}`;
      let stored: unknown;
      try {
        stored = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
      } catch {
        stored = [];
      }
      setRows(result.rows);
      setOwner(result.owner);
      setHasPartialData(result.hasPartialData);
      setReadIds(
        Array.isArray(stored)
          ? stored.filter((id): id is string => typeof id === "string")
          : [],
      );
      setLoaded(true);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  function visit(row: WebReminder) {
    if (owner) {
      const storageKey = `picket-web.notifications.${owner}`;
      let stored: unknown;
      try {
        stored = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
      } catch {
        stored = [];
      }
      const saved = Array.isArray(stored)
        ? stored.filter((id): id is string => typeof id === "string")
        : [];
      const next = [...new Set([...saved, ...readIds, row.id])].slice(-1000);
      setReadIds(next);
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* Navigation still works when local storage is unavailable. */
      }
    }
    menu.current?.removeAttribute("open");
    router.push(`/notifications?notificationId=${encodeURIComponent(row.id)}`);
  }

  const unread = rows.filter((row) => !readIds.includes(row.id)).length;
  const orderedRows = [...rows].sort((left, right) => right.date.localeCompare(left.date));
  const statusLabel = loadError
    ? "Không tải được thông báo"
    : loading
      ? "Đang tải thông báo…"
      : loaded
        ? unread
          ? `${unread} chưa đọc`
          : "Đã xem hết"
        : "Mở để xem thông báo";

  return (
    <details
      ref={menu}
      className="workspace-notifications-menu"
      onToggle={() => {
        if (menu.current?.open) void loadRows();
      }}
    >
      <summary
        className="workspace-notifications-trigger"
        aria-label={unread ? `Thông báo, ${unread} chưa đọc` : "Thông báo"}
      >
        <Icon name="bell" />
        {unread > 0 && (
          <span className="workspace-notification-count" aria-hidden="true">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </summary>
      <section className="workspace-notification-panel" aria-label="Thông báo">
        <header>
          <div>
            <b>Thông báo</b>
            <small>{statusLabel}</small>
          </div>
          <span className="workspace-notification-route">Picket</span>
        </header>
        <div className="workspace-notification-list" aria-busy={loading}>
          {loading ? (
            <p className="workspace-notification-state" role="status">Đang tải thông báo…</p>
          ) : loadError ? (
            <div className="workspace-notification-state" role="status">
              <p>Không tải được thông báo.</p>
              <button type="button" onClick={() => void loadRows()}>Thử lại</button>
            </div>
          ) : loaded && rows.length ? (
            <>
              {hasPartialData && (
                <p className="workspace-notification-partial" role="status">
                  Một số nguồn thông báo chưa tải được.
                </p>
              )}
              {orderedRows.map((row) => {
                const read = readIds.includes(row.id);
                return (
                  <button
                    type="button"
                    className={`workspace-notification-item${read ? " is-read" : ""}`}
                    key={row.id}
                    onClick={() => visit(row)}
                  >
                    <span className={`workspace-notification-dot${read ? " is-read" : ""}`} aria-hidden="true" />
                    <span className="workspace-notification-copy">
                      <b>{row.title}</b>
                      <small>{row.body || notificationKindLabel(row.kind)}</small>
                      <time dateTime={row.date}>{formatNotificationDate(row.date)}</time>
                    </span>
                    <Icon name="chevronRight" />
                  </button>
                );
              })}
            </>
          ) : loaded ? (
            <p className="workspace-notification-state" role="status">
              Chưa có thông báo mới.
            </p>
          ) : null}
        </div>
        <button
          type="button"
          className="workspace-notification-all"
          onClick={() => {
            menu.current?.removeAttribute("open");
            router.push("/notifications");
          }}
        >
          Xem tất cả thông báo
        </button>
      </section>
    </details>
  );
}

function notificationKindLabel(kind: string) {
  const labels: Record<string, string> = {
    bill: "Hóa đơn",
    budget: "Ngân sách",
    partner: "Thông tin đối tác",
    return: "Hạn đổi trả",
    subscription: "Giao dịch định kỳ",
    system: "Thông báo hệ thống",
    warranty: "Hạn bảo hành",
  };
  return labels[kind] ?? "Thông báo";
}

function formatNotificationDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return date.toLocaleDateString("vi-VN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  });
}
