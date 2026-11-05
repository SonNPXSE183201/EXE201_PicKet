import assert from "node:assert/strict";
import test from "node:test";
import { parseReceiptLines, parseReceiptText, type ReceiptTextLine } from "./receipt-parser";

const cell = (text: string, left: number, top: number, width = 80): ReceiptTextLine =>
  ({ text, left, right: left + width, top, bottom: top + 16, confidence: .95 });

test("an accented Quán merchant is distinct from a Quận address", () => {
  assert.equal(parseReceiptText("QUÁN ĂN MẪU\n06/09/2022\nTổng 21000").merchant, "QUÁN ĂN MẪU");
  for (const address of ["Quận 7", "Quận Tân Bình", "Quan Tan Binh"]) {
    assert.equal(parseReceiptText(`${address}\n06/09/2022\nTổng 21000`).merchant, null, address);
  }
});

test("a printed bare CỘNG is a total, while merchandise subtotals remain excluded", () => {
  const r = parseReceiptText("CỬA HÀNG MẪU\n06/09/2022\nBút mực 1 x 21000 | 21000\nCỘNG: 21.000");
  assert.equal(r.amount, 21000);
  assert.deepEqual(r.lineItems.map(i => i.name), ["Bút mực"]);
  assert.equal(parseReceiptText("CỬA HÀNG MẪU\nCộng tiền hàng 21000\nThuế chưa xác định").amount, null);
  assert.equal(parseReceiptText("CỬA HÀNG MẪU\nCỘNG 21O000").amount, null);
  assert.equal(parseReceiptText("CỬA HÀNG MẪU\nCỘNG 1.23.456").amount, null);
});

test("bare aggregate labels use bounded geometry and preserve raw evidence", () => {
  const r = parseReceiptLines([cell("CỬA HÀNG MẪU", 10, 10, 180), cell("CỘNG", 10, 200), cell("21000", 300, 200)]);
  assert.equal(r.amount, 21000);
  assert.equal(parseReceiptText(r.rawText).amount, 21000);
  assert.equal(parseReceiptLines([cell("CỘNG", 10, 200), cell("21000", 300, 500)]).amount, null);
  assert.equal(parseReceiptText("Cộng hòa xã hội chủ nghĩa Việt Nam\nĐiện thoại 0901234567").amount, null);
});

test("already-paid and tender rows never replace the purchase total or become products", () => {
  const r = parseReceiptText("CỬA HÀNG MẪU\n06/09/2022\nBút mực 2 x 21000 | 42000\nTổng 42000\nĐã thanh toán 20000\nKhách đưa 50000\nTrả lại 8000");
  assert.equal(r.amount, 42000);
  assert.deepEqual(r.lineItems.map(i => i.name), ["Bút mực"]);
  assert.equal(parseReceiptText("CỬA HÀNG MẪU\nĐã thanh toán 20000").amount, null);
});

// Synthetic guards only. The 15 historical corpus negatives are unavailable.
const metadata = [
  "CashierName: Minh 21000", "N/V: Nhân viên 21000", "KH: Nguyễn An 21000",
  "Đ/C: Đường Một 21000", "Số order: 21000", "Họ tên người mua hàng: Nguyễn An 21000",
  "Số tài khoản: 1234567890", "Mã hóa đơn: 1234567890", "SĐT: 0901234567",
  "Địa chỉ: 123 Nguyễn Trãi 21000", "Bàn 12", "Store: HN 2025",
  "Terminal: 02", "Thu ngân: Minh 21000", "Mã tham chiếu: 1234567890",
];
test("15 synthetic metadata hard negatives cannot become merchants or rows", () => {
  for (const text of metadata) {
    const r = parseReceiptText(`${text}\nHÓA ĐƠN\n06/09/2022\nTổng 21000`);
    assert.equal(r.merchant, null, text);
    assert.deepEqual(r.lineItems, [], text);
    const headerOnly = parseReceiptText(`${text.replace(/\s+21000$/, "")}\nHÓA ĐƠN\n06/09/2022\nTổng 21000`);
    assert.equal(headerOnly.merchant, null, text);
  }
});

test("English named-month receipt dates retain the source confidence", () => {
  for (const text of ["Date: Tue 06 Sep 2022 09:15:20", "DATE September 6, 2022", "Date: 6-Sept-2022"]) {
    const r = parseReceiptLines([{ text: "CỬA HÀNG MẪU" }, { text, confidence: .61 }, { text: "Tổng 21000" }]);
    assert.equal(r.date, "2022-09-06T00:00:00.000Z", text);
    assert.equal(r.dateConfidence, .61);
  }
});

test("transaction dates outrank expiry, birthday and signature dates", () => {
  const r = parseReceiptText("CỬA HÀNG MẪU\nHSD: 01/01/2027\nNgày sinh: 02/02/2000\nNgày bán: 06/09/2022\nĐã ký ngày 07/09/2022\nTổng 21000");
  assert.equal(r.date, "2022-09-06T00:00:00.000Z");
  assert.equal(parseReceiptText("CỬA HÀNG MẪU\nExpiry: 01/01/2027\nTổng 21000").date, null);
  assert.equal(parseReceiptText("CỬA HÀNG MẪU\nHạn sử dụng: 01/01/2027\nTổng 21000").date, null);
});

test("named-month dates validate the calendar and never match product model names", () => {
  for (const text of ["Date: 31 Feb 2023", "Date: 6 Sep 2099", "Date: 06 Sepp 2022", "Giày mẫu 6 Sep 2022 21000"]) {
    assert.equal(parseReceiptText(`CỬA HÀNG MẪU\n${text}\nTổng 21000`).date, null, text);
  }
});

function restaurantTable(): ReceiptTextLine[] {
  return [cell("QUÁN MẪU", 10, 10, 150), cell("Tên món", 10, 70, 130), cell("SL", 200, 70, 25),
    cell("ĐG", 260, 70, 70), cell("TT", 380, 70, 90), cell("Bánh gạo", 10, 110, 130),
    cell("2", 200, 110, 25), cell("17000", 260, 110, 70), cell("34000", 380, 110, 90),
    cell("Tổng thanh toán 34000", 10, 160, 250)];
}

test("Tên món and TT are column aliases only inside a proven table", () => {
  const r = parseReceiptLines(restaurantTable());
  assert.deepEqual(r.lineItems.map(({ name, quantity, unitPrice, total }) => ({ name, quantity, unitPrice, total })),
    [{ name: "Bánh gạo", quantity: 2, unitPrice: 17000, total: 34000 }]);
  assert.equal(r.lineItems[0].confidence, .95);
  assert.equal(parseReceiptText(r.rawText).lineItems[0].quantity, 2);
  assert.equal(parseReceiptText("QUÁN MẪU\nTT 34000").amount, null);
});

test("word-level merged restaurant headers retain their column roles", () => {
  const lines = restaurantTable();
  const header = { ...cell("Tên món SL ĐG TT", 10, 70, 460), elements: lines.slice(1, 5).map(l => ({
    text: l.text, left: l.left!, right: l.right!, top: l.top!, bottom: l.bottom!, confidence: l.confidence,
  })) };
  const r = parseReceiptLines([lines[0], header, ...lines.slice(5)]);
  assert.equal(r.lineItems[0]?.quantity, 2);
  assert.equal(r.lineItems[0]?.unitPrice, 17000);
  assert.equal(r.lineItems[0]?.confidence, .95);
});

test("a missing table unit price never becomes a rounded invented integer", () => {
  const lines = restaurantTable().map(l => ({ ...l, text: l.text === "Tên món" ? "Mặt hàng" : l.text === "ĐG" ? "Đơn giá" :
    l.text === "TT" ? "Thành tiền" : l.text === "34000" ? "34001" : l.text === "Tổng thanh toán 34000" ? "Tổng thanh toán 34001" : l.text }))
    .filter(l => l.text !== "17000");
  const r = parseReceiptLines(lines);
  assert.deepEqual(r.lineItems, []);
  assert.equal(r.needsReview, true);
  assert.equal(r.amount, 34001);
});

test("inline arithmetic conflicts keep the observed total and explicitly request review", () => {
  const r = parseReceiptText("CỬA HÀNG MẪU\n06/09/2022\nBút mực 2 x 21000 | 43000\nTổng 43000");
  assert.equal(r.amount, 43000);
  assert.deepEqual(r.lineItems, []);
  assert.equal(r.needsReview, true);
  assert.match(r.reviewReason!, /không khớp/);
});
