import assert from "node:assert/strict";
import test from "node:test";
import {parseReceiptLines,parseReceiptText} from "./receipt-parser";
const c=(text:string,left:number,top:number,width=100)=>({text,left,right:left+width,top,bottom:top+20,confidence:.95});

test("an explicit leading multiplication quantity belongs to the item, not its name",()=>{
  const draft=parseReceiptText('PICKET MART\n2x Trà xanh 50000\n0,5 x Táo xanh 30000\nTổng 80000');
  assert.deepEqual(draft.lineItems.map(({name,quantity,unitPrice,total})=>({name,quantity,unitPrice,total})),[
    {name:'Trà xanh',quantity:2,unitPrice:25000,total:50000},
    {name:'Táo xanh',quantity:.5,unitPrice:60000,total:30000},
  ]);
  assert.ok(draft.lineItems.every(item=>item.confidence<.7));
});

test("explicit zero-price gifts keep observed quantity but never infer a price from a missing cell",()=>{
  const draft=parseReceiptLines([c('PICKET MART',20,0),c('2x Trà xanh',20,60,170),c('50000',330,60),c('1x Ly tặng',20,95,170),c('0',330,95),c('Khăn tặng',20,130,170),c('Tổng 50000',20,180,170)]);
  assert.deepEqual(draft.lineItems.map(({name,quantity,total})=>({name,quantity,total})),[{name:'Trà xanh',quantity:2,total:50000},{name:'Ly tặng',quantity:1,total:0}]);
});

test("numeric brands and impossible explicit quantities are not rewritten",()=>{
  const draft=parseReceiptText('PICKET MART\n3 Miền 15000\n7UP 12000\n0x Trà 50000\n2x Bánh 10001\nTổng 27000');
  assert.deepEqual(draft.lineItems.map(item=>item.name),['3 Miền','7UP']);
});

test("blank prices, contact and discount rows cannot masquerade as multiplied products",()=>{
  const draft=parseReceiptText('PICKET MART\n2x Hotline 0901234567\n1x Phí vận chuyển 15000\n1x Giảm giá 10000\n1x Trà xanh\nTổng 15000');
  assert.equal(draft.lineItems.length,0);
});
