import assert from "node:assert/strict";
import test from "node:test";
import {parseReceiptLines,parseReceiptText,type ReceiptTextLine} from "./receipt-parser";
const cell=(text:string,left:number,top:number,width=70):ReceiptTextLine=>({text,left,right:left+width,top,bottom:top+18});
function invoice(){return [
 cell('PICKET DEMO',20,10,230),cell('26/10/2026',20,40,150),
 cell('STT',20,100,30),cell('Tên hàng hoá, dịch vụ',150,100,230),cell('Đơn vị tính',460,102,70),cell('Thuế suất',560,105,75),cell('Số lượng',670,110,70),cell('Đơn giá',790,115,90),cell('Thành tiền',950,120,100),
 cell('Bánh mẫu',65,160,210),cell('hộp nhỏ',65,180,150),cell('Hộp',470,171,45),cell('8%',565,173,35),cell('2',700,178,15),cell('15.556',820,180,75),cell('31.111',990,185,80),
 cell('Nước mẫu',65,220,240),cell('Chai',470,229,45),cell('8%',565,233,35),cell('1',700,236,15),cell('35.185',820,240,75),cell('35.185',990,243,80),
 cell('Tổng thanh toán 66.296',500,320,400),
];}
test('VAT headers centered over wide columns and skewed rows preserve product names and arithmetic',()=>{
 const result=parseReceiptLines(invoice());
 assert.deepEqual(result.lineItems.map(({name,quantity,unitPrice,total})=>({name,quantity,unitPrice,total})),[
 {name:'Bánh mẫu hộp nhỏ',quantity:2,unitPrice:15556,total:31111},
 {name:'Nước mẫu',quantity:1,unitPrice:35185,total:35185},
 ]);
 assert.deepEqual(parseReceiptText(result.rawText).lineItems,result.lineItems);
});
test('ambiguous duplicate price cells do not fabricate a product row',()=>{
 const result=parseReceiptLines([...invoice(),cell('16.000',820,181,75)]);
 assert.ok(!result.lineItems.some(item=>item.name.startsWith('Bánh mẫu')));
});
test('VAT footer totals never become a product',()=>{
 const result=parseReceiptLines([...invoice(),cell('Tiền thuế',60,360,200),cell('1',700,375,15),cell('8.000',820,380,75),cell('8.000',990,385,80)]);
 assert.ok(!result.lineItems.some(item=>/thuế/.test(item.name)));
});

test('a missing quantity is derived only from a consistent integer unit-price and line-total ratio',()=>{
 const rows=invoice().filter(line=>!(line.text==='2'&&line.left===700));
 const item=parseReceiptLines(rows).lineItems.find(item=>item.name.startsWith('Bánh mẫu'));
 assert.ok(item);assert.equal(item.quantity,2);assert.ok(item.confidence<0.7);
});
test('an unreadable unit price can be calculated from observed quantity and line total with review confidence',()=>{
 const rows=invoice().map(line=>line.text==='35.185'&&line.left===820?{...line,text:'unreadable'}:line);
 const item=parseReceiptLines(rows).lineItems.find(item=>item.name==='Nước mẫu');
 assert.ok(item);assert.equal(item.unitPrice,35185);assert.ok(item.confidence<0.7);
});
test('missing quantity and price together cannot create an item from its total alone',()=>{
 const rows=invoice().filter(line=>!((line.text==='2'&&line.left===700)||(line.text==='15.556'&&line.left===820)));
 assert.ok(!parseReceiptLines(rows).lineItems.some(item=>item.name.startsWith('Bánh mẫu')));
});
