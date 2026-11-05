import type { PaymentOrder } from "./billing";

/**
 * What a customer or admin should see for a PayOS order.
 * `pending` only exists while the 15-minute link is still open; once the
 * deadline passes the order is `verifying` until the server has re-read the
 * link at PayOS and recorded `paid`, `expired` or `cancelled`.
 */
export type PaymentOrderPhase =
  | "pending"
  | "verifying"
  | "paid"
  | "expired"
  | "cancelled"
  | "review";

export const PAYMENT_ORDER_PHASE_LABELS: Record<PaymentOrderPhase, string> = {
  pending: "Chờ thanh toán",
  verifying: "Đang xác minh",
  paid: "Đã thanh toán",
  expired: "Hết hạn",
  cancelled: "Đã hủy",
  review: "Cần đối soát",
};

export function paymentOrderPhase(
  order: Pick<PaymentOrder, "status" | "expires_at">,
  now: number,
): PaymentOrderPhase {
  if (order.status !== "pending") return order.status;
  return paymentSecondsLeft(order, now) > 0 ? "pending" : "verifying";
}

export function paymentSecondsLeft(
  order: Pick<PaymentOrder, "expires_at">,
  now: number,
): number {
  const deadline = Date.parse(order.expires_at);
  if (!Number.isFinite(deadline)) return 0;
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}

/** `mm:ss`, e.g. `14:59`. */
export function formatPaymentCountdown(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  return `${String(minutes).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

/** The order whose link is still open, if any (newest first). */
export function openPaymentOrder<T extends Pick<PaymentOrder, "status" | "expires_at" | "checkout_url">>(
  orders: readonly T[],
  now: number,
): T | undefined {
  return orders.find(
    (order) => order.checkout_url && paymentOrderPhase(order, now) === "pending",
  );
}
