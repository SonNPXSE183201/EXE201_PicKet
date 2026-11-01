import assert from "node:assert/strict";
import test from "node:test";
import {parseReceiptItemMoney,parseReceiptMoney} from "./receipt-money";
import {parseReceiptText} from "./receipt-parser";

test("OCR whitespace beside grouping punctuation preserves a complete money value",()=>{
  for(const value of ['45, 455','12. 000. 000','1 , 250 , 000','45,\u00a0455']){
    assert.equal(parseReceiptMoney(value),Number(value.replace(/\D/g,'')),value);
  }
  assert.equal(parseReceiptItemMoney('0, 00'),0);
});

test("spacing normalization never joins two amounts or repairs broken digits",()=>{
  for(const value of ['12000 45000','45, 455 60,000','1. 23. 456','909, 46B','12O000','12,\n000']){
    assert.equal(parseReceiptMoney(value),null,value);
  }
});

test("spaced price punctuation does not become part of a product name",()=>{
  const draft=parseReceiptText('PICKET MART\n28/10/2026\nTrà xanh 45, 455\nTổng thanh toán 45, 455');
  assert.equal(draft.amount,45455);
  assert.deepEqual(draft.lineItems.map(({name,total})=>({name,total})),[{name:'Trà xanh',total:45455}]);
});

test("a damaged item price is not truncated to a smaller trailing number",()=>{
  for(const value of ['12O900','1.23.456','1234ABC900','12O 900','12 O00','O90 000']){
    const draft=parseReceiptText(`PICKET MART\n28/10/2026\nTrà xanh ${value}\nTổng thanh toán ${value}`);
    assert.equal(draft.lineItems.length,0,value);
    assert.equal(draft.amount,null,value);
  }
});
