import assert from "node:assert/strict";
import test from "node:test";
import {parseReceiptLines,parseReceiptText} from "./receipt-parser";
import {canAttachReceipt} from "./receipt-eligibility";

test("a payable amount in a separate OCR column is matched by its visual row",()=>{
 const result=parseReceiptLines([
  {text:"PICKET DEMO STORE",top:10,bottom:30,left:10,right:180},
  {text:"25/10/2026",top:40,bottom:60,left:10,right:100},
  {text:"Tổng thanh toán",top:300,bottom:320,left:150,right:260},
  {text:"Phí vận chuyển",top:230,bottom:250,left:150,right:260},
  {text:"0 đ",top:230,bottom:250,left:300,right:370},
  {text:"145.000 đ",top:301,bottom:321,left:300,right:390},
 ]);
 assert.equal(result.amount,145000);
 assert.equal(canAttachReceipt(result),true);
 const restored=parseReceiptText(result.rawText);
 assert.equal(restored.amount,145000);
 assert.equal(restored.date,result.date);
 assert.equal(canAttachReceipt(restored),true);
});

test("a nearby amount on another row is not treated as the payable total",()=>{
 const result=parseReceiptLines([
  {text:"PICKET DEMO STORE",top:10,bottom:30,left:10,right:180},
  {text:"25/10/2026",top:40,bottom:60,left:10,right:100},
  {text:"Tổng thanh toán",top:300,bottom:320,left:150,right:260},
  {text:"Thông tin khác",top:340,bottom:360,left:150,right:260},
  {text:"145.000 đ",top:340,bottom:360,left:300,right:390},
 ]);
 assert.equal(result.amount,null);
});

test("two different amounts beside the total label require review",()=>{
 const result=parseReceiptLines([
  {text:"PICKET DEMO STORE",top:10,bottom:30,left:10,right:180},
  {text:"Tổng thanh toán",top:300,bottom:320,left:150,right:260},
  {text:"145.000 đ",top:301,bottom:321,left:300,right:390},
  {text:"160.000 đ",top:301,bottom:321,left:400,right:490},
 ]);
 assert.equal(result.amount,null);
 assert.equal(result.needsReview,true);
});

test("a tilted VAT total label matches its own right-hand amount without colliding with the cash row below",()=>{
 const result=parseReceiptLines([
  {text:"7-ELEVEN",top:10,bottom:30,left:100,right:250,angle:-3},
  {text:"Ngày 30/08/2026 19:31:09",top:40,bottom:60,left:100,right:320,angle:-3},
  {text:"HÓA ĐƠN BÁN HÀNG",top:70,bottom:90,left:100,right:280,angle:-3},
  {text:"1 Túi Nước Đá 2KG 10,000",top:140,bottom:160,left:80,right:480,angle:-3},
  {text:"TỔNG (G0M VAT)",top:200,bottom:220,left:100,right:250,angle:-3},
  {text:"TIỀN MẶT",top:222,bottom:242,left:100,right:210,angle:-3},
  {text:"66,000",top:186,bottom:206,left:430,right:510,angle:-3},
  {text:"70,000",top:208,bottom:228,left:430,right:510,angle:-3},
 ]);
 assert.equal(result.amount,66000);
 assert.equal(parseReceiptText(result.rawText).amount,66000);
});

test("an invalid or left-hand coordinate does not authorize a spatial total",()=>{
 for(const left of [20,NaN]){
  const result=parseReceiptLines([
   {text:"PICKET DEMO STORE",top:10,bottom:30,left:10,right:180},
   {text:"Tổng thanh toán",top:300,bottom:320,left:150,right:260},
   {text:"Thông tin khác",top:340,bottom:360,left:150,right:260},
   {text:"145.000 đ",top:301,bottom:321,left,right:left+90},
  ]);
  assert.equal(result.amount,null);
 }
});
