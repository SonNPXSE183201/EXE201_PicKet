import assert from "node:assert/strict";
import test from "node:test";
import { parseReceiptLines, parseReceiptText, type ReceiptDraft } from "./receipt-parser";

const rows = (draft: ReceiptDraft) => draft.lineItems.map(({ name, quantity, unitPrice, total }) =>
  ({ name, quantity, unitPrice, total }));
const reverseHeaders = ["Thành tiền", "BH", "Đơn giá", "SL", "Tên sản phẩm"];
const product = "Chuột không dây Razer Viper V3 Pro SE";

test("reversed separate headers map warranty independently from quantity and prices", () => {
  const draft = parseReceiptText([
    ...reverseHeaders, "2,370,000 đ", "24", "2,370,000 đ", "1", product,
    "Tổng tiền 2,370,000 d",
  ].join("\n"));
  assert.deepEqual(rows(draft), [{ name: product, quantity: 1, unitPrice: 2370000, total: 2370000 }]);
  assert.equal(draft.amount, 2370000);
  assert.equal(draft.merchant, null);
  assert.deepEqual(rows(parseReceiptText(draft.rawText)), rows(draft));
});

test("normal separate headers preserve names with digits and optional unit/discount cells", () => {
  const draft = parseReceiptText([
    "CỬA HÀNG MẪU", "Ngày: 07/11/2026",
    "Tên sản phẩm", "ĐVT", "SL", "Đơn giá", "CK", "Thành tiền",
    "Nước 7UP", "Lon", "3", "12.000", "0%", "36.000",
    "Tổng thanh toán 36.000",
  ].join("\n"));
  assert.deepEqual(rows(draft), [{ name: "Nước 7UP", quantity: 3, unitPrice: 12000, total: 36000 }]);
  assert.equal(draft.amount, 36000);
  assert.equal(draft.merchant, "CỬA HÀNG MẪU");
  assert.equal(draft.date, "2026-11-07T00:00:00.000Z");
});

test("metadata tables do not supply product columns", () => {
  const draft = parseReceiptText("Mã đơn hàng\nNgày\n123456\n07/11/2026\nTổng tiền 250000");
  assert.deepEqual(draft.lineItems, []);
  assert.equal(draft.amount, 250000);
});

for (const order of ["column", "row"] as const) {
  test(`multiple products follow ${order} ordering under separate headers`, () => {
    const values = order === "column"
      ? ["Bàn phím 3 Miền", "Chuột 7UP", "2", "1", "120000", "85000", "240000", "85000"]
      : ["Bàn phím 3 Miền", "2", "120000", "240000", "Chuột 7UP", "1", "85000", "85000"];
    const draft = parseReceiptText([
      "Tên sản phẩm", "SL", "Đơn giá", "Thành tiền", ...values, "Tổng tiền 325000",
    ].join("\n"));
    assert.deepEqual(rows(draft), [
      { name: "Bàn phím 3 Miền", quantity: 2, unitPrice: 120000, total: 240000 },
      { name: "Chuột 7UP", quantity: 1, unitPrice: 85000, total: 85000 },
    ]);
  });
}

for (const badPrice of ["12O000", "1.23.456", "12,50", ""]) {
  test(`corrupted or missing price ${JSON.stringify(badPrice)} is not repaired from warranty/total`, () => {
    const draft = parseReceiptText([
      ...reverseHeaders, "120000", "24", badPrice, "1", "Chuột không dây", "Tổng tiền 120000",
    ].join("\n"));
    assert.deepEqual(draft.lineItems, []);
  });
}

test("observed inconsistent arithmetic warns rather than changing the numbers", () => {
  const draft = parseReceiptText([
    ...reverseHeaders, "120000", "24", "120000", "2", "Chuột không dây", "Tổng tiền 120000",
  ].join("\n"));
  assert.deepEqual(draft.lineItems, []);
  assert.equal(draft.needsReview, true);
  assert.match(draft.reviewReason ?? "", /không khớp/);
});

test("line item arithmetic does not invent a payable total", () => {
  const draft = parseReceiptText([
    ...reverseHeaders, "120000", "24", "120000", "1", "Chuột không dây",
  ].join("\n"));
  assert.deepEqual(rows(draft), [{ name: "Chuột không dây", quantity: 1, unitPrice: 120000, total: 120000 }]);
  assert.equal(draft.amount, null);
});

test("free products require explicit zero prices and an observed positive quantity", () => {
  const draft = parseReceiptText([
    "Tên sản phẩm", "SL", "Đơn giá", "Thành tiền", "Quà kèm mẫu", "1", "0", "0",
  ].join("\n"));
  assert.deepEqual(rows(draft), [{ name: "Quà kèm mẫu", quantity: 1, unitPrice: 0, total: 0 }]);
});

test("a metadata value inside a product header table remains excluded", () => {
  const draft = parseReceiptText([
    "Tên sản phẩm", "SL", "Đơn giá", "Thành tiền", "Mã đơn hàng 123456", "1", "120000", "120000",
  ].join("\n"));
  assert.deepEqual(draft.lineItems, []);
});

test("observed low-confidence table cells lower confidence on the assembled item", () => {
  const lines = [...reverseHeaders, "120000", "24", "120000", "1", "Chuột không dây"]
    .map(text => ({ text, confidence: text === "1" ? 0.5 : 0.95 }));
  const draft = parseReceiptLines(lines);
  assert.equal(draft.lineItems.length, 1);
  assert.ok(draft.lineItems[0].confidence <= 0.5);
  assert.equal(draft.needsReview, true);
});
