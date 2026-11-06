import assert from "node:assert/strict";
import test from "node:test";
import {receiptTableCrop} from "./receipt-table-crop";
import {parseReceiptText,type ReceiptTextLine} from "./receipt-parser";
import {canAttachReceipt} from "./receipt-eligibility";
const cell=(text:string,left:number,top:number,width=80):ReceiptTextLine=>({text,left,right:left+width,top,bottom:top+20});
test("table crop includes headers and body but excludes the distant VAT footer",()=>{
 const crop=receiptTableCrop([cell('Tên hàng hoá, dịch vụ',100,200,200),cell('Số lượng',450,200),cell('Đơn giá',600,200),cell('Thành tiền',800,200),cell('Bánh mẫu',50,260,260),cell('2',470,260,20),cell('25.000',620,260),cell('50.000',820,260),cell('Tiền hàng:',30,1000)]);
 assert.ok(crop);assert.ok(crop.originX<=50);assert.ok(crop.originY<200);assert.ok(crop.originX+crop.width>=900);assert.ok(crop.originY+crop.height>=280);assert.ok(crop.originY+crop.height<1000);
});
test("no crop is guessed without complete ordered table headers",()=>{
 assert.equal(receiptTableCrop([cell('DEMO',100,200),cell('Tổng cộng 50000',400,500)]),null);
});
test("an explicit VAT invoice may be reviewed even when item OCR and date are unreadable",()=>{
 const draft=parseReceiptText('PICKET DEMO\nHÓA ĐƠN\nTên hàng hoá, dịch vụ\nSố lượng\nĐơn giá\nThành tiền\nTiền hàng: 100000\nTiền thuế: 8000\nTiền thanh toán: 108000');
 assert.equal(draft.lineItems.length,0);assert.equal(canAttachReceipt(draft),true);
});
test("a free invoice item retains zero unit price and total without inventing a cost",()=>{
 const draft=parseReceiptText('PICKET DEMO\nQuà tặng 1 x 0 | 0\nTổng thanh toán 25000');
 assert.deepEqual(draft.lineItems.map(({name,quantity,unitPrice,total})=>({name,quantity,unitPrice,total})),[{name:'Quà tặng',quantity:1,unitPrice:0,total:0}]);
});

test("crop boundaries leave extra margin around thin text rows",()=>{
 const crop=receiptTableCrop([cell('Tên hàng hoá, dịch vụ',100,200,200),cell('Số lượng',450,200),cell('Đơn giá',600,200),cell('Thành tiền',800,200),cell('Bánh mẫu',50,260,260),cell('2',470,260,20),cell('25.000',620,260),cell('50.000',820,260),cell('Tiền hàng:',30,1000)]);
 assert.ok(crop);assert.ok(crop.originY<=150);assert.ok(crop.originY+crop.height>=330);
});
