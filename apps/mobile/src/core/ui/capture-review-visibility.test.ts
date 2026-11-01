import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import type {ReceiptDraftLine} from "../ocr/receipt-parser";
import {receiptCurrencyWarning} from "../ocr/receipt-currency";

type Node = {type: string; props: Record<string,unknown>; children: unknown[]};
function applyFallbackDate(initial: string, observed: boolean, incoming: string | null, edited: string | null = null) {
 const source=readFileSync(new URL("../../app/capture/index.tsx",import.meta.url),"utf8");
 const start=source.indexOf("if (parsed.merchant)");
 const end=source.indexOf('setProvider("pp-ocr")',start);
 assert.ok(start>=0&&end>start);
 let date=edited??initial, known=observed;
 const context={parsed:{merchant:null,amount:null,rawText:"",lineItems:[],date:incoming},baseline:{purchasedAt:initial},
  explicitDate:{current:edited},hasObservedDate:observed,
  setTitle:()=>{},setAmount:()=>{},setRawText:()=>{},setLineItems:()=>{},
  setPurchasedAt:(next:string|((current:string)=>string))=>{date=typeof next==="function"?next(date):next;},
  setHasObservedDate:(next:boolean)=>{known=next;},
  receiptCaptureDate:(explicit:string|null,read:string|null)=>explicit??read??"DEFAULT_TODAY",
 };
 vm.runInNewContext(ts.transpileModule(source.slice(start,end),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,context);
 return {date,known};
}

test("fallback without a date preserves an observed local receipt date",()=>{
 assert.deepEqual(applyFallbackDate("2026-06-14",true,null),{date:"2026-06-14",known:true});
});
test("fallback fills an unobserved date and removes the default-date warning",()=>{
 const result=applyFallbackDate("DEFAULT_TODAY",false,"2026-06-14");
 assert.deepEqual(result,{date:"2026-06-14",known:true});
 assert.doesNotMatch(render(true,false,[],null,result.known).text,/chưa đọc được trên ảnh/);
});
test("fallback preserves confirmed local dates and edits made during polling",()=>{
 assert.deepEqual(applyFallbackDate("2026-06-14",true,"2026-06-15"),{date:"2026-06-14",known:true});
 assert.deepEqual(applyFallbackDate("DEFAULT_TODAY",true,"2026-06-15","2026-06-16"),{date:"2026-06-16",known:true});
});
test("fallback without date evidence keeps the unobserved date warning",()=>{
 const result=applyFallbackDate("DEFAULT_TODAY",false,null);
 assert.deepEqual(result,{date:"DEFAULT_TODAY",known:false});
 assert.match(render(true,false,[],null,result.known).text,/chưa đọc được trên ảnh/);
});
test("a new scan resets date evidence from the previous image while retaining an explicit date",()=>{
 const source=readFileSync(new URL("../../app/capture/index.tsx",import.meta.url),"utf8");
 const start=source.indexOf("setPurchasedAt(",source.indexOf("async function runOcr"));
 const end=source.indexOf('setProvider("manual")',start);
 assert.ok(start>=0&&end>start);
 for(const explicit of [null,"2026-06-16"]){
  let date="OLD_RECEIPT_DATE",known=true;
  vm.runInNewContext(ts.transpileModule(source.slice(start,end),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{
   explicitDate:{current:explicit},receiptCaptureDate:(value:string|null)=>value??"DEFAULT_TODAY",
   setPurchasedAt:(value:string)=>{date=value;},setHasObservedDate:(value:boolean)=>{known=value;},
  });
  assert.deepEqual({date,known},{date:explicit??"DEFAULT_TODAY",known:Boolean(explicit)});
 }
});
function render(eligible: boolean, recognizing = false, lineItems: ReceiptDraftLine[] = [], currencyWarning: string | null = null, hasObservedDate = true) {
 const source=readFileSync(new URL("../../app/capture/index.tsx",import.meta.url),"utf8").replace(/\r\n/g,"\n");
 const start=source.indexOf("  return (\n    <SafeAreaView",source.indexOf("if (!hydrated)"));
 const end=source.indexOf("\n}",start);
 const exports:{render?:()=>Node}={};
 const noop=()=>{};
 const context:Record<string,unknown>={exports,element:(type:string,props:Record<string,unknown>,...children:unknown[])=>({type,props:props??{},children}),Fragment:"Fragment",
  styles:{},colors:{},currencyWarning,imageUri:"file:///receipt.jpg",receiptEligible:eligible,isRecognizing:recognizing,isContinuing:false,isQueueingFallback:false,
  message:"Không nhận diện được hóa đơn hợp lệ.",ocrDurationMs:null,__DEV__:false,lineItems,formatMoney:(amount:number)=>`${amount} VND`,serverFallbackEnabled:false,localMode:false,needsFallback:false,fallbackStatus:null,attachReceipt:false,
  title:"",amount:"",purchasedAt:"2026-10-26",hasObservedDate,calendarReceiptDay:()=>"2026-10-26",setTitle:noop,setAmount:noop,
 };
 for(const name of ["SafeAreaView","ScrollView","TopAppBar","Text","Image","View","AppIcon","Pressable","ActivityIndicator","TextInput"])context[name]=name;
 vm.runInNewContext(ts.transpileModule(`exports.render=()=>{${source.slice(start,end)}};`,{fileName:"capture.tsx",compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,jsxFactory:"element",jsxFragmentFactory:"Fragment"}}).outputText,context);
 const tree=exports.render!();const nodes:Node[]=[];const text:string[]=[];
 const visit=(value:unknown)=>{if(Array.isArray(value)){value.forEach(visit);return;}if(typeof value==="string"){text.push(value);return;}if(value&&typeof value==="object"&&"type" in value){const node=value as Node;nodes.push(node);node.children.forEach(visit);}};visit(tree);
 return {nodes,text:text.join(" ")};
}
test("unrecognized receipt shows recovery actions and alert without transaction inputs",()=>{
 const result=render(false);
 assert.equal(result.nodes.filter(node=>node.type==="TextInput").length,0);
 assert.doesNotMatch(result.text,/Kiểm tra và tạo giao dịch|Đính kèm ảnh vào giao dịch/);
 assert.doesNotMatch(result.text,/Xoay ảnh/);
 assert.match(result.text,/Chụp (?:ảnh|lại)/);assert.match(result.text,/Chọn từ thư viện/);
 assert.ok(result.nodes.some(node=>node.props.role==="alert"));
});
test("recognized receipt exposes the review fields and handoff",()=>{
 const result=render(true);assert.equal(result.nodes.filter(node=>node.type==="TextInput").length,3);
 assert.match(result.text,/Kiểm tra và tạo giao dịch/);
});
test("recognition in progress does not expose editable transaction fields",()=>{
 const result=render(false,true);assert.equal(result.nodes.filter(node=>node.type==="TextInput").length,0);
 assert.match(result.text,/Đang đọc hóa đơn/);
});

test("review displays each recognized product quantity unit price and total before saving",()=>{
 const result=render(true,false,[{name:"Sản phẩm demo",quantity:2,unitPrice:25000,total:50000,confidence:0.9}]);
 assert.match(result.text,/Sản phẩm demo/);assert.match(result.text,/Số lượng:/);assert.match(result.text,/25000 VND/);assert.match(result.text,/50000 VND/);
});

test("uncertain products keep prices visible without repeated advisory paragraphs",()=>{
 const result=render(true,false,[{name:"Sản phẩm demo",quantity:2,unitPrice:25000,total:50000,confidence:0.55}]);
 assert.match(result.text,/25000 VND/);assert.match(result.text,/50000 VND/);
 assert.doesNotMatch(result.text,/Giá trị được tính lại từ các ô đọc được|Chụp rõ toàn bộ hóa đơn|Bạn có thể sửa từng dòng|Nhận diện cơ bản hoạt động/);
});

test('foreign currency rows retain numeric evidence without VND labels or an enabled handoff',()=>{
 const result=render(true,false,[{name:'Trà',quantity:1,unitPrice:38000,total:38000,confidence:.9}],'Ngoại tệ chưa hỗ trợ');
 assert.doesNotMatch(result.text,/38000 VND/);
 assert.match(result.text,/Ngoại tệ chưa hỗ trợ/);
 const buttons=result.nodes.filter(node=>node.type==='Pressable');
 assert.ok(buttons.some(node=>node.props.disabled===true&&node.children.some(child=>typeof child==='object'&&child!==null&&JSON.stringify(child).includes('Kiểm tra và tạo giao dịch'))));
});

test('ineligible foreign currency receipt still displays its currency warning while hiding transaction inputs',()=>{
 const warning='Hóa đơn có dấu hiệu dùng ngoại tệ. Picket chưa hỗ trợ chuyển hóa đơn này thành giao dịch VND; không tự quy đổi số tiền.';
 const result=render(false,false,[],warning);
 assert.match(result.text,/Hóa đơn có dấu hiệu dùng ngoại tệ/);
 assert.equal(result.nodes.filter(node=>node.type==='TextInput').length,0);
 for(const raw of ['TOTAL AUD 12500','TOTAL CAD 12500','TOTAL ₱12500','TOTAL AED 12500']){
  const audCadWarning=receiptCurrencyWarning(raw);
  assert.match(audCadWarning??'',/ngoại tệ/i,raw);
  const audCadView=render(true,false,[],audCadWarning);
  assert.match(audCadView.text,/Hóa đơn có dấu hiệu dùng ngoại tệ/);
  const buttons=audCadView.nodes.filter(node=>node.type==='Pressable');
  assert.ok(buttons.some(node=>node.props.disabled===true&&node.children.some(child=>typeof child==='object'&&child!==null&&JSON.stringify(child).includes('Kiểm tra và tạo giao dịch'))),raw);
 }
 assert.doesNotMatch(result.text,/Kiểm tra và tạo giao dịch/);
 const observed=render(true,false,[],null,true);
 assert.doesNotMatch(observed.text,/chưa đọc được trên ảnh/);
 const defaulted=render(true,false,[],null,false);
 assert.match(defaulted.text,/Ngày hóa đơn \(chưa đọc được trên ảnh — tạm điền hôm nay\)/);
});
