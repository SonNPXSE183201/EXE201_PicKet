import assert from "node:assert/strict";
import test from "node:test";
import {parseReceiptLines,parseReceiptLineItems,parseReceiptText,type ReceiptTextLine} from "./receipt-parser";

test("contact, address, operator and document metadata never become products",()=>{
 const junk=["Đường số 24 KDC An Khánh 700000","Q. Ninh Kiều - TP. Cần Thơ 900000","123 Nguyễn Trãi, P. 7, Q. 5 700000","SĐT khách: 0901234567","Điện thoại 0901234567","Mã thẻ: A 10000001234","Store: HN 2025","Thu ngân: Minh 1234","Số hóa đơn 0000123456","Bàn 05","In lúc 12:30","Cảm ơn quý khách 2026","STK 123456789000","Ngày 28/10/2026"];
 assert.deepEqual(parseReceiptLineItems(junk.map(text=>({text}))),[]);
});

test("metadata does not win merchant selection when the shop name is missing",()=>{
 const parsed=parseReceiptText("THU NGÂN: AN\n123 Nguyễn Trãi, P.7, Q.5\nSĐT 0901234567\nGiá bán (có VAT)\nTổng 45000");
 assert.equal(parsed.merchant,null);
 assert.equal(parsed.lineItems.length,0);
});

test("merchant labels are removed and a joined business prefix gets a display space",()=>{
 assert.equal(parseReceiptText('HÓA ĐƠN\nĐơn vị bán hàng: CÔNG TY DEMO\n28/10/2026\nTổng 45000').merchant,'CÔNG TY DEMO');
 const r=parseReceiptText('CÀ PHÊAN NHIÊN\n28/10/2026\nTổng 45000');
 assert.equal(r.merchant,'CÀ PHÊ AN NHIÊN');
 assert.ok(r.rawText.includes('CÀ PHÊAN NHIÊN'));
});

test("retail product digits and sizes are preserved",()=>{
 const parsed=parseReceiptLineItems([{text:"7UP 330ml 2 x 12000 | 24000"},{text:"Sữa tươi 1L 1 x 30000 | 30000"}]);
 assert.deepEqual(parsed.map(p=>p.name),["7UP 330ml","Sữa tươi 1L"]);
});

const cell=(text:string,left:number,top:number,width=50):ReceiptTextLine=>({text,left,right:left+width,top,bottom:top+16,confidence:.95});
test("POS aliases and table-border artifacts retain all four product fields",()=>{
 const lines=[cell("PICKET CAFE",10,10,160),cell("Mặt hàng",10,100,100),cell("SL",220,99,25),cell("Giá",270,96),cell("T.Tiền",350,94),
 cell("Cà phê đá",10,130,100),cell("2",225,129,10),cell("10,000",270,127),cell("20,000",350,125),
 cell("Cơm tấm",10,160,100),cell("1",225,159,10),cell("17,000|",270,157),cell("17,000",350,155),cell("Tổng",10,200),cell("37,000",350,200)];
 const r=parseReceiptLines(lines);
 assert.deepEqual(r.lineItems.map(({name,quantity,unitPrice,total})=>({name,quantity,unitPrice,total})),[{name:"Cà phê đá",quantity:2,unitPrice:10000,total:20000},{name:"Cơm tấm",quantity:1,unitPrice:17000,total:17000}]);
 assert.equal(r.amount,37000);
 assert.equal(parseReceiptText(r.rawText).lineItems.length,2);
});

test("product-looking footer is outside a recognized table",()=>{
 const r=parseReceiptText("PICKET SHOP\nMặt hàng SL Đơn giá Thành tiền\nBánh mì 2 x 20000 | 40000\nTổng 40000\nƯu đãi lần sau 100000\nMã thành viên 12345678");
 assert.deepEqual(r.lineItems.map(i=>i.name),["Bánh mì"]);
});

test("an implicit quantity of one cannot look like a verified observed quantity",()=>{
 const r=parseReceiptText("PICKET CAFE\n28/10/2026\nCà phê 45000\nTổng 45000");
 assert.equal(r.lineItems[0].quantity,1);
 assert.ok(r.lineItems[0].confidence<.7);
 assert.equal(r.needsReview,true);
});

test("stacked POS rows with only quantity and amount headers use observed arithmetic",()=>{
 const r=parseReceiptLines([cell('PICKET SHOP',20,10,100),cell('SL',20,100,20),cell('CK',150,100,20),cell('T.Tiền',250,100,70),
  cell('Áo sơ mi',20,140,100),cell('2',20,165,10),cell('450000',80,165,60),cell('900000',250,165,70),cell('Tổng tiền',20,200,100),cell('900000',250,200,70)]);
 assert.deepEqual(r.lineItems.map(({name,quantity,unitPrice,total})=>({name,quantity,unitPrice,total})),[{name:'Áo sơ mi',quantity:2,unitPrice:450000,total:900000}]);
});

test("ML Kit merged lines retain column roles through word elements",()=>{
 const words=(parts:[string,number,number][],top:number)=>parts.map(([text,left,width])=>({...cell(text,left,top,width),left,right:left+width,top,bottom:top+16}));
 const r=parseReceiptLines([cell('PICKET SHOP',10,10,100),{...cell('Mặt hàng SL Giá T.Tiền',10,100,400),elements:words([['Mặt',10,30],['hàng',45,40],['SL',220,20],['Giá',270,40],['T.Tiền',350,70]],100)},
 {...cell('Bánh mì 2 20000 40000',10,140,410),elements:words([['Bánh',10,35],['mì',50,20],['2',220,10],['20000',270,50],['40000',350,70]],140)},
 cell('Tổng 40000',10,200,140)]);
 assert.deepEqual(r.lineItems.map(({name,quantity,unitPrice,total})=>({name,quantity,unitPrice,total})),[{name:'Bánh mì',quantity:2,unitPrice:20000,total:40000}]);
});
