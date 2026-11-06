import assert from "node:assert/strict";
import test from "node:test";
import { parseReceiptLines, parseReceiptText, type ReceiptTextLine } from "./receipt-parser";
import { canAttachReceipt } from "./receipt-eligibility";

const cell = (text: string, left: number, top: number, width = 95): ReceiptTextLine =>
  ({ text, left, right: left + width, top, bottom: top + 16 });
function invoice(): ReceiptTextLine[] {
  return [
    cell("PICKET DEMO STORE", 20, 10, 250), cell("07/05/2026", 750, 50),
    cell("Tiền hàng:", 20, 900), cell("Tiền thuế:", 20, 925),
    cell("Tiền thanh toán:", 20, 950, 150),
    cell("Thuế suất 8%", 500, 890), cell("Tổng cộng", 900, 880),
    cell("150.000", 920, 925), cell("12.000", 920, 950), cell("162.000", 920, 975),
  ];
}

test("a skewed VAT summary uses the total column and checked subtotal plus tax", () => {
  const result = parseReceiptLines(invoice());
  assert.equal(result.amount, 162000);
  assert.equal(canAttachReceipt(result), true);
  assert.equal(parseReceiptText(result.rawText).amount, 162000);
  assert.equal(canAttachReceipt(parseReceiptText(result.rawText)), true);
});

test("an inconsistent VAT summary cannot authorize a guessed total", () => {
  const lines = invoice().map(line => line.text === "162.000" ? {...line, text: "172.000"} : line);
  assert.equal(parseReceiptLines(lines).amount, null);
  assert.equal(parseReceiptText(parseReceiptLines(lines).rawText).amount, null);
});

test("an extra amount in the VAT total column requires review", () => {
  assert.equal(parseReceiptLines([...invoice(), cell("99.000", 920, 1000)]).amount, null);
});

test("VAT amount association requires the explicit summary total column", () => {
  assert.equal(parseReceiptLines(invoice().filter(line => line.text !== "Tổng cộng")).amount, null);
});

test("a VAT summary accepts zero tax and decimal currency suffixes", () => {
  const lines = invoice().map(line => line.text === "150.000" ? {...line, text: "150.000,00"} :
    line.text === "12.000" ? {...line, text: "0,00"} :
    line.text === "162.000" ? {...line, text: "150.000,00"} : line);
  assert.equal(parseReceiptLines(lines).amount, 150000);
});


test("table border strokes around VAT labels do not discard the payment summary", () => {
  const lines = invoice().map(line => /Tiền|Tổng cộng/.test(line.text) ? {...line, text: `|${line.text}|`} : line);
  const result = parseReceiptLines(lines);
  assert.equal(result.amount, 162000);
  assert.equal(canAttachReceipt(result), true);
  assert.equal(parseReceiptText(result.rawText).amount, 162000);
});

test("extra words on a VAT label are not stripped to fabricate a recognized heading", () => {
  const lines = invoice().map(line => line.text === "Tiền thuế:" ? {...line, text: "Tạm tính Tiền thuế:"} : line);
  assert.notEqual(parseReceiptLines(lines).amount, 162000);
});

test("payment-method contact numbers never outrank the checked VAT payable total", () => {
  const lines=invoice();
  lines.splice(2,0,{...cell("Hình thức thanh toán: CK / TM / Cấn trừ công nợ ĐT: 0901234567",20,650,850),confidence:0.95});
  const result=parseReceiptLines(lines);
  assert.equal(result.amount,162000);
  assert.equal(parseReceiptText(result.rawText).amount,162000);
});

test("payment instructions without a payable amount do not turn a phone number into money", () => {
  const result=parseReceiptText("PICKET DEMO STORE\nHÓA ĐƠN\nHình thức thanh toán: CK / TM / Cấn trừ công nợ ĐT: 0901234567");
  assert.equal(result.amount,null);
});

test("generic VAT headings cannot become a merchant above the actual company name", () => {
  const result=parseReceiptLines([
    {...cell("GIÁ TRỊ GIA TĂNG",600,10,250),confidence:0.99},
    {...cell("CÔNG TY THƯƠNG MẠI PICKET",20,15,420),confidence:0.7},
    ...invoice().filter(line=>line.text!=="PICKET DEMO STORE"),
  ]);
  assert.equal(result.merchant,"CÔNG TY THƯƠNG MẠI PICKET");
});

function paymentColumns(){return [
 cell("Thuế suất 5%",350,880,130),cell("Thuế suất 8%",600,880,130),
 cell("51.429",400,900),cell("2.571",400,925),cell("54.000",400,950),
 cell("100.000",650,900),cell("8.000",650,925),cell("108.000",650,950),
];}
test("independent payment-column sums can verify an observed total when a VAT component is misread",()=>{
 const lines=invoice().filter(line=>line.text!=="Thuế suất 8%").map(line=>line.text==="150.000"?{...line,text:"160.000"}:line);
 const result=parseReceiptLines([...lines,...paymentColumns()]);
 assert.equal(result.amount,162000);assert.equal(result.needsReview,true);
 assert.equal(parseReceiptText(result.rawText).amount,162000);
});

test("missing primary summary components can use complete independently observed payment columns",()=>{
 const lines=invoice().filter(line=>!["Thuế suất 8%","150.000","12.000"].includes(line.text));
 assert.equal(parseReceiptLines([...lines,...paymentColumns()]).amount,162000);
});

test("unverified or incomplete payment columns never authorize an inconsistent total",()=>{
 const lines=invoice().filter(line=>line.text!=="Thuế suất 8%").map(line=>line.text==="150.000"?{...line,text:"160.000"}:line);
 const wrong=paymentColumns().map(line=>line.text==="108.000"?{...line,text:"109.000"}:line);
 assert.equal(parseReceiptLines([...lines,...wrong]).amount,null);
 assert.equal(parseReceiptLines([...lines,...paymentColumns().filter(line=>line.text!=="8.000")]).amount,null);
});
