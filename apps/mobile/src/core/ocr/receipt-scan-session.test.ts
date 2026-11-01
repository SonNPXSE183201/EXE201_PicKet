import assert from "node:assert/strict";
import test from "node:test";
import {scanReceiptSession,type ReceiptOcrSession,type OcrSample} from "./receipt-scan-session";
import type {ReceiptTextLine} from "./receipt-parser";
const cell=(text:string,left:number,top:number,width=70):ReceiptTextLine=>({text,left,right:left+width,top,bottom:top+15});
function vat():OcrSample{return {width:1000,height:1400,lines:[
 cell('PICKET DEMO',10,10,200),cell('HÓA ĐƠN',10,35,200),cell('Tên hàng hoá, dịch vụ',80,100,220),cell('Số lượng',440,100),cell('Đơn giá',590,100),cell('Thành tiền',780,100,110),
 cell('Bánh mẫu',60,160,200),cell('2',460,160,20),cell('25.000',620,160),cell('50.000',820,160),
 cell('Tiền hàng:',10,1000,130),cell('Tiền thuế:',10,1030,130),cell('Tiền thanh toán:',10,1060,160),cell('Tổng cộng',780,960,120),cell('50.000',820,1000),cell('4.000',820,1030),cell('54.000',820,1060),
 ]};}
function harness(options:{strongAt?:number;slow?:boolean;throwPreview?:boolean}={}){
 let clock=0;const events:string[]=[];
 const native:ReceiptOcrSession={open:async()=>{events.push('open');return {id:'test',width:3000,height:4200};},
 direction:async()=>{events.push('direction');if(options.slow)clock=25000;if(options.throwPreview)throw new Error('failed');return {...vat(),lines:vat().lines.map(line=>({...line,angle:options.strongAt===180?180:0,confidence:0.95}))};},
 inspect:async()=>{events.push('inspect');return vat();},
 select:async(_id,angle)=>{events.push(`select:${angle}`);return {width:3000,height:4200};},
crop:async()=>{events.push('crop');return {width:3000,height:600,lines:[]};},close:async()=>{events.push('close');}};
 return {native,events,now:()=>clock};
}
test('upright VAT reads direction thumbnail, full text and at most one detail crop',async()=>{
 const app=harness();const result=await scanReceiptSession('file:///sample.jpg',app.native,app.now);
 assert.equal(result.draft.amount,54000);assert.equal(app.events.filter(e=>e==='direction').length,1);assert.equal(app.events.filter(e=>e==='inspect').length,1);assert.equal(app.events.filter(e=>e.startsWith('preview:')).length,0);
 assert.equal(result.stats.fullReads,1);assert.equal(app.events.filter(e=>e==='crop').length,1);assert.equal(app.events[0],'open');assert.equal(app.events.at(-1),'close');
});

test('a fully observed table matching payable total skips redundant detail OCR',async()=>{
 const app=harness();
 app.native.inspect=async()=>{app.events.push('inspect');return {...vat(),lines:vat().lines.map(line=>line.text==='4.000'?{...line,text:'0'}:line.text==='54.000'?{...line,text:'50.000'}:line)};};
 const result=await scanReceiptSession('file:///sample.jpg',app.native,app.now);
 assert.equal(result.draft.amount,50000);
 assert.equal(result.draft.lineItems.length,1);
 assert.equal(result.stats.cropReads,0);
 assert.equal(app.events.at(-1),'close');
});

test('a reused native read is counted separately from the inspect bridge call',async()=>{
 const app=harness();
 app.native.inspect=async()=>({...vat(),reused:true});
 const result=await scanReceiptSession('file:///sample.jpg',app.native,app.now);
 assert.equal(result.stats.fullReads,1);
 assert.equal(result.stats.nativeCacheHits,1);
 assert.equal(result.draft.amount,54000);
 assert.equal(app.events.at(-1),'close');
});
test('upside-down VAT re-reads only the selected direction before trusting its text',async()=>{
 const app=harness({strongAt:180});const result=await scanReceiptSession('file:///sample.jpg',app.native,app.now);
 assert.equal(result.draft.amount,54000);assert.equal(app.events.filter(e=>e==='direction').length,1);assert.equal(app.events.filter(e=>e==='inspect').length,1);assert.equal(app.events.filter(e=>e.startsWith('preview:')).length,0);assert.ok(app.events.includes('select:180'));assert.equal(result.stats.fullReads,1);
});
test('no new native OCR or detail work starts after the processing budget expires',async()=>{
 const app=harness({slow:true});await assert.rejects(()=>scanReceiptSession('file:///sample.jpg',app.native,app.now),/OCR_TIMEOUT/);
 assert.deepEqual(app.events,['open','direction','close']);
});
test('failed native OCR always closes the sole image session',async()=>{
 const app=harness({throwPreview:true});await assert.rejects(()=>scanReceiptSession('file:///sample.jpg',app.native,app.now));assert.equal(app.events.at(-1),'close');
});

test('native direction and the initial full-image reading do not trigger a duplicate full pass',async()=>{
 const app=harness({strongAt:999});const result=await scanReceiptSession('file:///sample.jpg',app.native,app.now);
 assert.equal(result.draft.amount,54000);assert.equal(result.stats.fullReads,1);
});
test('leaving the scan cancels subsequent OCR work and closes the session',async()=>{
 const app=harness(),controller=new AbortController();const original=app.native.direction;
 app.native.direction=async(...args)=>{const result=await original(...args);controller.abort();return result;};
 await assert.rejects(()=>scanReceiptSession('file:///sample.jpg',app.native,app.now,controller.signal),/OCR_CANCELLED/);
 assert.deepEqual(app.events,['open','direction','close']);
});

test('a full read exhausting the budget keeps its draft and starts no crop',async()=>{
 const app=harness();let clock=0;const inspect=app.native.inspect;
 app.native.inspect=async(...args)=>{const sample=await inspect(...args);clock=25000;return sample;};
 const result=await scanReceiptSession('file:///sample.jpg',app.native,()=>clock);
 assert.equal(result.draft.amount,54000);assert.equal(result.budgetExceeded,true);assert.equal(result.draft.needsReview,true);
 assert.deepEqual(app.events,['open','direction','select:0','inspect','close']);
});

test('an unreadable VAT total gets one bounded summary retry without repeating full-image OCR',async()=>{
 const app=harness();
 app.native.inspect=async()=>{app.events.push('inspect');return {...vat(),lines:vat().lines.filter(line=>!(line.top!>=1000&&/^\d/.test(line.text)))};};
 const regions:{originY:number}[]=[];
 app.native.crop=async(_id,region)=>{
  app.events.push('crop');regions.push(region);
  return {width:1000,height:region.height,lines:region.originY>=800?vat().lines.filter(line=>line.top!>=960).map(line=>({...line,top:line.top!-region.originY,bottom:line.bottom!-region.originY})):[]};
 };
 const result=await scanReceiptSession('file:///sample.jpg',app.native,app.now);
 assert.equal(result.draft.amount,54000);
 assert.equal(app.events.filter(event=>event==='inspect').length,1);
 assert.equal(regions.filter(region=>region.originY>=800).length,1);
 assert.ok(regions.length<=2);
});

test('a missing thumbnail direction can use verified upright full-text direction',async()=>{
 const app=harness();app.native.direction=async()=>{app.events.push('direction');return {width:100,height:100,lines:[]};};
 app.native.inspect=async()=>{app.events.push('inspect');return {width:1000,height:1400,lines:[
  cell('PICKET DEMO',10,10,200),cell('Ngày 26/10/2026',10,40,250),cell('Tổng cộng 54.000',10,200,300),
 ].map(line=>({...line,angle:0,confidence:0.95}))};};
 const result=await scanReceiptSession('file:///sample.jpg',app.native,app.now);
 assert.equal(result.draft.amount,54000);assert.equal(result.stats.fullReads,1);
});

test('unknown direction keeps partial OCR evidence and requires manual review instead of aborting',async()=>{
 const app=harness();app.native.direction=async()=>{app.events.push('direction');return {width:100,height:100,lines:[]};};
 app.native.inspect=async()=>{app.events.push('inspect');return {width:300,height:600,lines:[
  {...cell('PICKET DEMO',10,10,120),angle:0,confidence:0.3},
  {...cell('Tổng thanh toán 54.000',10,500,260),angle:0,confidence:0.3},
 ]};};
 app.native.crop=async()=>{app.events.push('crop');return {width:300,height:100,lines:[]};};
 const result=await scanReceiptSession('file:///sample.jpg',app.native,app.now);
 assert.equal(result.draft.amount,54000);
 assert.equal(result.draft.needsReview,true);
 assert.match(result.draft.reviewReason??'',/hướng ảnh/i);
 assert.deepEqual(app.events,['open','direction','select:0','inspect','close']);
});

test('a wrong thumbnail rotation is corrected once from full-text direction before trusting values',async()=>{
 const app=harness({strongAt:180});let reads=0;
 app.native.inspect=async()=>{app.events.push('inspect');reads++;return {...vat(),lines:vat().lines.map(line=>({...line,angle:reads===1?180:0,confidence:0.95}))};};
 const result=await scanReceiptSession('file:///sample.jpg',app.native,app.now);
 assert.equal(result.draft.amount,54000);assert.equal(result.stats.fullReads,2);
 assert.equal(app.events.filter(event=>event==='select:180').length,2);
 assert.equal(app.events.filter(event=>event==='inspect').length,2);
 assert.equal(app.events.at(-1),'close');
});

test('wrong full-text direction preserves the parsed draft with a review warning when the budget is exhausted',async()=>{
 const app=harness();let clock=0;
 app.native.inspect=async()=>{app.events.push('inspect');clock=25000;return {...vat(),lines:vat().lines.map(line=>({...line,angle:180,confidence:0.95}))};};
 const result=await scanReceiptSession('file:///sample.jpg',app.native,()=>clock);
 assert.equal(result.draft.amount,54000);assert.equal(result.draft.needsReview,true);assert.equal(result.budgetExceeded,true);
 assert.equal(app.events.filter(event=>event==='inspect').length,1);assert.equal(app.events.at(-1),'close');
});

test('unresolved full-text rotation preserves readable evidence for manual review and still retries an explicit total crop',async()=>{
 const app=harness();
 app.native.direction=async()=>{app.events.push('direction');return {width:100,height:100,lines:[]};};
 app.native.inspect=async()=>{app.events.push('inspect');return {width:1000,height:1400,lines:[
  {...cell('PICKET DEMO',10,10,200),angle:180,confidence:.95},
  {...cell('HÓA ĐƠN',10,35,200),angle:180,confidence:.95},
  {...cell('Ngày 26/10/2026',10,60,250),angle:180,confidence:.95},
  {...cell('Teng thanh toan:',10,1000,240),angle:180,confidence:.95},
 ]};};
 app.native.crop=async(_id,region)=>{app.events.push('crop');return {width:1000,height:region.height,lines:[
  cell('Teng thanh toan:',10,1000-region.originY,240),cell('54.000',820,1000-region.originY,100),
 ]};};
 const result=await scanReceiptSession('file:///sample.jpg',app.native,app.now);
 assert.equal(result.draft.amount,54000);
 assert.equal(result.draft.needsReview,true);
 assert.match(result.draft.reviewReason??'',/hướng ảnh/i);
 assert.equal(result.stats.summaryReads,1);
 assert.ok(app.events.includes('crop'));
 assert.equal(app.events.filter(event=>event==='inspect').length,2);
 assert.equal(app.events.at(-1),'close');
});
