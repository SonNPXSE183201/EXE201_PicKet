"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { WebReminder } from "@/core/finance/reminders";
export function NotificationFeed({
  rows,
  owner,
}: {
  rows: WebReminder[];
  owner: string;
}) {
  const [read, setRead] = useState<string[]>([]),
    [unreadOnly, setUnreadOnly] = useState(false),
    [message, setMessage] = useState("");
  const key = "picket-web.notifications." + owner;
  useEffect(() => {
    Promise.resolve().then(() => {
      try {
        const ids = JSON.parse(localStorage.getItem(key) ?? "[]");
        if (Array.isArray(ids))
          setRead(ids.filter((id) => typeof id === "string"));
      } catch {
        setMessage("Không đọc được trạng thái trên trình duyệt này.");
      }
    });
  }, [key]);
  function mark(id: string) {
    const next = [...new Set([...read, id])];
    setRead(next);
    try {
      localStorage.setItem(key, JSON.stringify(next.slice(-1000)));
    } catch {
      setMessage(
        "Đã đánh dấu trong phiên này, nhưng trình duyệt không lưu được trạng thái.",
      );
    }
  }
  const visible = unreadOnly ? rows.filter((r) => !read.includes(r.id)) : rows;
  return (
    <section className="data-panel">
      <div className="panel-heading">
        <h2>Nhắc việc & thông tin</h2>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(e) => setUnreadOnly(e.target.checked)}
          />
          Chỉ chưa đọc
        </label>
      </div>
      {visible.map((r) => (
        <article className="notification-row" key={r.id}>
          <div>
            <p className="eyebrow">
              {r.kind === "partner"
                ? "Thông tin đối tác"
                : r.kind === "system"
                  ? "Thông báo hệ thống"
                  : read.includes(r.id)
                    ? "Đã đọc"
                    : "Chưa đọc"}
            </p>
            <h3>{r.title}</h3>
            {r.body && <p>{r.body}</p>}
            <p>
              {new Date(r.date).toLocaleDateString("vi-VN", {
                timeZone: "Asia/Ho_Chi_Minh",
              })}
            </p>
            <Link
              href={r.href}
              target={r.external ? "_blank" : undefined}
              rel={r.external ? "noopener noreferrer" : undefined}
            >
              Xem chi tiết{r.external ? " (mở trang bên ngoài)" : ""}
            </Link>
          </div>
          {!read.includes(r.id) && (
            <button className="button secondary" onClick={() => mark(r.id)}>
              Đánh dấu đã đọc
            </button>
          )}
        </article>
      ))}
      {!visible.length && (
        <p className="empty-state">
          {unreadOnly
            ? "Bạn đã đọc hết các mục hiện có."
            : "Chưa có lịch nhắc hoặc thông báo mới."}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      <p>
        Trạng thái đã đọc được lưu riêng trên trình duyệt này. Nhắc khi đóng
        trình duyệt và thông báo Android được quản lý trên điện thoại.
      </p>
    </section>
  );
}
