import assert from "node:assert/strict";
import test from "node:test";
import {parseReceiptLines,parseReceiptText,type ReceiptTextLine} from "./receipt-parser";
import {receiptGeometryRows,receiptLineSlopes,receiptVisualRows} from "./receipt-row-geometry";

// ML Kit shape: each column is its own recognized line with a frame.
const H=20;
const cell=(text:string,left:number,row:number,dy=0,width=text.length*9):ReceiptTextLine=>
  ({text,left,right:left+width,top:row*30+dy,bottom:row*30+dy+H,confidence:.92});
const head=[cell("QUAN AN MAU",100,0),cell("Ngày: 18/02/2026",20,1)];
const items=(lines:ReceiptTextLine[])=>parseReceiptLines(lines).lineItems.map(({name,quantity,unitPrice,total})=>({name,quantity,unitPrice,total}));
const twoColumns=(dy:(row:number)=>number=()=>0)=>[["Ca phe da","10.000"],["Bun thit xao","15.000"],["Com tam","17.000"]]
  .flatMap(([name,price],index)=>[cell(name,20,3+index),cell(price,480,3+index,dy(index),60)]);

test("headerless name | amount rows pair without a total anchor and stay reviewable",()=>{
  const r=parseReceiptLines([...head,...twoColumns()]);
  assert.deepEqual(r.lineItems.map(({name,total})=>({name,total})),[{name:"Ca phe da",total:10000},{name:"Bun thit xao",total:15000},{name:"Com tam",total:17000}]);
  assert.ok(r.lineItems.every(item=>item.confidence<.7),"quantity and unit price are inferred");
  assert.equal(r.amount,null,"never sum lines into a payable total");
  assert.equal(r.needsReview,true);
  assert.deepEqual(parseReceiptText(r.rawText).lineItems.map(item=>item.total),[10000,15000,17000],"draft text keeps the rebuilt rows");
});

test("four headerless columns use observed quantity x unit price = line total",()=>{
  const rows=[["Ca phe da","1","10.000","10.000"],["Bun thit xao","2","15.000","30.000"]].flatMap(([name,quantity,unit,total],index)=>
    [cell(name,20,3+index),cell(quantity,250,3+index,0,10),cell(unit,330,3+index,0,60),cell(total,480,3+index,0,60)]);
  const r=parseReceiptLines([...head,...rows,cell("Tổng:",20,6),cell("40.000",480,6,0,60)]);
  assert.deepEqual(r.lineItems.map(({name,quantity,unitPrice,total})=>({name,quantity,unitPrice,total})),
    [{name:"Ca phe da",quantity:1,unitPrice:10000,total:10000},{name:"Bun thit xao",quantity:2,unitPrice:15000,total:30000}]);
  assert.ok(r.lineItems.every(item=>item.confidence>=.9),"printed arithmetic is observed evidence");
  assert.equal(r.amount,40000);
});

test("contradicting quantity, unit price and total is flagged, never repaired",()=>{
  const lines=[...head,cell("Bun thit xao",20,3),cell("2",250,3,0,10),cell("15.000",330,3,0,60),cell("31.000",480,3,0,60)];
  const r=parseReceiptLines(lines);
  assert.equal(r.lineItems.length,0);
  assert.match(r.reviewReason??"",/không khớp/);
});

test("stacked POS rows (name above SL / price / amount) need no column header",()=>{
  const stacked=[["hanh tim tui 200gr","1","18.600","18.600"],["bot canh vifon goi 200g","1","6.600","6.600"],["banh phong muc goi 100g","4","12.100","48.400"]]
    .flatMap(([name,quantity,unit,total],index)=>[cell(name,20,3+2*index),cell(quantity,40,4+2*index,0,10),cell(unit,250,4+2*index,0,60),cell(total,480,4+2*index,0,60)]);
  assert.deepEqual(items([...head,...stacked,cell("Tổng:",20,10),cell("73.600",480,10,0,60)]),[
    {name:"hanh tim tui 200gr",quantity:1,unitPrice:18600,total:18600},
    {name:"bot canh vifon goi 200g",quantity:1,unitPrice:6600,total:6600},
    {name:"banh phong muc goi 100g",quantity:4,unitPrice:12100,total:48400}]);
});

test("a two-line stacked name is joined; a lone number below a name is not attached",()=>{
  const r=items([...head,cell("nuoc rua chen sunlight",20,3),cell("chai 750gr",20,4),cell("1",40,5,0,10),cell("36.000",250,5,0,60),cell("36.000",480,5,0,60)]);
  assert.deepEqual(r,[{name:"nuoc rua chen sunlight chai 750gr",quantity:1,unitPrice:36000,total:36000}]);
  assert.deepEqual(items([...head,cell("Ghi chu giao hang",20,3),cell("36.000",480,4,4,60)]),[]);
});

test("damaged amounts are never repaired into prices",()=>{
  const r=items([...head,cell("ca that lat nao 200gr",20,3),cell("1",40,4,0,10),cell("55.000",250,4,0,60),cell("55. GOO",480,4,0,60)]);
  assert.deepEqual(r,[]);
});

test("a tilted photo pairs each name with its own price using the baseline slope",()=>{
  const slope=0.06;
  const tilted=(text:string,left:number,row:number,width=text.length*9):ReceiptTextLine=>{
    const words=text.split(" ");let x=left;
    const elements=words.map(word=>{const w=word.length*9,top=row*30+(x+w/2)*slope;const element={text:word,left:x,right:x+w,top,bottom:top+H,confidence:.92};x+=w+9;return element;});
    return {text,left,right:left+width,top:Math.min(...elements.map(e=>e.top)),bottom:Math.max(...elements.map(e=>e.bottom)),confidence:.92,elements};
  };
  const lines=[tilted("QUAN AN MAU",100,0),tilted("Ca phe sua da nong",20,3),tilted("12.000",480,3,60),tilted("Banh mi thit nuong",20,4),tilted("20.000",480,4,60),tilted("Tra dao cam sa",20,5),tilted("25.000",480,5,60)];
  const slopes=[...receiptLineSlopes(lines).values()];
  assert.ok(slopes.every(value=>Math.abs(value-slope)<.01),`estimated ${slopes}`);
  // Without deskewing, each price sits ~1.2 line heights below its name, level with the next row.
  assert.ok(lines[2].top!-lines[1].top!>H);
  assert.deepEqual(items(lines).map(({name,total})=>({name,total})),[{name:"Ca phe sua da nong",total:12000},{name:"Banh mi thit nuong",total:20000},{name:"Tra dao cam sa",total:25000}]);
  assert.equal(receiptVisualRows(lines).filter(row=>row.cells.length===2).length,3);
});

test("without a total anchor, a drifting amount column still never takes the previous product's price",()=>{
  const truth=new Map([["Ca phe da",10000],["Bun thit xao",15000],["Com tam",17000]]);
  for(const drift of [()=>18,()=>24,(index:number)=>8*(index+1)]){
    for(const item of parseReceiptLines([...head,...twoColumns(drift)]).lineItems)assert.equal(item.total,truth.get(item.name),item.name);
  }
});

test("summary, payment and VAT rows are never rebuilt into products",()=>{
  const lines=[...head,cell("Ca phe da",20,3),cell("10.000",480,3,0,60),cell("(VAT; 100",20,4),cell("1.000",480,4,0,60),cell("Khách phải trả",20,5),cell("10.000",480,5,0,60),cell("Tiền mặt",20,6),cell("50.000",480,6,0,60)];
  const r=parseReceiptLines(lines);
  assert.deepEqual(r.lineItems.map(item=>item.name),["Ca phe da"]);
  assert.equal(r.amount,10000);
  assert.deepEqual(receiptGeometryRows(lines).filter(line=>!lines.includes(line)).map(line=>line.text),["Ca phe da 10.000"]);
});

test("a rebuilt row keeps a street-word product name, while an address beside a phone stays out",()=>{
  const r=parseReceiptLines([...head,cell("Đường mía Biên Hòa gói 1kg",20,3),cell("32.000",480,3,0,60),cell("1 Nước Coca-Cola Ít Đường",20,4),cell("28.000",480,4,0,60)]);
  assert.deepEqual(r.lineItems.map(item=>item.total),[32000,28000]);
  assert.deepEqual(parseReceiptText(r.rawText).lineItems.map(item=>item.total),[32000,28000]);
  assert.deepEqual(items([...head,cell("Đường Nguyễn Trãi",20,3),cell("0901234567",330,3,0,100)]),[]);
});
