"use client";
import { useState } from "react";
import type {
  FinanceExportEnvelope,
  FinancePayload,
  FinanceImportSummary,
} from "@picket/domain";
import { useRouter } from "next/navigation";
import { createClient } from "@/core/supabase/client";
import {
  decodeBase64,
  encodeBase64,
  openBackup,
  sealBackup,
} from "@/core/finance/backup-codec";
type Backup = { data: FinancePayload; media: Record<string, string> };
function slots(data: FinancePayload) {
  return [
    ...data.entries.map((item) => ({
      item: item as unknown as Record<string, unknown>,
      field: "receiptPath",
    })),
    ...data.keepsakes.map((item) => ({
      item: item as unknown as Record<string, unknown>,
      field: "photoPath",
    })),
  ];
}
function download(
  text: string,
  filename: string,
  type = "application/octet-stream",
) {
  const url = URL.createObjectURL(new Blob([text], { type })),
    a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function imageType(bytes: Uint8Array) {
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
    return { ext: "jpg", mime: "image/jpeg" };
  if (bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71)
    return { ext: "png", mime: "image/png" };
  if (
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  )
    return { ext: "webp", mime: "image/webp" };
  throw Error("Ảnh trong bản sao không được hỗ trợ.");
}
function validateMedia(backup: Backup) {
  if (
    !backup?.data ||
    !Array.isArray(backup.data.entries) ||
    !Array.isArray(backup.data.keepsakes) ||
    !backup.media ||
    typeof backup.media !== "object" ||
    Array.isArray(backup.media)
  )
    throw Error("Dữ liệu bản sao không hợp lệ.");
  let total = 0;
  for (const { item, field } of slots(backup.data)) {
    const ref = item[field];
    if (ref == null) continue;
    if (
      typeof ref !== "string" ||
      !/^image:\d+$/.test(ref) ||
      typeof backup.media[ref] !== "string"
    )
      throw Error("Bản sao thiếu ảnh.");
    const bytes = decodeBase64(backup.media[ref]);
    total += bytes.length;
    if (!bytes.length || bytes.length > 10485760 || total > 50000000)
      throw Error("Ảnh vượt giới hạn sao lưu 50 MB.");
    imageType(bytes);
  }
}
export function EncryptedBackup({ owner }: { owner: string }) {
  const router = useRouter();
  const [password, setPassword] = useState(""),
    [confirmation, setConfirmation] = useState(""),
    [file, setFile] = useState<File | null>(null),
    [backup, setBackup] = useState<Backup | null>(null),
    [summary, setSummary] = useState<
      (FinanceImportSummary & { currentRevision: number }) | null
    >(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function exportBackup(csv = false) {
    setBusy(true);
    setMessage("Đang chuẩn bị bản sao…");
    try {
      const response = await fetch("/api/export", { cache: "no-store" });
      if (!response.ok) {
        const problem = await response.json();
        throw Error(
          typeof problem.error === "string"
            ? problem.error
            : "Chưa tải được dữ liệu. Kiểm tra kết nối rồi thử lại.",
        );
      }
      const exported = (await response.json()) as FinanceExportEnvelope;
      if (csv) {
        const escape = (v: unknown) => {
          let s = String(v ?? "");
          if (/^\s*[=+@\-\t\r]/.test(s)) s = "'" + s;
          return '"' + s.replaceAll('"', '""') + '"';
        };
        const rows = [
          ["Ngày", "Loại", "Nội dung", "Số tiền", "Ví", "Danh mục", "Ghi chú"],
          ...exported.data.entries.map((e) => [
            e.date,
            e.type,
            e.title,
            e.amount,
            e.walletId,
            e.category,
            e.note,
          ]),
        ];
        download(
          "\uFEFF" + rows.map((r) => r.map(escape).join(",")).join("\r\n"),
          "picket-giao-dich.csv",
          "text/csv;charset=utf-8",
        );
        setMessage("Đã tạo file CSV.");
        return;
      }
      if (password.length < 12)
        throw Error("Nhập mật khẩu bản sao ít nhất 12 ký tự.");
      const data = structuredClone(exported.data),
        media: Record<string, string> = {},
        storage = createClient().storage.from("picket-media");
      let total = 0;
      for (const { item, field } of slots(data)) {
        const path = item[field];
        if (path == null) continue;
        if (
          typeof path !== "string" ||
          !path.startsWith(owner + "/") ||
          path.includes("..")
        )
          throw Error("Ảnh không thuộc tài khoản này.");
        const result = await storage.download(path);
        if (result.error || !result.data)
          throw Error(
            "Không tải được ảnh. Chưa tạo file để tránh thiếu dữ liệu.",
          );
        const bytes = new Uint8Array(await result.data.arrayBuffer());
        total += bytes.length;
        if (bytes.length > 10485760 || total > 50000000)
          throw Error("Ảnh vượt giới hạn 50 MB.");
        const key = "image:" + Object.keys(media).length;
        media[key] = encodeBase64(bytes);
        item[field] = key;
      }
      download(
        await sealBackup({ data, media }, password),
        "picket-" + new Date().toISOString().slice(0, 10) + ".picket",
      );
      setPassword("");
      setMessage(
        "Đã tạo bản sao mã hóa, gồm ảnh được tham chiếu trong dữ liệu tài chính. Giữ mật khẩu ở nơi an toàn.",
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Không tạo được bản sao.");
    } finally {
      setBusy(false);
    }
  }
  async function inspect() {
    if (!file) return;
    setBusy(true);
    setBackup(null);
    setSummary(null);
    setMessage("Đang giải mã ngay trong trình duyệt…");
    try {
      if (file.size > 100000000) throw Error("File vượt 100 MB.");
      const value = await openBackup<Backup>(await file.text(), password);
      validateMedia(value);
      const data = structuredClone(value.data);
      for (const { item, field } of slots(data)) item[field] = null;
      const envelope = {
        format: "picket-export-v1",
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        revision: 0,
        data,
      };
      const response = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(envelope),
      });
      if (!response.ok)
        throw Error("Dữ liệu không hợp lệ hoặc phiên đăng nhập hết hạn.");
      setSummary(await response.json());
      setBackup(value);
      setPassword("");
      setMessage("Bản sao hợp lệ. Khôi phục sẽ thay thế dữ liệu hiện tại.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Không đọc được bản sao.");
    } finally {
      setBusy(false);
    }
  }
  async function restore() {
    if (!backup || !summary || confirmation !== "RESTORE") return;
    setBusy(true);
    setMessage("Đang tải ảnh và khôi phục…");
    try {
      const data = structuredClone(backup.data),
        storage = createClient().storage.from("picket-media");
      for (const { item, field } of slots(data)) {
        const ref = item[field];
        if (ref == null) continue;
        const bytes = decodeBase64(backup.media[String(ref)]),
          type = imageType(bytes),
          path =
            owner +
            (field === "photoPath" ? "/keepsakes/" : "/receipts/") +
            crypto.randomUUID() +
            "." +
            type.ext;
        const result = await storage.upload(path, bytes, {
          contentType: type.mime,
          upsert: false,
        });
        if (result.error)
          throw Error(
            "Chưa tải đủ ảnh. Dữ liệu tài chính hiện tại chưa được thay thế.",
          );
        item[field] = path;
      }
      const exported = {
        format: "picket-export-v1",
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        revision: summary.currentRevision,
        data,
      };
      const response = await fetch("/api/import", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmation: "RESTORE",
          expectedRevision: summary.currentRevision,
          export: exported,
        }),
      });
      if (!response.ok)
        throw Error(
          response.status === 409
            ? "Dữ liệu đã thay đổi. Kiểm tra lại tổng quan trước khi chọn và giải mã bản sao lần nữa."
            : "Chưa nhận được xác nhận khôi phục. Ảnh đã tải được giữ lại để tránh mất dữ liệu; hãy kiểm tra tổng quan trước khi thử lại.",
        );
      setBackup(null);
      setSummary(null);
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      setSummary(null);
      setMessage(
        e instanceof Error
          ? e.message
          : "Chưa xác nhận được khôi phục. Kiểm tra dữ liệu trước khi thử lại.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="operation-card">
      <h2>Bản sao .picket mã hóa</h2>
      <p>
        Tương thích định dạng cloud đang dùng trên Expo. Mã hóa và giải mã trên
        trình duyệt; mật khẩu không gửi đến máy chủ. Bản sao riêng trên thiết bị
        Android cần khôi phục trong Android.
      </p>
      <div className="finance-form">
        <label>
          Mật khẩu bản sao
          <input
            type="password"
            autoComplete="off"
            minLength={12}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy}
          />
        </label>
        <button
          type="button"
          className="button primary"
          disabled={busy || password.length < 12}
          onClick={() => void exportBackup()}
        >
          Tải bản sao .picket có ảnh
        </button>
        <button
          type="button"
          className="button secondary"
          disabled={busy}
          onClick={() => void exportBackup(true)}
        >
          Xuất giao dịch CSV
        </button>
        <label>
          Chọn bản sao cloud .picket
          <input
            type="file"
            accept=".picket,application/octet-stream"
            disabled={busy}
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setBackup(null);
              setSummary(null);
              setConfirmation("");
            }}
          />
        </label>
        <button
          className="button secondary"
          disabled={busy || !file || !password}
          type="button"
          onClick={() => void inspect()}
        >
          Giải mã và kiểm tra
        </button>
        {summary && (
          <>
            <p>
              {summary.wallets} ví · {summary.entries} giao dịch ·{" "}
              {summary.budgets} ngân sách
            </p>
            <label>
              Nhập RESTORE để thay thế dữ liệu
              <input
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                autoComplete="off"
                disabled={busy}
              />
            </label>
            <button
              type="button"
              className="button destructive"
              disabled={busy || confirmation !== "RESTORE"}
              onClick={() => void restore()}
            >
              Khôi phục dữ liệu và ảnh
            </button>
          </>
        )}
        {message && (
          <p role="status" className="capture-status">
            {message}
          </p>
        )}
      </div>
    </article>
  );
}
