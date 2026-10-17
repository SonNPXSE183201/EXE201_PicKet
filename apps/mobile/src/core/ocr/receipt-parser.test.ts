import assert from "node:assert/strict";
import test from "node:test";

import { receiptCorpus } from "./fixtures/receipt-corpus";
import {
  parseReceiptLineItems,
  parseReceiptLines,
  parseReceiptMoney,
  parseReceiptText,
} from "./receipt-parser";

test("normalizes common Vietnamese receipt money formats", () => {
  assert.equal(parseReceiptMoney("45.000 đ"), 45000);
  assert.equal(parseReceiptMoney("1,250,000 VND"), 1250000);
  assert.equal(parseReceiptMoney("12,50"), 12);
  assert.equal(parseReceiptMoney("không có"), null);
});

test("extracts merchant, total and date from a Vietnamese receipt", () => {
  const result = parseReceiptLines([
    { text: "CA PHE PICKET", top: 10, bottom: 35 },
    { text: "Ngay: 08/10/2026", top: 45, bottom: 70 },
    { text: "Ca phe sua", top: 100, bottom: 125 },
    { text: "TONG CONG 45.000 VND", top: 180, bottom: 210 },
  ]);

  assert.equal(result.merchant, "CA PHE PICKET");
  assert.equal(result.amount, 45000);
  assert.equal(result.date, "2026-10-08T00:00:00.000Z");
  assert.equal(result.needsReview, false);
});

test("rejects subtotal and chooses the payable total", () => {
  const result = parseReceiptLines([
    { text: "PICKET MART", top: 5, bottom: 30 },
    { text: "Tam tinh 100.000", top: 100, bottom: 125 },
    { text: "Tien thua 20.000", top: 130, bottom: 155 },
    { text: "Thanh toan 120.000", top: 180, bottom: 210 },
  ]);

  assert.equal(result.amount, 120000);
  assert.equal(result.needsReview, false);
});

test("extracts a payable amount printed before a terminal due label", () => {
  const result = parseReceiptText(`PICKET CAFE
SUBTOTAL
503,000
PB1
52,815
SVC CHRG
25,150
580,965
DUE`);

  assert.equal(result.amount, 580965);
  assert.equal(result.needsReview, false);
});

test("recognizes a Vietnamese total label with dropped OCR vowels", () => {
  const result = parseReceiptText(`CUA HANG DEMO
Ngày bán: 14/06/2026
Tm tính:
80.000 VND
VAT:
0 VND
Tng cng:
80.000 VND`);

  assert.equal(result.amount, 80000);
  assert.equal(result.needsReview, false);
});

test("prefers rounded total over an earlier generic total", () => {
  const result = parseReceiptText(`BOOK STORE
Total
3.00
Rounding Adjustment
0.00
Rounded Total (RM)
9.00
Cash
10.00`);

  assert.equal(result.amount, 9);
  assert.equal(result.needsReview, false);
});

test("skips OCR-damaged receipt headings when choosing a Vietnamese merchant", () => {
  const result = parseReceiptText(`BIN LAI BAN HANG
CUA HANG DEMO
MST: 0000000000
Ngay ban: 14/06/2026
Tong cong: 320.000 VND`);

  assert.equal(result.merchant, "CUA HANG DEMO");
});

test("skips address lines when choosing a merchant", () => {
  const result = parseReceiptText(`tan woon yann
BOOK TA .K (TAMaN Daya)SDN BHD
789417-W
NO.5: 55,57 & 59, JALAN SAGU 18
TAMAN DAYA
81100 JOHOR BAHRU
Date
25/12/2018
Round d Total (RM)
9.00`);

  assert.equal(result.merchant, "BOOK TA .K (TAMaN Daya)SDN BHD");
});

test("requires manual review when no payable total is found", () => {
  const result = parseReceiptLines([
    { text: "Picket", top: 5, bottom: 30 },
    { text: "Chao mung tro lai", top: 40, bottom: 65 },
    { text: "Email", top: 75, bottom: 100 },
  ]);

  assert.equal(result.merchant, "Picket");
  assert.equal(result.amount, null);
  assert.equal(result.needsReview, true);
  assert.equal(result.reviewReason, "Không tìm thấy tổng tiền cần thanh toán.");
});

test("requires manual review when OCR returns no text", () => {
  const result = parseReceiptLines([]);

  assert.equal(result.recognizedLineCount, 0);
  assert.equal(result.needsReview, true);
  assert.equal(result.reviewReason, "Không nhận diện được chữ trong ảnh.");
});

test("extracts simple and quantity-based receipt line items", () => {
  const result = parseReceiptLineItems([
    { text: "Ca phe sua 45.000", confidence: 0.91 },
    { text: "Banh mi 2 x 20.000 40.000", confidence: 0.88 },
    { text: "TONG CONG 85.000", confidence: 0.99 },
    { text: "VAT 8% 6.800", confidence: 0.95 },
  ]);
  assert.deepEqual(result, [
    { name: "Ca phe sua", quantity: 1, unitPrice: 45000, total: 45000, confidence: 0.91 },
    { name: "Banh mi", quantity: 2, unitPrice: 20000, total: 40000, confidence: 0.88 },
  ]);
});

test("ignores malformed prices and inconsistent quantity totals", () => {
  const result = parseReceiptLineItems([
    { text: "San pham khong co gia" },
    { text: "Tra sua 2 x 20.000 50.000" },
  ]);
  assert.deepEqual(result, []);
});

test("does not turn receipt reference numbers into line items", () => {
  const result = parseReceiptLineItems([
    { text: "So chung tu: RC-0099", confidence: 0.99 },
    { text: "Số chứng từ: HD-12345", confidence: 0.98 },
    { text: "Ca phe sua 45.000", confidence: 0.91 },
  ]);
  assert.deepEqual(result.map((item) => item.name), ["Ca phe sua"]);
});

for (const sample of receiptCorpus) {
  test(`parses receipt corpus: ${sample.name}`, () => {
    const result = parseReceiptText(sample.rawText);

    assert.equal(result.merchant, sample.expected.merchant);
    assert.equal(result.amount, sample.expected.amount);
    assert.equal(result.date, sample.expected.date);
    assert.deepEqual(
      result.lineItems.map((item) => item.name),
      sample.expected.lineItemNames,
    );
    assert.equal(result.needsReview, false);
  });
}
