"use client";
import { useState } from "react";
import Link from "next/link";
import type { Transaction } from "@picket/domain";
import { bulkArchive } from "./bulk-action";
export function BulkArchive({ rows }: { rows: Transaction[] }) {
  const [selected, setSelected] = useState<string[]>([]),
    [q, setQ] = useState(""),
    [confirmation, setConfirmation] = useState(""),
    [results, setResults] = useState<Array<{ id: string; ok: boolean }>>([]),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const completed = new Set(results.filter((r) => r.ok).map((r) => r.id));
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const items = rows.filter(
        (r) => selected.includes(r.id) && !completed.has(r.id),
      );
      const result = await bulkArchive(
        items.map((r) => ({ id: r.id, version: r.version })),
        confirmation,
      );
      setResults((previous) => [
        ...previous.filter((p) => !result.some((r) => r.id === p.id)),
        ...result,
      ]);
      const failed = result.filter((r) => !r.ok).length;
      setMessage(
        `Đã lưu trữ ${result.length - failed}/${result.length} giao dịch.${failed ? " Các khoản lỗi được giữ lại; mở chi tiết mới nhất trước khi thử lại." : ""}`,
      );
    } catch {
      setMessage(
        "Chưa xác nhận được toàn bộ kết quả. Mở lại danh sách mới nhất trước khi thử lại; không chọn lại khoản đã lưu trữ.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="finance-panel">
      <label className="finance-form">
        Tìm trong danh sách
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tên giao dịch"
        />
      </label>
      <form onSubmit={submit} className="finance-form">
        <p role="status">
          Đã chọn {selected.filter((id) => !completed.has(id)).length}/100
        </p>
        <div className="bulk-list">
          {rows
            .filter((r) =>
              r.title
                .toLocaleLowerCase("vi")
                .includes(q.toLocaleLowerCase("vi")),
            )
            .map((r) => (
              <div className="bulk-row" key={r.id}>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={selected.includes(r.id)}
                    disabled={
                      busy ||
                      completed.has(r.id) ||
                      (!selected.includes(r.id) && selected.length >= 100)
                    }
                    onChange={(e) =>
                      setSelected((s) =>
                        e.target.checked
                          ? [...s, r.id]
                          : s.filter((id) => id !== r.id),
                      )
                    }
                  />
                  <span>
                    {r.title}
                    <small>
                      {new Date(r.occurredAt).toLocaleDateString("vi-VN")} ·{" "}
                      {r.amount.toLocaleString("vi-VN")}
                    </small>
                  </span>
                </label>
                <span>
                  {completed.has(r.id)
                    ? "Đã lưu trữ"
                    : results.some((p) => p.id === r.id && !p.ok)
                      ? "Chưa lưu trữ"
                      : ""}
                </span>
                <Link href={"/transactions/" + r.id}>Chi tiết</Link>
              </div>
            ))}
        </div>
        <label>
          Nhập ARCHIVE để xác nhận
          <input
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            required
            pattern="ARCHIVE"
            autoComplete="off"
          />
        </label>
        <p>
          Lưu trữ loại giao dịch khỏi số dư và thống kê. Không tự thực hiện lại
          các khoản đã thành công.
        </p>
        {message && (
          <p role="status" className="capture-status">
            {message}
          </p>
        )}
        <button
          className="button destructive"
          disabled={
            busy ||
            confirmation !== "ARCHIVE" ||
            !selected.some((id) => !completed.has(id))
          }
        >
          {busy ? "Đang xử lý từng giao dịch…" : "Lưu trữ các khoản đã chọn"}
        </button>
      </form>
    </article>
  );
}
