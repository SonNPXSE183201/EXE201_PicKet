import assert from "node:assert/strict";
import test from "node:test";
import {parseReceiptLines,parseReceiptText} from "./receipt-parser";

const c=(text:string,left:number,top:number,width=100)=>({text,left,right:left+width,top,bottom:top+20,confidence:.95});

test("positioned total labels do not borrow an unrelated next number",()=>{
  for(const label of ['Tổng thanh toán','Total']){
    const draft=parseReceiptLines([c('PICKET MART',0,0),c('28/10/2026',0,30),c(label,0,100,180),c('60000',300,250)]);
    assert.equal(draft.amount,null);
    assert.equal(draft.needsReview,true);
    assert.equal(parseReceiptText(draft.rawText).amount,null,'losing geometry must not revive a rejected association');
  }
});

test("a total split onto its own following line is bounded by geometry and survives text reparse",()=>{
  const draft=parseReceiptLines([c('PICKET MART',0,0),c('28/10/2026',0,30),c('Tổng thanh toán',0,100,180),c('60000',300,124)]);
  assert.equal(draft.amount,60000);
  assert.equal(parseReceiptText(draft.rawText).amount,60000);
});

test("an above-label total cannot be borrowed from a distant product row",()=>{
  const draft=parseReceiptLines([c('PICKET MART',0,0),c('60000',300,100),c('Amount Due',0,250,180)]);
  assert.equal(draft.amount,null);
  assert.equal(parseReceiptText(draft.rawText).amount,null);
});

test("text-only totals still support an adjacent number without native geometry",()=>{
  assert.equal(parseReceiptText('PICKET MART\n28/10/2026\nTổng thanh toán\n60000').amount,60000);
});

test("delivery fees are summary rows and do not become products",()=>{
  for(const fee of ['Phí vận chuyển','Phí giao hàng','Shipping fee','Delivery charge']){
    const draft=parseReceiptText(`PICKET MART\n28/10/2026\nTrà xanh 45000\n${fee} 15000\nTổng thanh toán 60000`);
    assert.deepEqual(draft.lineItems.map(i=>i.name),['Trà xanh'],fee);
  }
});

test("a bare can-tra payable label is read and outranks a merchandise subtotal",()=>{
  const draft=parseReceiptText('PICKET MART\n28/10/2026\nTổng tiền hàng 45000\nPhí giao hàng 15000\nCần trả 60000');
  assert.equal(draft.amount,60000);
});

test("contact and address metadata containing total labels cannot supply the payable",()=>{
  for(const line of ['Địa chỉ: số 15 đường Tổng Đốc 12345','Email: total60000@example.com','Hotline tổng đài: 19001234']){
    const draft=parseReceiptText(`PICKET MART\n28/10/2026\n${line}`);
    assert.equal(draft.amount,null,line);
  }
});
