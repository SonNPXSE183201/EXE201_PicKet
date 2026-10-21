"use client";
import { useState } from "react";
export function ExportJsonButton() {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function run() {
    setBusy(true);
    setMessage("");
    try {
      const r = await fetch("/api/export", { cache: "no-store" });
      if (!r.ok) {
        const error = await r.json();
        throw Error(
          typeof error.error === "string"
            ? error.error
            : "Không xuất được dữ liệu.",
        );
      }
      const url = URL.createObjectURL(await r.blob()),
        a = document.createElement("a");
      a.href = url;
      a.download =
        "picket-export-" + new Date().toISOString().slice(0, 10) + ".json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage("Đã tạo bản sao JSON.");
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : "Không xuất được dữ liệu. Chưa có file nào được tải.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button
        className="button primary"
        type="button"
        disabled={busy}
        onClick={() => void run()}
      >
        {busy ? "Đang kiểm tra dữ liệu…" : "Tải bản export JSON"}
      </button>
      {message && (
        <p role="status" className="capture-status">
          {message}
        </p>
      )}
    </>
  );
}
