"use client";
import { useEffect, useRef, useState } from "react";
import { PicketApiClient } from "@picket/api-client";
import {
  formatPaymentCountdown,
  formatVnd,
  openPaymentOrder,
  PAYMENT_ORDER_PHASE_LABELS,
  paymentOrderPhase,
  paymentSecondsLeft,
  type PaymentCustomer,
} from "@picket/domain";
import { createClient } from "@/core/supabase/client";
import './payment-panel.css';

export function PaymentPanel({
  initial,
  paid,
}: {
  initial: PaymentCustomer;
  paid: boolean;
}) {
  const [data, setData] = useState(initial),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const keys = useRef(new Map<string, string>());
  const inFlight = useRef(false);
  const verified = useRef(new Set<string>());
  const [now, setNow] = useState(() => Date.now());
  const hasPending = data.orders.some((o) => o.status === "pending");
  useEffect(() => {
    if (!hasPending) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [hasPending]);
  async function run(
    action: (api: PicketApiClient, token: string) => Promise<PaymentCustomer>,
  ) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const {
        data: { session },
      } = await createClient().auth.getSession();
      if (!session) throw new Error("Vui lòng đăng nhập lại.");
      setData(
        await action(
          new PicketApiClient(
            process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080",
          ),
          session.access_token,
        ),
      );
    } catch {
      setError(
        "Không thể cập nhật thanh toán. Vui lòng thử lại; không tạo đơn mới nếu đang có đơn chờ.",
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  // A link that runs out is re-read at PayOS by the server before it is
  // treated as expired, so last-second payments are not lost.
  useEffect(() => {
    const overdue = data.orders.find(
      (o) =>
        o.status === "pending" &&
        paymentOrderPhase(o, now) === "verifying" &&
        !verified.current.has(o.id),
    );
    if (!overdue || inFlight.current) return;
    verified.current.add(overdue.id);
    void run((api, token) => api.paymentAction(token, overdue.id, "refresh"));
  }, [data, now]);
  const open = openPaymentOrder(data.orders, now);
  return (
    <section className="data-panel payment-panel" aria-busy={busy}>
      <h2>Thanh toán qua PayOS</h2>
      <p>
        Thanh toán trước theo kỳ; quyền sử dụng được cập nhật sau khi hệ thống
        xác minh tiền nhận.
      </p>
      {error && <p role="alert">{error}</p>}
      {!data.catalog.length && <p>Các gói PayOS chưa mở bán.</p>}
      {data.catalog.map((plan) => (
        <p key={plan.sku} className="payment-offer">
          <strong>
            {plan.tier.toUpperCase()} ·{" "}
            {plan.months === 12 ? "1 năm" : "1 tháng"} ·{" "}
            {formatVnd(plan.amount)}
          </strong>{" "}
          <button
            className="button primary"
            disabled={busy || paid}
            onClick={() => {
              if (
                open &&
                !window.confirm(
                  "Link thanh toán đang mở sẽ bị hủy. Mỗi lần mua dùng một link mới có hạn 15 phút. Tiếp tục?",
                )
              )
                return;
              void run((api, token) => {
                const key = keys.current.get(plan.sku) ?? crypto.randomUUID();
                keys.current.set(plan.sku, key);
                return api
                  .paymentCheckout(token, plan.sku, key)
                  .then((result) => {
                    // Each successful purchase gets a fresh key (new orderCode).
                    keys.current.delete(plan.sku);
                    return result;
                  });
              });
            }}
          >
            Tạo thanh toán
          </button>
        </p>
      ))}
      <h3>Lịch sử thanh toán</h3>
      {!data.orders.length && <p>Chưa có đơn thanh toán.</p>}
      {data.orders.map((order) => (
        <article
          key={order.id}
          style={{ borderTop: "1px solid var(--line)", padding: "1rem 0" }}
        >
          <strong>
            #{order.order_code} · {formatVnd(order.amount)} ·{" "}
            {PAYMENT_ORDER_PHASE_LABELS[paymentOrderPhase(order, now)]}
          </strong>
          <p>
            {new Date(order.created_at).toLocaleString("vi-VN")} · {order.sku}
          </p>
          {order.status === "paid" && (
            <p>
              Gói đã được ghi nhận. Tải lại trang để xem quyền lợi mới nhất.
            </p>
          )}
          {order.status === "review" && (
            <p>
              Khoản tiền cần được đối soát. Vui lòng liên hệ hỗ trợ kèm mã đơn.
            </p>
          )}
          {paymentOrderPhase(order, now) === "verifying" && (
            <p>Link đã hết hạn. Đang kiểm tra lại với PayOS…</p>
          )}
          {paymentOrderPhase(order, now) === "pending" && (
            <>
              <p role="timer" aria-live="off">
                Link hết hạn sau{" "}
                <strong>
                  {formatPaymentCountdown(paymentSecondsLeft(order, now))}
                </strong>
              </p>
              {order.checkout_url && (
                <a
                  className="button primary"
                  href={order.checkout_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Mở thanh toán
                </a>
              )}{" "}
              <button
                className="button secondary"
                disabled={busy}
                onClick={() =>
                  void run((api, token) =>
                    api.paymentAction(token, order.id, "refresh"),
                  )
                }
              >
                Kiểm tra thanh toán
              </button>{" "}
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => {
                  if (
                    window.confirm(
                      "Hủy link thanh toán này? Thao tác này không hoàn tiền.",
                    )
                  )
                    void run((api, token) =>
                      api.paymentAction(token, order.id, "cancel"),
                    );
                }}
              >
                Hủy link
              </button>
            </>
          )}
        </article>
      ))}
    </section>
  );
}
