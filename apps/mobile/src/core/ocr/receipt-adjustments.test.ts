import assert from "node:assert/strict";
import test from "node:test";
import {parseReceiptLines,parseReceiptText} from "./receipt-parser";
import {canAttachParsedReceipt,canAttachReceipt} from "./receipt-eligibility";

const c=(text:string,left:number,top:number,width=100)=>({text,left,right:left+width,top,bottom:top+20,confidence:.95});
const lines=[c('Bánh ngọt',20,100,160),c('40000',330,100),c('Trà xanh',20,135,160),c('20000',330,135),c('Service',20,180,160),c('3000',330,180),c('PB1 (10%)',20,215,160),c('6300',330,215),c('TOTAL',20,260),c('69300',330,260)];

test("a missing merchant is reviewable when observed items and fee/tax amounts reconcile",()=>{
  const draft=parseReceiptLines(lines);
  assert.equal(draft.merchant,null);
  assert.equal(draft.amount,69300);
  assert.equal(canAttachParsedReceipt(draft),true);
  assert.equal(canAttachReceipt({rawText:draft.rawText}),true,'canonical raw evidence survives geometry loss');
});

test("a tax percentage alone never authorizes a missing merchant",()=>{
  const draft=parseReceiptLines(lines.filter(line=>line.text!=='6300'));
  assert.equal(canAttachParsedReceipt(draft),false);
  assert.equal(canAttachReceipt({rawText:draft.rawText,merchant:'Typed store',amount:69300}),false);
});

test("wrong or ambiguous fee amounts keep an incomplete receipt under the evidence gate",()=>{
  const wrong=lines.map(line=>line.text==='3000'?{...line,text:'3500'}:line);
  assert.equal(canAttachParsedReceipt(parseReceiptLines(wrong)),false);
  assert.equal(canAttachParsedReceipt(parseReceiptLines([...lines,c('5000',230,180,60)])),false);
});

test("metadata with tax wording cannot be used as an observed adjustment",()=>{
  const raw='Bánh ngọt 40000\nTrà xanh 20000\nEmail: tax 6000\nTOTAL 66000';
  assert.equal(canAttachParsedReceipt(parseReceiptText(raw)),false);
});

test("an observed discount can reconcile a receipt without guessing a negative product",()=>{
  const draft=parseReceiptText('Bánh ngọt 40000\nTrà xanh 20000\nDiscount 5000\nTOTAL 55000');
  assert.equal(canAttachParsedReceipt(draft),true);
  assert.deepEqual(draft.lineItems.map(i=>i.name),['Bánh ngọt','Trà xanh']);
});
