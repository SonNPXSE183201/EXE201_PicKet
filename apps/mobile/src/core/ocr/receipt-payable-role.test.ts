import assert from "node:assert/strict";
import test from "node:test";
import {parseReceiptText,parseReceiptLines} from "./receipt-parser";

test("payable excludes a merchandise subtotal, quantity count, tender and change",()=>{
  const r=parseReceiptText('PICKET SHOP\n28/10/2026\nÁo sơ mi 2 x 450000 | 900000\nTổng số lượng 2\nTổng tiền hàng 900000\nPhí giao hàng 35000\nKhách phải trả 935000\nTiền khách đưa 1000000\nTiền trả lại 65000');
  assert.equal(r.amount,935000);
  assert.equal(r.needsReview,false);
  assert.equal(r.lineItems.length,1);
});

test("a merchandise subtotal alone cannot be mistaken for a payable amount",()=>{
  assert.equal(parseReceiptText('PICKET SHOP\n28/10/2026\nTổng tiền hàng 900000\nThuế chưa xác định').amount,null);
});

test("the abbreviated payable label T.Tiền is distinct from tender and change",()=>{
  const r=parseReceiptText('NHÀ THUỐC VŨ DUYÊN\nHÓA ĐƠN BÁN LẺ\nTiền hàng 800000\nTổng cộng 800000\nKhuyến mại 200000\nT.Tiền 600000\nKhách đưa 800000\nTrả lại 200000');
  assert.equal(r.amount,600000);
  assert.equal(r.needsReview,false);
});

test("printed final total wins over generic total without a false conflict",()=>{
  const r=parseReceiptText('PICKET SHOP\n28/10/2026\nTotal 900000\nShipping 35000\nAmount Due 935000');
  assert.equal(r.amount,935000);assert.equal(r.needsReview,false);
});

test("two different explicit payable totals still require review",()=>{
  const r=parseReceiptText('PICKET SHOP\n28/10/2026\nKhách phải trả 935000\nTổng thanh toán 950000');
  assert.equal(r.needsReview,true);
});

test("trailing phone numbers cannot be attached to a bare final-total label",()=>{
  const r=parseReceiptLines([{text:'PICKET SHOP',top:0,bottom:20,left:0,right:200},{text:'Tổng',top:200,bottom:220,left:0,right:50},{text:'0901234567',top:200,bottom:220,left:70,right:180},{text:'Hotline',top:180,bottom:195,left:70,right:180}]);
  assert.equal(r.amount,null);
});

test("a weighted table accepts observed fractional quantity with integer currency rounding",()=>{
  const c=(text:string,left:number,top:number,width=70)=>({text,left,right:left+width,top,bottom:top+15,confidence:.95});
  const r=parseReceiptLines([c('PICKET MART',0,0,200),c('Mặt hàng',0,60,130),c('SL',160,60,30),c('Đơn giá',220,60),c('Thành tiền',330,60,120),c('Táo xanh',0,90,130),c('0,375',160,90,40),c('105000',220,90),c('39375',330,90),c('Tổng 39375',0,140,180)]);
  assert.deepEqual(r.lineItems.map(({quantity,unitPrice,total})=>({quantity,unitPrice,total})),[{quantity:.375,unitPrice:105000,total:39375}]);
});

test("product names that contain Tax or Total are not global metadata matches",()=>{
  const r=parseReceiptText('PICKET MART\n28/10/2026\nColgate Total 1 x 45000 | 45000\nTổng thanh toán 45000');
  assert.equal(r.lineItems[0]?.name,'Colgate Total');
});

test("quantity may appear before the product name in a table",()=>{
  const c=(text:string,left:number,top:number,width=70)=>({text,left,right:left+width,top,bottom:top+15,confidence:.95});
  const r=parseReceiptLines([c('PICKET SHOP',0,0,200),c('SL',0,60,20),c('Mặt hàng',50,60,150),c('Đơn giá',230,60),c('Thành tiền',340,60,120),c('3',0,90,20),c('Bánh mì',50,90,150),c('15000',230,90),c('45000',340,90),c('Tổng 45000',0,140,180)]);
  assert.equal(r.lineItems[0]?.quantity,3);assert.equal(r.lineItems[0]?.name,'Bánh mì');
});

test("OCR letters containing a digit beside TOTAL are not treated as a tiny payable",()=>{
  const r=parseReceiptLines([{text:'SHOP',left:0,right:100,top:0,bottom:20},{text:'TOTAL SAE3',left:0,right:150,top:200,bottom:220},{text:'28000',left:300,right:370,top:200,bottom:220}]);
  assert.equal(r.amount,28000);
  assert.equal(parseReceiptText(r.rawText).amount,28000);
});

test("short subtotal labels and item counts are metadata rather than products or merchants",()=>{
  const r=parseReceiptLines([{text:'Bánh ngọt',left:0,right:130,top:100,bottom:120},{text:'28000',left:300,right:370,top:100,bottom:120},{text:'ITEMS 1.00',left:0,right:120,top:140,bottom:160},{text:'SUBTTL',left:0,right:120,top:180,bottom:200},{text:'28000',left:300,right:370,top:180,bottom:200},{text:'TOTAL 31000',left:0,right:200,top:240,bottom:260}]);
  assert.deepEqual(r.lineItems.map(i=>i.name),['Bánh ngọt']);
  assert.equal(r.merchant,null);
});

test("partially recognized digits are not accepted as a smaller total",()=>{
  for(const value of ['12O000','909,46B','1234ABC']){
    assert.equal(parseReceiptText(`PICKET SHOP\n28/10/2026\nTotal ${value}`).amount,null,value);
  }
  assert.equal(parseReceiptText('PICKET SHOP\n28/10/2026\nTotal 125000đ').amount,125000);
});

test("a generic total cannot replace an unreadable explicitly payable total",()=>{
  const r=parseReceiptText('PICKET SHOP\n28/10/2026\nTotal 900000\nShipping 35000\nAmount Due unreadable');
  assert.equal(r.amount,null);assert.equal(r.needsReview,true);
});
