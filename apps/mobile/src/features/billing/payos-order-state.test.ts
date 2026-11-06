import assert from "node:assert/strict";
import { test } from "node:test";
import {
  formatPaymentCountdown,
  openPaymentOrder,
  paymentOrderPhase,
  paymentSecondsLeft,
} from "@picket/domain";

const now = Date.parse("2026-11-05T10:00:00Z");
const order = (status: "pending" | "paid" | "expired", minutes: number, link = true) => ({
  status,
  expires_at: new Date(now + minutes * 60_000).toISOString(),
  checkout_url: link ? "https://pay.payos.vn/x" : null,
});

test("pending link counts down 15 minutes as mm:ss", () => {
  assert.equal(paymentSecondsLeft(order("pending", 15), now), 900);
  assert.equal(formatPaymentCountdown(900), "15:00");
  assert.equal(formatPaymentCountdown(59), "00:59");
  assert.equal(formatPaymentCountdown(-3), "00:00");
});

test("overdue pending is verifying, never shown as still payable", () => {
  assert.equal(paymentOrderPhase(order("pending", 1), now), "pending");
  assert.equal(paymentOrderPhase(order("pending", 0), now), "verifying");
  assert.equal(paymentOrderPhase(order("pending", -5), now), "verifying");
  assert.equal(paymentOrderPhase(order("paid", -5), now), "paid");
  assert.equal(paymentOrderPhase(order("expired", 5), now), "expired");
});

test("only an unexpired linked order is open for payment", () => {
  assert.equal(openPaymentOrder([order("pending", -1), order("paid", 5)], now), undefined);
  assert.equal(openPaymentOrder([order("pending", 5, false)], now), undefined);
  const open = order("pending", 5);
  assert.equal(openPaymentOrder([open, order("pending", 10)], now), open);
  assert.equal(paymentSecondsLeft({ expires_at: "invalid" }, now), 0);
});
