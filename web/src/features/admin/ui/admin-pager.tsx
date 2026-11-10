"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";
import { AdminIcon } from "./admin-icon";
import { formatNumber } from "./paper";

/** Page based portal screens use a fixed 25 row API window; this control adds direct page navigation. */
export function AdminPager({ base, page, total, query, pageSize = 25, clear = [] }: {
  base: string;
  page: number;
  total: number;
  query: Record<string, string | undefined>;
  pageSize?: number;
  clear?: string[];
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const pages = Math.max(1, Math.ceil(total / pageSize));

  const go = (nextPage: number) => {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) if (value) next.set(key, value);
    for (const key of clear) next.delete(key);
    if (nextPage === 0) next.delete("page");
    else next.set("page", String(nextPage));
    router.push(`${base}${next.size ? `?${next}` : ""}`);
  };

  return (
    <nav className="ap-pagination" aria-label="Phân trang">
      <span>{formatNumber(total)} bản ghi · Trang {page + 1} / {formatNumber(pages)}</span>
      <span className="ap-row ap-pagination-controls">
        <button className="ap-btn is-secondary" type="button" disabled={page <= 0} onClick={() => go(page - 1)} aria-label="Trang trước">
          <AdminIcon name="chevron-left" size={16} />
        </button>
        <form className="ap-page-jump" onSubmit={(event) => {
          event.preventDefault();
          const value = Number(input.current?.value);
          if (Number.isInteger(value) && value >= 1 && value <= pages) go(value - 1);
        }}>
          <label>Đến trang
            <input ref={input} aria-label="Số trang cần mở" type="number" min={1} max={pages} defaultValue={page + 1} />
          </label>
          <button className="ap-btn is-secondary" type="submit">Đi</button>
        </form>
        <button className="ap-btn is-coral" type="button" disabled={page + 1 >= pages} onClick={() => go(page + 1)} aria-label="Trang sau">
          <AdminIcon name="chevron-right" size={16} />
        </button>
      </span>
    </nav>
  );
}
