import { formatVnd } from "@picket/domain";
import Link from "next/link";
import { ReceiptCalendar } from "@/core/ui/receipt-calendar";
import { vietnamDate } from "@/core/finance/overview";

import { requireApiSession } from "@/core/auth/require-api-session";

import { checkReceiptDuplicate } from "../actions";
import { FinancePageHeader } from "../finance-ui";

function statusText(status: string) {
  if (status === "confirmed") return "Đã xác nhận";
  if (status === "review_required") return "Cần kiểm tra";
  if (status === "processing") return "Đang xử lý";
  return "Xử lý thất bại";
}

export default async function ReceiptsPage({
  searchParams,
}: {
  searchParams: Promise<{ duplicate?: string; day?: string }>;
}) {
  const query = await searchParams;
  const { accessToken, api } = await requireApiSession();
  const { receipts } = await api.listReceipts(accessToken);
  const day = /^\d{4}-\d{2}-\d{2}$/.test(query.day ?? "")
    ? query.day
    : undefined;
  const visible = day
    ? receipts.filter(
        (r) => r.purchasedAt && vietnamDate(r.purchasedAt) === day,
      )
    : receipts;
  return (
    <>
      <FinancePageHeader
        title="Hóa đơn"
        description="Kiểm tra kết quả OCR và chỉnh lại từng sản phẩm trước khi dùng dữ liệu."
      />
      <div className="finance-toolbar">
        <Link
          className="button primary"
          href={day ? `/capture?date=${day}` : "/capture"}
        >
          Chụp hoặc tải ảnh hóa đơn
        </Link>
      </div>
      <ReceiptCalendar
        dates={receipts.flatMap((r) => (r.purchasedAt ? [r.purchasedAt] : []))}
        initialMonth={
          day?.slice(0, 7) ?? vietnamDate(new Date().toISOString()).slice(0, 7)
        }
        selectedDay={day}
      />
      {day && (
        <div className="finance-toolbar">
          <h2>Hóa đơn ngày {day.split("-").reverse().join("/")}</h2>
          <Link href="/receipts">Xem tất cả</Link>
        </div>
      )}
      <section
        className="finance-panel duplicate-check-panel"
        aria-labelledby="duplicate-check-title"
      >
        <div>
          <p className="eyebrow">Chống ghi nhận trùng</p>
          <h2 id="duplicate-check-title">Kiểm tra hóa đơn đã tồn tại</h2>
          <p className="empty-state">
            So khớp cửa hàng, ngày mua (sai lệch tối đa một ngày) và tổng tiền
            trên máy chủ.
          </p>
        </div>
        {query.duplicate === "none" && (
          <p className="admin-success" role="status">
            Không tìm thấy hóa đơn tương tự.
          </p>
        )}
        {query.duplicate === "check_failed" && (
          <p className="mutation-error" role="alert">
            Không kiểm tra được hóa đơn trùng. Hãy thử lại.
          </p>
        )}
        <form
          action={checkReceiptDuplicate}
          className="inline-form duplicate-check-form"
        >
          <label>
            Cửa hàng
            <input maxLength={160} name="merchant" required />
          </label>
          <label>
            Ngày mua
            <input name="purchasedAt" required type="date" />
          </label>
          <label>
            Tổng tiền
            <input
              inputMode="numeric"
              max="9000000000000"
              min="1"
              name="total"
              required
              type="number"
            />
          </label>
          <button className="small-button" type="submit">
            Kiểm tra trùng
          </button>
        </form>
      </section>
      <section className="finance-stack">
        {visible.map((receipt) => (
          <article className="resource-card" key={receipt.id}>
            <div className="resource-summary">
              <div>
                <h2>{receipt.merchant ?? "Hóa đơn chưa có cửa hàng"}</h2>
                <p>
                  {statusText(receipt.status)} · {receipt.lineItems.length} sản
                  phẩm · phiên bản {receipt.version}
                </p>
              </div>
              <strong className="expense">
                {receipt.detectedTotal === null
                  ? "Chưa có tổng"
                  : formatVnd(receipt.detectedTotal)}
              </strong>
            </div>
            <div className="resource-actions">
              <Link href={`/receipts/${receipt.id}`}>Xem và chỉnh sửa</Link>
            </div>
          </article>
        ))}
        {visible.length === 0 && (
          <p className="empty-state">
            {day
              ? "Chưa có hóa đơn trong ngày này."
              : "Chưa có hóa đơn nào. Chụp hoặc tải ảnh đầu tiên để bắt đầu."}
          </p>
        )}
      </section>
    </>
  );
}
