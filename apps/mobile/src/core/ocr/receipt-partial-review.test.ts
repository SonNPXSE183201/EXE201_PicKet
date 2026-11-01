import assert from "node:assert/strict";
import test from "node:test";
import {parseReceiptLines,parseReceiptText} from "./receipt-parser";
import {canAttachParsedReceipt,canAttachReceipt} from "./receipt-eligibility";

test("an explicit dated receipt keeps one observed product when merchant or total is missing",()=>{
  for(const total of ['Tổng thanh toán 50000','Tổng thanh toán chưa đọc được']){
    const draft=parseReceiptText(`HÓA ĐƠN\n29/10/2026\nTrà xanh 2 x 25000 | 50000\n${total}`);
    assert.equal(draft.merchant,null);
    assert.equal(canAttachReceipt(draft),true);
    assert.equal(draft.lineItems.length,1);
    assert.equal(draft.needsReview,true);
  }
});

test("partial review still needs receipt identity and coherent observed rows",()=>{
  for(const text of [
    '29/10/2026\nTrà xanh 50000\nTổng 50000',
    'HÓA ĐƠN\n29/10/2026\nSĐT 0901234567',
    'HÓA ĐƠN\n29/10/2026\nTrà xanh 2 x 25000 | 60000',
    'HÓA ĐƠN\n29/10/2026\nQuà 1 x 0 | 0',
  ])assert.equal(canAttachReceipt({rawText:text,merchant:'Typed',amount:50000}),false,text);
});

test("a missing merchant is explicitly flagged even when all numeric cells are certain",()=>{
  const draft=parseReceiptText('HÓA ĐƠN\n29/10/2026\nTrà xanh 2 x 25000 | 50000\nTổng 50000');
  assert.equal(draft.needsReview,true);
  assert.match(draft.reviewReason??'',/cửa hàng/);
});

test("a dated receipt without total requires observed quantity/unit operands rather than merchant or item count",()=>{
  for(const inferredOnly of [
    'EXAMPLE SHOP\nHÓA ĐƠN\n29/10/2026\nTrà xanh 50000',
    'EXAMPLE SHOP\nHÓA ĐƠN\n29/10/2026\nTrà xanh 50000\nBánh mì 25000',
    '7-ELEVEN\nNgày 30/08/2026 19:31:09\nHÓA ĐƠN BÁN HÀNG\n3 sản phẩm tổng cộng\n1 Túi Nước Đá 2KG (NEW) 10,000\nTỔNG (GỒM VAT)',
  ]){
    const draft=parseReceiptText(inferredOnly);
    assert.equal(draft.amount,null,inferredOnly);
    assert.equal(canAttachReceipt(draft),false,inferredOnly);
  }
  for(const observedOperands of [
    'EXAMPLE SHOP\nHÓA ĐƠN\n29/10/2026\nTrà xanh 2 x 25000 | 50000\nTỔNG (GỒM VAT)',
    '7-ELEVEN\nNgày 30/08/2026 19:31:09\nHÓA ĐƠN BÁN HÀNG\nTúi Nước Đá 2KG (NEW) 1 x 10,000 | 10,000\nTỔNG (GỒM VAT)',
  ]){
    const draft=parseReceiptText(observedOperands);
    assert.equal(draft.amount,null,observedOperands);
    assert.equal(draft.lineItems.length,1,observedOperands);
    assert.equal(canAttachReceipt(draft),true,observedOperands);
    assert.equal(draft.needsReview,true,observedOperands);
  }
});

test("serialization and restoration never invent a product-derived merchant or upgrade low-confidence rows",()=>{
  const outOfOrderTable=parseReceiptLines([
    {text:"Phyc ụ Thy TRn",left:23,right:82,top:47,bottom:56,confidence:0.49},
    {text:"Thu ngân: Qn i",left:22,right:79,top:60,bottom:70,confidence:0.62},
    {text:"HÓA BN THANH YOAN",left:70,right:170,top:1,bottom:11,confidence:0.63},
    {text:"1 Nuớc ép dia",left:26,right:86,top:104,bottom:112,confidence:0.4},
    {text:"Tên món",left:52,right:83,top:82,bottom:88,confidence:0.57},
    {text:"2 BIA HA NỘI",left:25,right:77,top:118,bottom:128,confidence:0.45},
    {text:"Caramel",left:38,right:68,top:136,bottom:143,confidence:0.57},
    {text:"35 C0o",left:156,right:180,top:138,bottom:144,confidence:0.4},
    {text:"4 Sinh tó xaai",left:26,right:81,top:158,bottom:167,confidence:0.49},
    {text:"35000",left:155,right:180,top:158,bottom:167,confidence:0.7},
    {text:"SL",left:106,right:113,top:82,bottom:88,confidence:0.42},
    {text:"Tóng thanh toán",left:24,right:106,top:202,bottom:216,confidence:0.84},
    {text:"205.000đ",left:140,right:185,top:202,bottom:216,confidence:0.84},
  ]);
  assert.equal(outOfOrderTable.merchant,null);
  assert.equal(canAttachParsedReceipt(outOfOrderTable),false);
  assert.equal(canAttachReceipt(outOfOrderTable),false);
  const reparsedTable=parseReceiptText(outOfOrderTable.rawText);
  assert.equal(reparsedTable.merchant,null);
  assert.equal(canAttachParsedReceipt(reparsedTable),false);

  const lowConfidence=parseReceiptLines([
    {text:"HÓA ĐƠN",confidence:0.3},
    {text:"29/10/2026",confidence:0.3},
    {text:"Trà xanh 2 x 25000 | 50000",confidence:0.3},
    {text:"Tổng thanh toán chưa đọc được",confidence:0.3},
  ]);
  assert.equal(canAttachParsedReceipt(lowConfidence),false);
  assert.equal(canAttachReceipt(lowConfidence),false);
  const reparsedLow=parseReceiptText(lowConfidence.rawText);
  assert.ok(reparsedLow.lineItems[0].confidence<0.7);
  assert.equal(canAttachParsedReceipt(reparsedLow),false);
});
