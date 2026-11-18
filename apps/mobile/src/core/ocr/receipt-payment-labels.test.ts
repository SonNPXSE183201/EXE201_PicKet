import assert from "node:assert/strict";
import test from "node:test";
import {parseReceiptLines} from "./receipt-parser";

const c=(text:string,left:number,top:number,width=160,height=40)=>({text,left,right:left+width,top,bottom:top+height,confidence:.9});

test("a payment-method heading is not a payable label that hides the printed total",()=>{
  const r=parseReceiptLines([c('PICKET STORE',300,0,300),c('Subtotal',40,500),c('180.000',700,500),c('TỔNG',40,560,120,60),c('180.000',700,565),c('Phương thức thanh toán',40,700,400),c('Tiền mặt',40,760),c('180.000',700,760)]);
  assert.equal(r.amount,180000);
});

test("ML Kit's Latin read of Tổng (TÖNG / Töng / TÒNG) still labels a same-row total",()=>{
  for(const label of ['TÖNG','Töng Tiền:','TÒNG:']){
    const r=parseReceiptLines([c('PICKET STORE',300,0,300),c('Áo thun 1 x 95.000 | 95.000',40,300,600),c(label,40,500),c('95.000',700,505)]);
    assert.equal(r.amount,95000,label);
  }
});

test("a document title and a signature sentence that mention payment have no amount and do not block the total",()=>{
  const r=parseReceiptLines([c('PICKET BANK',300,0,300),c('THANH TOÁN',300,300,250),c('THẺ: 970400******0010',40,420,500),c('TÒNG:',40,800),c('VND',450,805,80),c('179,000',650,805),c('TÔI XÁC NHẬN HOÁ ĐƠN THANH TOÁN NÀY LÀ',40,1100,700),c('ĐÚNG',300,1150)]);
  assert.equal(r.amount,179000);
});

test("Số tiền read as S6 tiên is a payable label, not a damaged amount",()=>{
  const r=parseReceiptLines([c('PICKET PHARMACY',300,0,300),c('Tổng Tiền:',40,500),c('140.000',700,500),c('S6 tiên thanh toán:',40,600,320),c('140.000',700,600),c('Phương thức thanh toán:',40,700,400)]);
  assert.equal(r.amount,140000);
});

test("a dong sign read as a leading d is part of a same-row total cell",()=>{
  const r=parseReceiptLines([c('PICKET STORE',300,0,300),c('TỔNG',40,560,120,60),c('d784.000',650,565,250,60)]);
  assert.equal(r.amount,784000);
});

test("a payable label beside a damaged amount still blocks a generic total",()=>{
  const r=parseReceiptLines([c('PICKET STORE',300,0,300),c('Tổng',40,500),c('120000',700,500),c('Khách phải trả',40,600,250),c('12O000',700,600)]);
  assert.equal(r.amount,null);
});
