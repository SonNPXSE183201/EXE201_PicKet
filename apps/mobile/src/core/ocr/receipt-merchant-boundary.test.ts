import assert from "node:assert/strict";
import test from "node:test";
import {parseReceiptLines,parseReceiptText} from "./receipt-parser";

const c=(text:string,left:number,top:number,width=100)=>({text,left,right:left+width,top,bottom:top+20,confidence:.95});

test("headerless product names and footer words cannot fill a missing merchant",()=>{
  const draft=parseReceiptLines([c('Bánh ngọt',20,100,160),c('17000',330,100),c('Cookie tặng kèm',20,135,190),c('TOTAL',20,180),c('17000',330,180),c('Charge',20,220)]);
  assert.equal(draft.lineItems[0]?.name,'Bánh ngọt');
  assert.equal(draft.merchant,null);
  assert.equal(parseReceiptText(draft.rawText).merchant,null);
});

test("a real header above headerless rows remains a merchant even when native blocks are out of order",()=>{
  const draft=parseReceiptLines([c('Bánh ngọt',20,100,160),c('17000',330,100),c('TOTAL',20,180),c('17000',330,180),c('PICKET CAFE QUAN 7',20,0,230),c('Charge',20,220)]);
  assert.equal(draft.merchant,'PICKET CAFE QUAN 7');
});

test("footer words after a final total cannot become a merchant when all products are unreadable",()=>{
  assert.equal(parseReceiptText('28/10/2026\nTổng thanh toán 60000\nCharge').merchant,null);
});

test("a numeric product brand is retained as a product rather than interpreted as a store",()=>{
  const draft=parseReceiptText('3 Miền 15000\nTổng thanh toán 15000\nCharge');
  assert.equal(draft.lineItems[0]?.name,'3 Miền');
  assert.equal(draft.merchant,null);
});

test("merchant suffix in a payment document heading is retained without promoting body items",()=>{
  const draft=parseReceiptText('PHIÊU THANH TON CỬA HÀNG AN LẠC\n03/09/2026\nCà rốt (kg)\nTổng tiền 513238');
  assert.equal(draft.merchant,'CỬA HÀNG AN LẠC');
  assert.equal(parseReceiptText('PHIẾU THANH TOÁN\n03/09/2026\nCà rốt (kg)').merchant,null);
});
