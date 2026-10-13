"use client";

import type { FinanceExportEnvelope, FinanceImportSummary } from "@picket/domain";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Validation = FinanceImportSummary & { currentRevision: number };

export function RestoreForm() {
  const router = useRouter();
  const [exported, setExported] = useState<FinanceExportEnvelope | null>(null);
  const [validation, setValidation] = useState<Validation | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function choose(file: File | undefined) {
    setExported(null); setValidation(null); setConfirmation(""); setMessage(null);
    if (!file) return;
    if (file.size > 11_000_000) return setMessage("File vượt quá giới hạn 11 MB.");
    setBusy(true);
    try {
      const parsed = JSON.parse(await file.text()) as FinanceExportEnvelope;
      const response = await fetch("/api/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed) });
      if (!response.ok) throw new Error("invalid");
      setExported(parsed);
      setValidation(await response.json() as Validation);
    } catch {
      setMessage("File backup không hợp lệ hoặc Dart API chưa sẵn sàng.");
    } finally { setBusy(false); }
  }

  async function restore() {
    if (!exported || !validation || confirmation !== "RESTORE") return setMessage("Hãy validate file và nhập chính xác RESTORE.");
    setBusy(true); setMessage(null);
    try {
      const response = await fetch("/api/import", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expectedRevision: validation.currentRevision, confirmation: "RESTORE", export: exported }) });
      if (!response.ok) throw new Error("restore");
      router.replace("/dashboard"); router.refresh();
    } catch {
      setMessage("Restore thất bại hoặc dữ liệu đã thay đổi. Hãy chọn và validate file lại.");
      setValidation(null);
    } finally { setBusy(false); }
  }

  return <div className="finance-form">
    <label>Chọn file picket-export-v1<input accept="application/json,.json" disabled={busy} onChange={(event) => void choose(event.target.files?.[0])} type="file" /></label>
    {validation && <div className="restore-summary"><strong>File hợp lệ</strong><span>{validation.wallets} ví · {validation.entries} giao dịch · {validation.budgets} ngân sách · {validation.bills} hóa đơn định kỳ</span></div>}
    {validation && <><label>Nhập RESTORE để ghi đè dữ liệu hiện tại<input autoComplete="off" onChange={(event) => setConfirmation(event.target.value)} pattern="RESTORE" value={confirmation} /></label><button className="button destructive" disabled={busy || confirmation !== "RESTORE"} onClick={() => void restore()} type="button">{busy ? "Đang khôi phục..." : "Khôi phục từ backup"}</button></>}
    {message && <p className="mutation-error" role="alert">{message}</p>}
  </div>;
}
