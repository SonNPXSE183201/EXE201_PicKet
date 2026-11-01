import assert from "node:assert/strict";
import { test } from "node:test";
import { parseReceiptText } from "./receipt-parser";
import { canAttachReceipt } from "./receipt-eligibility";
import { receiptCorpus } from "./fixtures/receipt-corpus";

test("landscape, arbitrary text and amount-only images cannot become receipts", () => {
  for (const text of ["", "SUNSET BEACH\nBeautiful day\n2026", "SALE\nTotal 100000"]) {
    assert.equal(canAttachReceipt(parseReceiptText(text)), false);
  }
});
test("a receipt with merchant, items and total can be reviewed", () => {
  assert.equal(canAttachReceipt(parseReceiptText("CA PHE AN\nCa phe 25000\nTong cong 25000\n23/10/2026")), true);
});
test("typed fields cannot authorize an image with no OCR evidence", () => {
  assert.equal(canAttachReceipt({ rawText: null, amount: 100000, merchant: "Entered by user" }), false);
});
test("supported synthetic receipt layouts retain the review flow", () => {
  for (const receipt of receiptCorpus) assert.equal(canAttachReceipt(parseReceiptText(receipt.rawText)), true, receipt.name);
});

const partialTable="PICKET DEMO\nHÓA ĐƠN\n26/10/2026\nTên sản phẩm\nSL\nĐơn giá\nThành tiền\nSữa mẫu 2 x 25000 | 50000\nTrà mẫu 1 x 10000 | 10000\nTiền hàng:\nTiền thuế:\nTiền thanh toán:";
test("a proven invoice with multiple coherent product rows can request a missing total",()=>{
 const draft=parseReceiptText(partialTable);
 assert.equal(draft.amount,null);assert.equal(draft.lineItems.length,2);
 assert.equal(canAttachReceipt(draft),true);assert.equal(draft.needsReview,true);
});

test("a shopping list or typed amount cannot substitute for explicit invoice evidence",()=>{
 const rawText=partialTable.replace("HÓA ĐƠN\n","");
 assert.equal(canAttachReceipt({rawText,amount:60000,merchant:"Typed store"}),false);
});

test("a missing merchant can be entered manually when multiple OCR items reconcile with a printed total",()=>{
 const rawText='Bánh ngọt 17000\nTrà đá 5000\nTOTAL 22000';
 const draft=parseReceiptText(rawText);
 assert.equal(draft.merchant,null);assert.equal(draft.needsReview,true);
 assert.equal(canAttachReceipt(draft),true);
 for(const bad of ['Bánh ngọt 17000\nTOTAL 17000','Bánh ngọt 17000\nTrà đá 5000\nTOTAL 25000']){
  assert.equal(canAttachReceipt({rawText:bad,merchant:'Typed store',amount:22000}),false);
 }
});
