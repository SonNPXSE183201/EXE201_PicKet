import assert from "node:assert/strict";
import test from "node:test";
import { receiptSummaryCrop } from "./receipt-summary-crop";

test("a skewed VAT summary crop includes labels, total heading and three amount rows", () => {
  const region = receiptSummaryCrop([
    {text:"Tiền hàng:",left:10,right:100,top:1000,bottom:1020},
    {text:"Tiền thuế:",left:10,right:100,top:1030,bottom:1050},
    {text:"Tiền thanh toán:",left:10,right:150,top:1060,bottom:1080},
    {text:"Tổng cộng",left:800,right:900,top:960,bottom:980},
  ], 1000, 1400);
  assert.ok(region);
  assert.equal(region.originX,0);assert.equal(region.width,1000);
  assert.ok(region.originY<=960);
  assert.ok(region.originY+region.height>=1120);
  assert.ok(region.height<=1400/2);
});

test("payment-method/contact text alone never authorizes a summary crop", () => {
  assert.equal(receiptSummaryCrop([{text:"Hình thức thanh toán: CK / TM ĐT: 0901234567",left:10,right:900,top:100,bottom:120}],1000,1400),null);
});

test("a single explicit payable label can recover the rest of an unreadable summary",()=>{
 const region=receiptSummaryCrop([{text:"Tiền thanh toán:",left:10,right:200,top:1000,bottom:1020}],1000,1400);
 assert.ok(region);assert.ok(region.originY<=900);assert.ok(region.originY+region.height>=1120);
});

test("observed POS total labels authorize one bounded detail crop", () => {
 for (const text of ["Tổng cộng:","Grand total:","Amount due:","Tổng thanh toán","TỔNG (GỒM VAT)","Tổng tiền:"]) {
  const region=receiptSummaryCrop([{text,left:10,right:150,top:1000,bottom:1020}],1000,1400);
  assert.ok(region,text); assert.ok(region.height <= 700);
 }
});

test("small OCR damage on an explicit payable label still authorizes a bounded summary crop",()=>{
 for(const text of ["Teng thanh toan:","Iong thanh toan:","T.Tiền:"]){
  const region=receiptSummaryCrop([{text,left:10,right:200,top:1000,bottom:1020}],1000,1400);
  assert.ok(region,text);assert.ok(region.originY<=880);assert.ok(region.originY+region.height>=1120);assert.ok(region.height<=700);
 }
 assert.equal(receiptSummaryCrop([{text:"Teng cong:",left:10,right:200,top:1000,bottom:1020}],1000,1400),null);
});

test("common per-letter OCR confusions in a payable label still authorize a bounded crop",()=>{
 const region=receiptSummaryCrop([{text:"rhanh tean:",left:10,right:200,top:1000,bottom:1020}],1000,1400);
 assert.ok(region);
 assert.ok(region.height<=700);
});
