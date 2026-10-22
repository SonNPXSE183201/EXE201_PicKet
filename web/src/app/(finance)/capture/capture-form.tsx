"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/core/supabase/client";
import { ocrSuggestion } from "@/core/finance/ocr-suggestion";
import { parseServerOcrResult } from "@/core/finance/receipt-parser";
import {
  receiptOcrStatus,
  startReceiptOcr,
  submitReceipt,
} from "./capture-actions";

async function prepareImage(file: File, rotation = 0) {
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    !file.size ||
    file.size > 10 * 1024 * 1024
  )
    throw Error("Chọn ảnh JPG, PNG hoặc WebP tối đa 10 MB.");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 2048 / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale),
    height = Math.round(bitmap.height * scale),
    canvas = document.createElement("canvas");
  const swap = rotation % 180 !== 0;
  canvas.width = swap ? height : width;
  canvas.height = swap ? width : height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw Error("Trình duyệt không xử lý được ảnh.");
  }
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.drawImage(bitmap, -width / 2, -height / 2, width, height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(Error("Không đọc được ảnh."))),
      "image/jpeg",
      0.9,
    ),
  );
  const sha256 = Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", await blob.arrayBuffer()),
    ),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
  return { blob, sha256 };
}
export function CaptureForm({
  owner,
  initialDate,
}: {
  owner: string;
  initialDate: string;
}) {
  const router = useRouter(),
    source = useRef<File | null>(null),
    rotation = useRef(0),
    identity = useRef(crypto.randomUUID());
  const [image, setImage] = useState<{ blob: Blob; sha256: string } | null>(
      null,
    ),
    [preview, setPreview] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [consent, setConsent] = useState(false),
    [merchant, setMerchant] = useState(""),
    [amount, setAmount] = useState(""),
    [date, setDate] = useState(initialDate),
    [jobId, setJobId] = useState<string | null>(null);
  const uploaded = useRef<Record<string, string>>({}),
    ocrBaseline = useRef({ merchant: "", amount: "", date: "" }),
    current = useRef({ merchant, amount, date }),
    previewUrl = useRef("");
  useEffect(() => {
    current.current = { merchant, amount, date };
  }, [merchant, amount, date]);
  useEffect(
    () => () => {
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    },
    [],
  );
  function updateImage(value: { blob: Blob; sha256: string }) {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = URL.createObjectURL(value.blob);
    setPreview(previewUrl.current);
    setImage(value);
  }
  async function select(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setMessage("");
    try {
      source.current = file;
      rotation.current = 0;
      updateImage(await prepareImage(file));
      identity.current = crypto.randomUUID();
      uploaded.current = {};
      setJobId(null);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Không đọc được ảnh.");
    } finally {
      setBusy(false);
    }
  }
  async function rotate() {
    if (!source.current) return;
    setBusy(true);
    try {
      rotation.current = (rotation.current + 90) % 360;
      updateImage(await prepareImage(source.current, rotation.current));
      identity.current = crypto.randomUUID();
      uploaded.current = {};
      setJobId(null);
    } catch {
      setMessage("Không xoay được ảnh. Hãy chọn lại ảnh.");
    } finally {
      setBusy(false);
    }
  }
  async function upload(folder = "receipts") {
    if (!image || !consent)
      throw Error("Hãy chọn ảnh và đồng ý tải ảnh lên cloud.");
    if (uploaded.current[folder]) return uploaded.current[folder];
    const path = owner + "/" + folder + "/" + identity.current + ".jpg",
      storage = createClient().storage.from("picket-media");
    const result = await storage.upload(path, image.blob, {
      contentType: "image/jpeg",
      upsert: false,
    });
    if (result.error) {
      const existing = await storage.download(path);
      if (existing.error || !existing.data)
        throw Error("Không tải được ảnh. Kiểm tra mạng rồi thử lại.");
      const digest = Array.from(
        new Uint8Array(
          await crypto.subtle.digest(
            "SHA-256",
            await existing.data.arrayBuffer(),
          ),
        ),
        (b) => b.toString(16).padStart(2, "0"),
      ).join("");
      if (digest !== image.sha256)
        throw Error("Không xác minh được ảnh đã tải.");
    }
    uploaded.current[folder] = path;
    return path;
  }
  async function ocr() {
    if (busy) return;
    setBusy(true);
    setMessage("Đang nhận diện hóa đơn…");
    try {
      let job = jobId
        ? await receiptOcrStatus(jobId)
        : await startReceiptOcr(await upload("ocr"), identity.current);
      setJobId(job.id);
      ocrBaseline.current = { merchant, amount, date };
      for (
        let i = 0;
        i < 25 && ["queued", "processing"].includes(job.status);
        i++
      ) {
        await new Promise((r) => setTimeout(r, 1500));
        job = await receiptOcrStatus(job.id);
      }
      if (job.status === "completed" && job.result) {
        const parsed = parseServerOcrResult(job.result);
        const r = ocrSuggestion({
          merchant: parsed.merchant,
          amount: parsed.amount,
          date: parsed.date,
        });
        if (
          r.merchant &&
          current.current.merchant === ocrBaseline.current.merchant
        )
          setMerchant(r.merchant);
        if (r.amount && current.current.amount === ocrBaseline.current.amount)
          setAmount(r.amount);
        if (r.date && current.current.date === ocrBaseline.current.date)
          setDate(r.date);
        setMessage(
          "Nhận diện xong. Hãy đối chiếu kết quả với ảnh trước khi lưu.",
        );
      } else if (["queued", "processing"].includes(job.status))
        setMessage(
          "Hóa đơn vẫn đang được xử lý. Nhấn nhận diện lại để xem cùng yêu cầu, không gửi thêm lượt mới.",
        );
      else
        setMessage(
          "Không nhận diện được. Bạn vẫn có thể điền thông tin và lưu ảnh.",
        );
    } catch {
      setMessage(
        "Chưa nhận được kết quả OCR. Kiểm tra kết nối rồi thử lại hoặc nhập thủ công.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("Đang lưu hóa đơn…");
    try {
      const path = await upload();
      const result = await submitReceipt(
        {
          storagePath: path,
          imageSha256: image!.sha256,
          merchant,
          detectedTotal: Number(amount),
          purchasedAt: date + "T12:00:00.000Z",
          currencyCode: "VND",
          ocrProvider: "manual",
          reviewRequired: true,
        },
        jobId,
      );
      router.push(
        "/receipts/" +
          result.id +
          (result.duplicate ? "?duplicate=exact_hash" : ""),
      );
      router.refresh();
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : "Không lưu được hóa đơn. Hãy thử lại, giữ nguyên ảnh để kiểm tra trùng.",
      );
      setBusy(false);
    }
  }
  return (
    <section className="receipt-detail-grid capture-workflow">
      <article className="finance-panel">
        <p className="capture-step">01 · Chọn ảnh</p>
        <h2>Ảnh hóa đơn</h2>
        {!preview && <div className="capture-empty"><svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M5 3h14v18l-3-2-4 2-4-2-3 2ZM8 8h8m-8 4h8m-8 4h5" /></svg><strong>Giữ lại hóa đơn của bạn</strong><span>Chụp rõ toàn bộ hóa đơn hoặc chọn ảnh có sẵn.</span></div>}
        <div className="capture-picker">
          <label className="button secondary">
            Chụp ảnh
            <input
              className="visually-hidden"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              disabled={busy}
              onChange={(e) => void select(e.target.files?.[0])}
            />
          </label>
          <label className="button secondary">
            Chọn từ thư viện
            <input
              className="visually-hidden"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={busy}
              onChange={(e) => void select(e.target.files?.[0])}
            />
          </label>
        </div>
        <p>
          JPG, PNG hoặc WebP · tối đa 10 MB. Camera tùy thuộc quyền và khả năng
          của trình duyệt.
        </p>
        {preview && (
          <>
            <Image
              unoptimized
              width={1080}
              height={1440}
              className="capture-preview"
              src={preview}
              alt="Ảnh hóa đơn đang kiểm tra"
            />
            <button
              type="button"
              className="button secondary"
              onClick={() => void rotate()}
              disabled={busy}
            >
              Xoay ảnh 90°
            </button>
          </>
        )}
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            disabled={busy}
          />
          Tôi đồng ý tải ảnh lên vùng lưu trữ riêng của tài khoản; khi chọn OCR,
          ảnh được gửi đến dịch vụ nhận diện cloud.
        </label>
        <button
          type="button"
          className="button secondary"
          disabled={!image || !consent || busy}
          onClick={() => void ocr()}
        >
          Nhận diện trên cloud
        </button>
      </article>
      <article className="finance-panel">
        <p className="capture-step">02 · Xem lại thông tin</p>
        <h2>Kiểm tra rồi lưu</h2>
        <form className="finance-form" onSubmit={save}>
          <label>
            Cửa hàng
            <input
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              maxLength={160}
              required
            />
          </label>
          <label>
            Tổng tiền (VND)
            <input
              type="number"
              min="1"
              max="9000000000000"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </label>
          <label>
            Ngày mua
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </label>
          <p>
            Chưa tạo giao dịch tự động. Sau khi lưu, bạn có thể sửa từng sản
            phẩm trên trang hóa đơn.
          </p>
          {message && (
            <p className="capture-status" role="status">
              {message}
            </p>
          )}
          <button
            className="button primary"
            disabled={!image || !consent || busy}
            type="submit"
          >
            {busy ? "Đang xử lý…" : "Lưu và kiểm tra hóa đơn"}
          </button>
        </form>
      </article>
    </section>
  );
}
