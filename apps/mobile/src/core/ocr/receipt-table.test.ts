import assert from "node:assert/strict";
import test from "node:test";
import {parseReceiptLines,parseReceiptText,type ReceiptTextLine} from "./receipt-parser";

test("Vietnamese written calendar date is extracted rather than replaced by today",()=>{
 const result=parseReceiptText("PICKET DEMO\nNgày 06 Tháng 10 Năm 2026\nSan pham 145000\nTổng thanh toán 145000");
 assert.equal(result.date,"2026-10-06T00:00:00.000Z");
});
test("purchase document headings and websites are not merchant names",()=>{
 const result=parseReceiptText("PHIẾU MUA HÀNG\nwww.example.test\nPICKET DEMO STORE\nNgày 06 tháng 10 năm 2026\nSan pham 145000\nTổng thanh toán 145000");
 assert.equal(result.merchant,"PICKET DEMO STORE");
});
test("stacked POS rows support VAT-tagged unit prices and two-column SL/Tong layouts",()=>{
 const vatRows=parseReceiptLines([
  cell("BÁCH HÓA XANH",10,10,180),cell("03/09/2026",10,35,120),
  cell("SL",40,70,25),cell("Giá bán (VAT)",150,70,120),cell("Thành tiền",360,70,90),
  cell("hành tím túi 200gr",20,100,180),
  cell("1",45,122,20),cell("18.600 (VAT:5%)",150,122,120),cell("18.600",370,122,80),
  cell("Tổng tiền:",20,170,100),cell("18.600",370,170,80),
 ]);
 assert.equal(vatRows.amount,18600);
 assert.deepEqual(vatRows.lineItems.map(({name,quantity,unitPrice,total})=>({name,quantity,unitPrice,total})),[
  {name:"hành tím túi 200gr",quantity:1,unitPrice:18600,total:18600},
 ]);
 const twoCol=parseReceiptLines([
  cell("NGÔ GIA",10,10,120),cell("Phiếu thanh toán",10,30,150),cell("2026-08-10",160,50,100),
  cell("SL",20,80,25),cell("Tổng",360,80,60),
  cell("Bí Đao Chanh",20,110,160),
  cell("2",20,135,20),cell("54,000",350,135,70),
  cell("Tổng thanh toán",20,180,140),cell("54,000đ",350,180,70),
 ]);
 assert.equal(twoCol.amount,54000);
 assert.deepEqual(twoCol.lineItems.map(({name,quantity,unitPrice,total})=>({name,quantity,unitPrice,total})),[
  {name:"Bí Đao Chanh",quantity:2,unitPrice:27000,total:54000},
 ]);
});
const cell=(text:string,left:number,top:number,width=70):ReceiptTextLine=>({text,left,right:left+width,top,bottom:top+15});
function table(){return [
 cell("PICKET DEMO STORE",10,10,200),cell("Ngày 06 tháng 10 năm 2026",10,35,240),
 cell("Tên sản phẩm",10,80,180),cell("SL",220,80,25),cell("Đơn giá",270,80),cell("BH",370,80,25),cell("Thành tiền",430,80,100),
 cell("Bàn phím demo",10,110,180),cell("Chuột demo",10,145,180),
 cell("2",220,110,25),cell("1",220,145,25),
 cell("120.000 đ",270,110),cell("85.000 đ",270,145),
 cell("24",370,110,25),cell("12",370,145,25),
 cell("240.000 đ",430,110,100),cell("85.000 đ",430,145,100),
 cell("Tổng thanh toán",270,200,130),cell("325.000 đ",430,200,100),
];}
test("separate OCR columns preserve each product quantity unit price and total",()=>{
 const result=parseReceiptLines(table());
 assert.equal(result.amount,325000);
 assert.deepEqual(result.lineItems.map(({name,quantity,unitPrice,total})=>({name,quantity,unitPrice,total})),[
  {name:"Bàn phím demo",quantity:2,unitPrice:120000,total:240000},
  {name:"Chuột demo",quantity:1,unitPrice:85000,total:85000},
 ]);
 assert.deepEqual(parseReceiptText(result.rawText).lineItems,result.lineItems);
});
test("inconsistent table quantity and prices are not silently accepted",()=>{
 const lines=table().map(line=>line.text==="240.000 đ"?{...line,text:"230.000 đ"}:line);
 const result=parseReceiptLines(lines);
 assert.ok(!result.lineItems.some(line=>line.name==="Bàn phím demo"));
 assert.equal(result.needsReview,true);
 assert.match(result.reviewReason??"",/chưa được đưa vào danh sách/);
});
test("a long table retains thirty distinct products without counting its summary",()=>{
 const lines=table().filter(line=>line.top!<=80);
 for(let index=0;index<30;index++){
  const top=110+index*30;
  lines.push(cell(`Sản phẩm mẫu ${index+1}`,10,top,180),cell("2",220,top,25),cell("10.000 đ",270,top),cell("12",370,top,25),cell("20.000 đ",430,top,100));
 }
 lines.push(cell("Tổng thanh toán",270,1050,130),cell("600.000 đ",430,1050,100));
 const result=parseReceiptLines(lines);
 assert.equal(result.lineItems.length,30);
 assert.equal(result.lineItems.reduce((sum,line)=>sum+line.total,0),600000);
 assert.equal(result.amount,600000);
 assert.equal(parseReceiptText(result.rawText).lineItems.length,30);
});
test("impossible Vietnamese written calendar dates are rejected",()=>{
 assert.equal(parseReceiptText("PICKET DEMO\nNgày 31 tháng 02 năm 2026\nTổng thanh toán 145000").date,null);
});
