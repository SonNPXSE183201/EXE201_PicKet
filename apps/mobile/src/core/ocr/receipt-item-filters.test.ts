import assert from "node:assert/strict";
import test from "node:test";
import {parseReceiptLines,parseReceiptText,type ReceiptTextLine} from "./receipt-parser";
import {isReceiptMetadata} from "./receipt-semantics";

const H=20;
const cell=(text:string,left:number,row:number,dy=0,width=text.length*9):ReceiptTextLine=>
  ({text,left,right:left+width,top:row*30+dy,bottom:row*30+dy+H,confidence:.92});
const head=[cell("QUAN AN MAU",100,0),cell("Ngày: 18/02/2026",20,1)];
const twoColumns=(dy:(row:number)=>number=()=>0)=>[["Ca phe da","10.000"],["Bun thit xao","15.000"],["Com tam","17.000"]]
  .flatMap(([name,price],index)=>[cell(name,20,3+index),cell(price,480,3+index,dy(index),60)]);

test("a misread Tổng label (T6ng, Tbng) closes the item list and is never a product",()=>{
  const r=parseReceiptLines([...head,...twoColumns(),cell("T6ng:",20,7),cell("42.000",480,7,0,60)]);
  assert.deepEqual(r.lineItems.map(item=>item.name),["Ca phe da","Bun thit xao","Com tam"]);
  assert.equal(r.amount,42000);
  assert.deepEqual(parseReceiptText("QUAN AN MAU\nCa phe da 10.000\nTbng tibn 10.000").lineItems.map(item=>item.name),["Ca phe da"]);
});

test("an amount column drifting a full row never takes the previous product's price",()=>{
  for(const offset of [18,24]){
    const r=parseReceiptLines([...head,...twoColumns(()=>offset),cell("Tổng:",20,7),cell("42.000",480,7,0,60)]);
    const truth=new Map([["Ca phe da",10000],["Bun thit xao",15000],["Com tam",17000]]);
    for(const item of r.lineItems)assert.equal(item.total,truth.get(item.name),`offset ${offset}: ${item.name}`);
  }
  const curved=parseReceiptLines([...head,...twoColumns(index=>8*(index+1)),cell("Tổng:",20,7),cell("42.000",480,7,0,60)]);
  assert.deepEqual(curved.lineItems.map(({name,total})=>({name,total})),[{name:"Ca phe da",total:10000}]);
  // Mild tilt (amount slightly above its own name) still pairs.
  assert.equal(parseReceiptLines([...head,...twoColumns(()=>-6),cell("Tổng:",20,7),cell("42.000",480,7,0,60)]).lineItems.length,3);
});

test("product names containing street words keep their price; real addresses stay metadata",()=>{
  const r=parseReceiptText("QUAN AN MAU\nĐường mía Biên Hòa gói 1kg 32.000\n1 Nước Coca-Cola Ít Đường 28.000\nTổng 60.000");
  assert.deepEqual(r.lineItems.map(item=>item.total),[32000,28000]);
  assert.equal(isReceiptMetadata("Đường mía Biên Hòa 32.000"),false);
  assert.equal(isReceiptMetadata("Đường mía Biên Hòa 1 x 32000 ~ 32000"),false);
  assert.equal(isReceiptMetadata("1 Nước Coca-Cola Ít Đường"),false);
  for(const address of ["Đường Nguyễn Trãi, Q.5","Đường Lê Lợi","12 Nguyễn Huệ","45A/2 Lê Lợi","123 Đường Lê Lợi","Số 24 KDC An Khánh","10 Main Street"])
    assert.equal(isReceiptMetadata(address),true,address);
});

test("payable labels, VAT notes and OCR garbage are not products; brand names with digits are",()=>{
  const r=parseReceiptText("QUAN AN MAU\nCa phe da 10.000\n(VAT; 1.000\nKhách phải trả 10.000\n1±7.gco 38.806\n4gg923.oco 46.000\n7UP 10.000");
  assert.deepEqual(r.lineItems.map(item=>item.name),["Ca phe da","7UP"]);
});
