import assert from "node:assert/strict";
import test from "node:test";
import type { ReceiptRecord, Transaction } from "@picket/domain";
import { selectReceiptReviews, selectReviewInbox } from "./review-inbox";
const row = (id: string, patch: Partial<Transaction> = {}): Transaction => ({ id, title: "Coffee", amount: 100, kind: "expense", accountId: "wallet", categoryId: "food", occurredAt: "2026-10-17T01:00:00Z", ...patch } as Transaction);
const receipt = (id: string, patch: Partial<ReceiptRecord> = {}): ReceiptRecord => ({ id, merchant: "Shop", detectedTotal: 100, status: "confirmed", reviewRequired: false, transactionId: null, ...patch } as ReceiptRecord);

test("receipt review includes explicit flag or status, including unlinked receipts", () => {
  const rows = [receipt("flag", { reviewRequired: true }), receipt("status", { status: "review_required" }), receipt("done"), receipt("failed", { status: "failed" })];
  assert.deepEqual(selectReceiptReviews(rows).map(r => r.id), ["flag", "status"]);
});

test("processing receipts are not offered for review before OCR finishes", () => {
  assert.deepEqual(selectReceiptReviews([receipt("busy", { reviewRequired: true, status: "processing" })]), []);
});

test("confirmed receipt disappears after a refreshed response, without mutating input", () => {
  const pending = receipt("pending", { reviewRequired: true, status: "review_required" });
  assert.equal(selectReceiptReviews([pending]).length, 1);
  assert.equal(selectReceiptReviews([{ ...pending, reviewRequired: false, status: "confirmed" }]).length, 0);
  assert.equal(pending.status, "review_required");
});

test("receipt reviews preserve API order and do not require a recognized total or merchant", () => {
  const missing = receipt("missing", { status: "review_required", merchant: null, detectedTotal: null });
  assert.deepEqual(selectReceiptReviews([missing, receipt("second", { reviewRequired: true })]).map(r => r.id), ["missing", "second"]);
});

test("review keeps input order and prioritizes uncategorized over duplicate", () => {
  const rows = [row("a"), row("b", { title: " COFFEE " }), row("c", { categoryId: null }), row("d", { categoryId: "other" }), row("transfer", { kind: "transfer" })];
  const result = selectReviewInbox(rows, new Set(["other"]));
  assert.deepEqual(result.map(({ item, reason }) => [item.id, reason]), [["a", "Nghi trùng · kiểm tra trước khi lưu trữ"], ["b", "Nghi trùng · kiểm tra trước khi lưu trữ"], ["c", "Cần phân loại"], ["d", "Cần phân loại"]]);
});

test("duplicates require same wallet, kind, amount and less than 24 hours", () => {
  const rows = [row("a"), row("day", { occurredAt: "2026-10-18T01:00:00Z" }), row("wallet", { accountId: "other" }), row("amount", { amount: 101 }), row("kind", { kind: "income" })];
  assert.deepEqual(selectReviewInbox(rows, new Set()), []);
  assert.deepEqual(selectReviewInbox([rows[0], row("near", { occurredAt: "2026-10-18T00:59:59Z" })], new Set()).map(r => r.item.id), ["a", "near"]);
});

test("sorts time inside each group without modifying the source", () => {
  const rows = [row("late", { occurredAt: "2026-10-20T00:00:00Z" }), row("early"), row("near", { occurredAt: "2026-10-17T02:00:00Z" })];
  assert.deepEqual(selectReviewInbox(rows, new Set()).map(r => r.item.id), ["early", "near"]);
  assert.equal(rows[0].id, "late");
});

test("normalizes titles only once per row even on a 1000-row history", () => {
  let calls = 0;
  // Instrument the input's normalization path, not the global String prototype.
  const rows = Array.from({ length: 1000 }, (_, i) => row(String(i), {
    title: { trim: () => ({ toLocaleLowerCase: () => { calls++; return `unique ${i}`; } }) } as unknown as string,
  }));
  assert.equal(selectReviewInbox(rows, new Set()).length, 0);
  assert.equal(calls, 1000);
});
