import assert from "node:assert/strict";
import test from "node:test";
import {parseReceiptLines} from "./receipt-parser";
const c=(text:string,left:number,top:number,width=100)=>({text,left,right:left+width,top,bottom:top+20,confidence:.95});
test("POS without column headers joins product names with one visual amount",()=>{
  const r=parseReceiptLines([c('PICKET CAFE',20,0,180),c('28/10/2026',20,30,130),c('Bánh ngọt',20,100,160),c('17000',330,100),c('Trà đá',20,135,160),c('5000',330,135),c('TOTAL',20,180),c('22000',330,180)]);
  assert.deepEqual(r.lineItems.map(({name,total})=>({name,total})),[{name:'Bánh ngọt',total:17000},{name:'Trà đá',total:5000}]);
  assert.equal(r.amount,22000);assert.equal(r.needsReview,true,'no printed quantity/unit price');
});
test("unheaded rows do not merge ambiguous prices or contact details",()=>{
  const r=parseReceiptLines([c('PICKET CAFE',20,0),c('Đường Nguyễn Trãi',20,30,160),c('0901234567',330,30),c('Bánh ngọt',20,100,160),c('17000',220,100,50),c('34000',330,100),c('TOTAL',20,180),c('34000',330,180)]);
  assert.equal(r.lineItems.length,0);
});
test("POS lines with an observed quantity on the left keep fractional weights",()=>{
  const r=parseReceiptLines([c('PICKET MART',20,0,180),c('0,5',0,100,25),c('Táo xanh',50,100,160),c('25000',330,100),c('TOTAL',20,180),c('25000',330,180)]);
  assert.equal(r.lineItems[0]?.name,'Táo xanh');assert.equal(r.lineItems[0]?.quantity,.5);assert.equal(r.lineItems[0]?.unitPrice,50000);
  assert.ok((r.lineItems[0]?.confidence??1)<.7);assert.equal(r.needsReview,true);
});

test("non-divisible observed quantity and line total never invent a rounded unit price",()=>{
  const r=parseReceiptLines([c('PICKET MART',20,0,180),c('28/10/2026',20,30,130),c('3',0,100,25),c('Táo xanh',50,100,160),c('10000',330,100),c('TOTAL',20,180),c('10000',330,180)]);
  assert.equal(r.lineItems.length,0);
  assert.equal(r.needsReview,true);
});

test("headerless stacked quantities need explicit multiplication and matching line total",()=>{
  const row=[c('PICKET CAFE',20,0,180),c('Bánh ngọt',20,100,160),c('2 X 17000',20,133,170),c('34000',330,137),c('TOTAL',20,200),c('34000',330,200)];
  const r=parseReceiptLines(row);
  assert.deepEqual(r.lineItems.map(({name,quantity,unitPrice,total})=>({name,quantity,unitPrice,total})),[{name:'Bánh ngọt',quantity:2,unitPrice:17000,total:34000}]);
  assert.equal(parseReceiptLines(row.map(x=>x.text==='34000'&&x.top===137?{...x,text:'35000'}:x)).lineItems.length,0);
  assert.equal(parseReceiptLines(row.filter(x=>x.top<200)).lineItems.length,0);
});
