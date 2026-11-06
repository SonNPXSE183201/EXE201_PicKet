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
  assert.equal(parseReceiptMoney("12,50"), null);
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

test("links one nearby amount above an explicit payable label when OCR boxes do not overlap", () => {
  const result = parseReceiptLines([
    { text: "rhanh tean:", left: 54, right: 90, top: 244, bottom: 252, confidence: 0.55 },
    { text: "17 925 000o", left: 165, right: 198, top: 229, bottom: 239, confidence: 0.48 },
  ]);

  assert.equal(result.amount, 17925000);
  assert.equal(result.needsReview, true);
});

test("does not guess between two nearby amount candidates for a payable label", () => {
  const result = parseReceiptLines([
    { text: "Thanh toán:", left: 54, right: 100, top: 244, bottom: 252, confidence: 0.75 },
    { text: "17 925 000", left: 165, right: 198, top: 229, bottom: 239, confidence: 0.75 },
    { text: "17 900 000", left: 165, right: 198, top: 257, bottom: 267, confidence: 0.75 },
  ]);

  assert.equal(result.amount, null);
  assert.equal(result.needsReview, true);
});

test("does not replace an unreadable inline total with a nearby small number", () => {
  const result = parseReceiptLines([
    { text: "Teng thanh toán", left: 51, right: 106, top: 226, bottom: 233, confidence: 0.63 },
    { text: "14", left: 158, right: 181, top: 219, bottom: 222, confidence: 0.43 },
    { text: "18.771,2noa", left: 142, right: 183, top: 228, bottom: 233, confidence: 0.44 },
  ]);

  assert.equal(result.amount, null);
  assert.equal(result.needsReview, true);
});

test("recognizes a noisy payable label and joins its spatially aligned amount", () => {
  const result = parseReceiptLines([
    { text: "PICKET MART", left: 10, right: 110, top: 0, bottom: 20 },
    { text: "30/08/2026", left: 10, right: 110, top: 25, bottom: 40 },
    { text: "Iong thant toan", left: 10, right: 135, top: 150, bottom: 170 },
    { text: "54 000", left: 180, right: 240, top: 150, bottom: 170 },
  ]);

  assert.equal(result.amount, 54000);
});

test("does not overstate total confidence beyond a weakly recognized value token", () => {
  const result = parseReceiptLines([
    { text: "PICKET MART", left: 10, right: 110, top: 0, bottom: 20, confidence: 0.98 },
    { text: "Tổng thanh toán", left: 10, right: 130, top: 100, bottom: 120, confidence: 0.91 },
    { text: "420.000", left: 150, right: 205, top: 100, bottom: 120, confidence: 0.62 },
  ]);

  assert.equal(result.amount, 420000);
  assert.ok(result.amountConfidence !== null && result.amountConfidence <= 0.62);
  assert.equal(result.needsReview, true);
});

test("recognizes an OCR-damaged generic total label without guessing a damaged amount", () => {
  const result = parseReceiptText("PICKET STORE\n30/08/2026\nrOng tiêni\n513.238");
  assert.equal(result.amount, 513238);

  const damaged = parseReceiptText("PICKET STORE\n30/08/2026\nTÔNG (GỒH VAT)\n66,D00");
  assert.equal(damaged.amount, null);
  assert.equal(damaged.needsReview, true);
});

test("recovers a payable amount when ML Kit confuses two label letters and trails the value with o", () => {
  const result = parseReceiptText("PICKET MART\n30/08/2026\nrhanh tean:\n17 925 000o");
  assert.equal(result.amount, 17_925_000);
  assert.equal(result.needsReview, false);
});

test("prefers a noisy payable amount over an ambiguous OCR total label", () => {
  const result = parseReceiptText(`PICKET STORE
30/08/2026
Teng cộng 173,800
Tng tiến 173,500
Tiền khách trả 173,500
Tiền thừa 0`);
  assert.equal(result.amount, 173500);
});

test("keeps a receipt's product subtotal below its noisy payable total", () => {
  const result = parseReceiptText(`CÔNG TY DEMO
10/02/2023
Tivi Samsung 1 x 12000000 ~ 12000000
Cộng tiền 12.000.000
Thuế suất GTGT: 10 %, Tiền thuế GTGT: 1.200.000
Tông cộng tiến thanh toán 13.200.000`);

  assert.equal(result.amount, 13200000);
});

test("does not promote a product label that resembles a damaged total", () => {
  const result = parseReceiptText(`PICKET STORE
30/08/2026
Rong biển 35.000`);

  assert.equal(result.amount, null);
  assert.equal(result.lineItems[0]?.name, "Rong biển");
});

test("does not treat a similarly spelled product as a total label", () => {
  const result = parseReceiptLineItems([{ text: "Rong biển khô 35.000" }]);
  assert.deepEqual(result.map((item) => item.name), ["Rong biển khô"]);
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
    { name: "Ca phe sua", quantity: 1, unitPrice: 45000, total: 45000, confidence: 0.65 },
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
    assert.equal(result.needsReview, true, "unprinted quantities require review");
  });
}

test("rejects malformed grouping and never merges two total columns", () => {
  for (const value of ["12.34.567", "1,2,3", "100.000 90.000", "-45.000"]) assert.equal(parseReceiptMoney(value), null, value);
  const result=parseReceiptText("PICKET STORE\n28/10/2026\nTổng thanh toán 100.000 90.000");
  assert.equal(result.amount,null);
  assert.equal(result.needsReview,true);
});
test("conflicting strong totals always require manual review", () => {
 const result=parseReceiptText("PICKET STORE\n28/10/2026\nTổng cộng 100.000\nThành tiền thanh toán 90.000");
 assert.equal(result.needsReview,true);
});

test("matches a slanted POS payable row without reading an adjacent subtotal",()=>{
 const draft=parseReceiptLines([
  {text:"PICKET CAFE",left:10,right:150,top:0,bottom:20},
  {text:"28/10/2026",left:10,right:120,top:30,bottom:45},
  {text:"Tống cộng:",left:45,right:87,top:157,bottom:166},
  {text:"1710 000",left:164,right:203,top:149,bottom:160},
 ]);
 assert.equal(draft.amount,1710000);
});
test("recognizes OCR total VAT label and excludes item quantity totals",()=>{
 const draft=parseReceiptText("PICKET STORE\n28/10/2026\nTotal Item(s) Qty: 1\nTota/(VAT): 11,000 VND\nCash: 20,000 VND\nCHANGE DUE: 9,000 VND");
 assert.equal(draft.amount,11000);
});

test("receipt metadata phone and document number are never product rows",()=>{
 const result=parseReceiptLineItems([{text:"ĐT: 0974.300.007 - 0909.191.195"},{text:"Số: 021900003"},{text:"Cà phê đá 10,000"}]);
 assert.deepEqual(result.map(item=>item.name),["Cà phê đá"]);
});

test("excludes payment methods, headers, time metadata, unit fragments and damaged digit lines from products", () => {
  const result = parseReceiptLineItems([
    { text: "Thanh tin: 50.000" },
    { text: "Gis ra 50.000" },
    { text: "1- Cái 25.000" },
    { text: "125 oDO 125.000" },
    { text: "125CCO 125.000" },
    { text: "83,sco 83.500" },
    { text: "Trà sen vàng 45.000" },
    { text: "Phải thanh toán 50.000" },
    { text: "Tiền cà thẻ 50.000" },
  ]);
  assert.deepEqual(result.map((item) => item.name), ["Trà sen vàng"]);
});

test("damaged total spans and item-count total lines never become truncated payable amounts", () => {
  for (const raw of [
    "SHOP\nHÓA ĐƠN\n29/10/2026\nTrà xanh 10000\nTổng 12O 900",
    "SHOP\nHÓA ĐƠN\n29/10/2026\nTrà xanh 10000\nTổng 12 O00",
    "SHOP\nHÓA ĐƠN\n29/10/2026\nTrà xanh 10000\n3 san phn tong cong\nTỔNG (gồm VAT) 68O00",
  ]) {
    const draft = parseReceiptText(raw);
    assert.equal(draft.amount, null, raw);
    assert.equal(draft.needsReview, true, raw);
  }
  const validWithItemCount = parseReceiptText(
    "SHOP\nHÓA ĐƠN\n29/10/2026\n3 san phn tong cong\nTrà xanh 10,000\nTỔNG (GỒM VAT) 66,000",
  );
  assert.equal(validWithItemCount.amount, 66000);
  const isoDraft = parseReceiptText(
    "NGÔ GIA\nPhiếu Thanh Toán\nNgày tạo 2026-08-10 21:00\nMã đơn hàng 123456\nMã chứng từ 654321\nSố đơn hàng 987654\nOrder ID 112233\nBill No 445566\nCa dang k 2600\nGiá đăng ký 2500\nBí Đao Chanh 2 x 27000 | 54000\nMì 3 Miền 1 x 10000 | 10000\n7UP Lon 330ml 1 x 12000 | 12000\nMá đùi gà 1 x 45000 | 45000\nSò điệp nướng 1 x 60000 | 60000\nTổng tiền: 54,000đ",
  );
  assert.equal(isoDraft.date, "2026-08-10T00:00:00.000Z");
  assert.equal(isoDraft.amount, 54000);
  assert.deepEqual(isoDraft.lineItems.map((i) => i.name), ["Bí Đao Chanh", "Mì 3 Miền", "7UP Lon 330ml", "Má đùi gà", "Sò điệp nướng"]);
});
