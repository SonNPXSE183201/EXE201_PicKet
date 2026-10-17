import { formatVnd } from "@picket/domain";
import Link from "next/link";

import { requireApiSession } from "@/core/auth/require-api-session";
import { createClient } from "@/core/supabase/server";

import { updateReceipt } from "../../actions";
import { FinancePageHeader, MutationError } from "../../finance-ui";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ duplicate?: string; error?: string; updated?: string }>;
}

function dateInput(value: string | null) {
  return value?.slice(0, 10) ?? "";
}

export default async function ReceiptPage({ params, searchParams }: PageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const { accessToken, api } = await requireApiSession();
  const { receipt } = await api.getReceipt(accessToken, id);
  const supabase = await createClient();
  const signed = await supabase.storage
    .from("picket-media")
    .createSignedUrl(receipt.storagePath, 300);
  const rows = [
    ...receipt.lineItems.map((item) => ({
      name: item.name,
      quantity: String(item.quantity),
      unitPrice: item.unitPrice === null ? "" : String(item.unitPrice),
      total: String(item.total),
    })),
    ...Array.from({ length: 3 }, () => ({ name: "", quantity: "1", unitPrice: "", total: "" })),
  ];

  return (
    <>
      <FinancePageHeader
        title="Chi tiết hóa đơn"
        description="Ảnh dùng URL riêng tư có hiệu lực 5 phút; mọi thay đổi được kiểm tra phiên bản trên máy chủ."
      />
      <MutationError visible={Boolean(query.error)} />
      {query.updated === "1" && <p className="admin-success" role="status">Đã lưu kết quả kiểm tra hóa đơn.</p>}
      {receipt.status === "review_required" ? (
        <p className="mutation-error" role="status">
          Hóa đơn cần kiểm tra. Hãy đối chiếu ảnh, tổng tiền và sản phẩm trước khi xác nhận.
        </p>
      ) : receipt.status === "confirmed" ? (
        <p className="admin-success" role="status">Hóa đơn đã được xác nhận.</p>
      ) : null}
      {query.duplicate && (
        <p className="mutation-error" role="alert">
          {query.duplicate === "exact_hash"
            ? "Ảnh này trùng hoàn toàn với hóa đơn đã lưu."
            : "Hóa đơn này có cùng cửa hàng, ngày mua và tổng tiền với dữ liệu bạn vừa kiểm tra."}
        </p>
      )}
      <div className="receipt-detail-grid">
        <aside className="finance-panel receipt-preview">
          {signed.data?.signedUrl ? (
            // The URL is short-lived and generated from the authenticated user's Storage policy.
            // eslint-disable-next-line @next/next/no-img-element
            <img alt="Ảnh hóa đơn" src={signed.data.signedUrl} />
          ) : (
            <p className="empty-state">Không tải được ảnh xem trước.</p>
          )}
          <p>{receipt.ocrProvider} · {receipt.confidence === null ? "Chưa có độ tin cậy" : `${Math.round(receipt.confidence * 100)}%`}</p>
          <p>{receipt.detectedTotal === null ? "Chưa có tổng tiền" : formatVnd(receipt.detectedTotal)}</p>
          <Link className="back-link" href="/receipts">← Danh sách hóa đơn</Link>
        </aside>

        <form action={updateReceipt} className="finance-panel receipt-review-form">
          <input name="receiptId" type="hidden" value={receipt.id} />
          <input name="version" type="hidden" value={receipt.version} />
          <h2>Thông tin OCR</h2>
          <div className="finance-form receipt-metadata">
            <label>Cửa hàng<input defaultValue={receipt.merchant ?? ""} maxLength={160} name="merchant" /></label>
            <label>Tổng hóa đơn<input defaultValue={receipt.detectedTotal ?? ""} inputMode="numeric" min="1" name="detectedTotal" type="number" /></label>
            <label>Ngày mua<input defaultValue={dateInput(receipt.purchasedAt)} name="purchasedAt" type="date" /></label>
          </div>
          <div className="receipt-section-heading">
            <h2>Sản phẩm</h2>
            <span>Tối đa 100 dòng; ba dòng trống để thêm mới.</span>
          </div>
          <div className="receipt-lines">
            {rows.map((row, index) => (
              <fieldset className="receipt-line-editor" key={`${index}-${row.name}`}>
                <legend>Sản phẩm {index + 1}</legend>
                <label>Tên<input defaultValue={row.name} maxLength={200} name={`lineName:${index}`} /></label>
                <label>Số lượng<input defaultValue={row.quantity} min="0.000001" name={`lineQuantity:${index}`} step="any" type="number" /></label>
                <label>Đơn giá<input defaultValue={row.unitPrice} inputMode="numeric" min="0" name={`lineUnitPrice:${index}`} type="number" /></label>
                <label>Thành tiền<input defaultValue={row.total} inputMode="numeric" min="1" name={`lineTotal:${index}`} type="number" /></label>
                {index < receipt.lineItems.length && <label className="checkbox-label receipt-delete"><input name={`lineDelete:${index}`} type="checkbox" /> Xóa dòng này</label>}
              </fieldset>
            ))}
          </div>
          <button className="button primary" type="submit">Lưu kết quả kiểm tra</button>
        </form>
      </div>
      {receipt.rawText && (
        <details className="operation-card receipt-raw-text">
          <summary>Văn bản OCR gốc</summary>
          <pre>{receipt.rawText}</pre>
        </details>
      )}
    </>
  );
}
