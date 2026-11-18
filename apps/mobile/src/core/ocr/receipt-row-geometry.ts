import type {ReceiptTextLine} from "./receipt-parser";
import {parseReceiptItemMoney} from "./receipt-money";
import {isReceiptDocumentLabel,isReceiptMetadata,isReceiptSummary,normalizeReceiptLabel,receiptBodyStart,receiptNameHasWord} from "./receipt-semantics";
import {looksLikeContactAmount} from "./receipt-total-role";

type Box=ReceiptTextLine&{left:number;right:number;top:number;bottom:number};
type Kind="name"|"values"|"priced"|"blocked";
type Token={raw:string;money:number|null;quantity:number|null};
type Cell={line:Box;kind:Kind;cx:number;cy:number;y:number;height:number;tokens:Token[]};
export type ReceiptVisualRow={y:number;cells:Box[]};

const maxSlope=Math.tan(15*Math.PI/180);
const positioned=(line:ReceiptTextLine):line is Box=>[line.left,line.right,line.top,line.bottom].every(value=>typeof value==="number"&&Number.isFinite(value))&&line.right!>line.left!&&line.bottom!>line.top!;
const median=(values:number[])=>{const sorted=[...values].sort((a,b)=>a-b);return sorted.length?sorted[Math.floor(sorted.length/2)]:0;};
const letters=(text:string)=>text.replace(/[^A-Za-zÀ-ỹ]/g,"").length;
const clamp=(slope:number)=>Math.max(-maxSlope,Math.min(maxSlope,slope));
// Payment and summary words anywhere in a name row; such rows are never products.
const paymentWords=/\b(?:tong|total|thanh toan|phai tra|can tra|khach dua|tien (?:mat|khach|thua|tra lai)|tra lai|change|cash)\b/;

/** Least-squares slope of one recognized line from its word boxes (sign-free, no angle convention). */
function lineSlope(line:Box):number|null{
  const words=(line.elements??[]).filter(word=>[word.left,word.right,word.top,word.bottom].every(Number.isFinite)&&word.right>word.left&&word.bottom>word.top);
  if(words.length<2)return null;
  const height=median(words.map(word=>word.bottom-word.top));
  const xs=words.map(word=>(word.left+word.right)/2),ys=words.map(word=>(word.top+word.bottom)/2);
  if(Math.max(...xs)-Math.min(...xs)<height*3)return null;
  const mx=xs.reduce((sum,x)=>sum+x,0)/xs.length,my=ys.reduce((sum,y)=>sum+y,0)/ys.length;
  let numerator=0,denominator=0;
  for(let index=0;index<xs.length;index++){numerator+=(xs[index]-mx)*(ys[index]-my);denominator+=(xs[index]-mx)**2;}
  return denominator>0?clamp(numerator/denominator):null;
}

/**
 * Local baseline slope for every line: measured from its own words when possible,
 * otherwise from the nearest measured lines above/below (handles curved paper),
 * otherwise from the recognizer's line angle (ML Kit: clockwise positive).
 */
export function receiptLineSlopes(lines:ReceiptTextLine[]):Map<ReceiptTextLine,number>{
  const boxes=lines.filter(positioned);
  const measured=boxes.flatMap(line=>{const slope=lineSlope(line);return slope===null?[]:[{cy:(line.top+line.bottom)/2,slope}];});
  const angles=boxes.flatMap(line=>typeof line.angle==="number"&&Number.isFinite(line.angle)&&Math.abs(line.angle)<=15?[Math.tan(line.angle*Math.PI/180)]:[]);
  const fallback=angles.length?clamp(median(angles)):0;
  const result=new Map<ReceiptTextLine,number>();
  for(const line of boxes){
    const own=lineSlope(line);
    if(own!==null){result.set(line,own);continue;}
    if(!measured.length){result.set(line,fallback);continue;}
    const cy=(line.top+line.bottom)/2;
    const nearest=[...measured].sort((a,b)=>Math.abs(a.cy-cy)-Math.abs(b.cy-cy)).slice(0,3);
    result.set(line,median(nearest.map(sample=>sample.slope)));
  }
  return result;
}

/** One value token: a clean amount, a quantity, or unreadable digits (likely a damaged quantity). */
function tokensOf(text:string):Token[]|null{
  // VAT notes printed beside a unit price never carry the line amount.
  const clean=text.replace(/\s*\((?=[^)]*[A-Za-z])[^)]*\)?\s*$/,"").replace(/\s*(?:vnd|đ|₫)\s*$/i,"").trim();
  if(!clean||!/\d/.test(clean))return null;
  const whole=parseReceiptItemMoney(clean);
  if(whole!==null&&/^[\d.,\s]+$/.test(clean))return [{raw:clean,money:whole,quantity:/^\d{1,4}(?:[.,]\d{1,3})?$/.test(clean)?Number(clean.replace(",",".")):null}];
  const parts=clean.split(/\s+/);
  const tokens:Token[]=[];
  for(const part of parts){
    const raw=part;
    if(/^-?\d[\d.,]*$/.test(raw)){
      const negative=raw.startsWith("-"),body=negative?raw.slice(1):raw;
      const money=parseReceiptItemMoney(body);
      const quantity=/^\d{1,4}(?:[.,]\d{1,3})?$/.test(body)?Number(body.replace(",",".")):null;
      tokens.push({raw,money:money===null?null:negative?-money:money,quantity:negative?null:quantity});
      continue;
    }
    // A damaged numeric cell ("c, 18", "S 00", "55. GOO") stays unreadable: never repaired into a price.
    if(/\d/.test(part)&&letters(part)<=2&&part.length<=8||/^[oOcCGQD]{2,3}[.,]?$/.test(part)){tokens.push({raw:part,money:null,quantity:null});continue;}
    return null;
  }
  return tokens.length?tokens:null;
}

function classify(line:Box):{kind:Kind;tokens:Token[]}{
  const text=line.text.trim();
  if(line.reviewIssue||/\|\s*\d[\d.,\s]*$/.test(text))return {kind:"blocked",tokens:[]};
  if(looksLikeContactAmount(text))return {kind:"blocked",tokens:[]};
  const tokens=tokensOf(text);
  if(tokens)return {kind:"values",tokens};
  const label=normalizeReceiptLabel(text).replace(/^[^a-z0-9]+/,"");
  if(letters(text)<3)return {kind:"blocked",tokens:[]};
  // A line that already ends with its own amount is handled by the plain-row reader.
  if(/(?:^|\s)\d{1,3}(?:[.,]\d{3})+\s*(?:vnd|đ|₫)?\s*$/i.test(text))return {kind:"priced",tokens:[]};
  if(isReceiptSummary(label)||isReceiptDocumentLabel(label)||paymentWords.test(label)||!receiptNameHasWord(text))return {kind:"blocked",tokens:[]};
  return {kind:"name",tokens:[]};
}

/** Group recognized lines into visual rows after removing local baseline slope. */
export function receiptVisualRows(lines:ReceiptTextLine[]):ReceiptVisualRow[]{
  return buildRows(lines.filter(positioned).map(line=>({line,kind:"name" as Kind,tokens:[]})),receiptLineSlopes(lines)).map(row=>({y:row.y,cells:row.cells.map(cell=>cell.line)}));
}

function buildRows(entries:{line:Box;kind:Kind;tokens:Token[]}[],slopes:Map<ReceiptTextLine,number>){
  if(!entries.length)return [];
  const pivot=median(entries.map(({line})=>(line.left+line.right)/2));
  const height=median(entries.map(({line})=>line.bottom-line.top))||1;
  const cells:Cell[]=entries.map(({line,kind,tokens})=>{
    const cx=(line.left+line.right)/2,cy=(line.top+line.bottom)/2;
    return {line,kind,tokens,cx,cy,height:line.bottom-line.top,y:cy-(cx-pivot)*(slopes.get(line)??0)};
  }).sort((a,b)=>a.y-b.y);
  const rows:{y:number;cells:Cell[]}[]=[];
  for(const cell of cells){
    const tolerance=Math.min(cell.height,height)*0.5;
    const candidates=rows.filter(row=>Math.abs(row.y-cell.y)<=tolerance);
    // A cell between two rows is ambiguous; keep it alone rather than guess.
    if(candidates.length===1&&!candidates[0].cells.some(other=>Math.min(other.line.right,cell.line.right)-Math.max(other.line.left,cell.line.left)>0)){
      const row=candidates[0];row.cells.push(cell);row.y=row.cells.reduce((sum,item)=>sum+item.y,0)/row.cells.length;
    } else rows.push({y:cell.y,cells:[cell]});
  }
  for(const row of rows)row.cells.sort((a,b)=>a.line.left-b.line.left);
  return rows.sort((a,b)=>a.y-b.y);
}

type Reading={quantity:number;unit:number;total:number;observed:boolean}|"conflict"|null;

/** Interpret value cells right of a name. The rightmost amount is the line total. */
function readValues(tokens:Token[],leading:Token[]):Reading{
  const lastIndex=tokens.map(token=>token.money!==null&&token.money>=0).lastIndexOf(true);
  if(lastIndex<0||lastIndex!==tokens.length-1)return null;
  const total=tokens[lastIndex].money!;
  const others=[...leading,...tokens.slice(0,lastIndex)];
  const unreadable=others.some(token=>token.money===null&&token.quantity===null);
  for(const q of others)for(const u of others){
    if(q===u||q.quantity===null||q.quantity<=0||q.quantity>1_000_000||u.money===null||u.money<0)continue;
    if(Math.abs(q.quantity*u.money-total)<=1&&(total>0||u.money===0))return {quantity:q.quantity,unit:u.money,total,observed:true};
  }
  const discount=others.find(token=>token.money!==null&&token.money<0);
  if(discount)for(const q of others)for(const u of others){
    if(q===u||q.quantity===null||q.quantity<=0||u.money===null||u.money<=0)continue;
    if(Math.abs(q.quantity*u.money+discount.money!-total)<=1)return {quantity:1,unit:total,total,observed:false};
  }
  const amounts=others.filter(token=>token.money!==null&&token.money>0&&!/^\d{1,2}$/.test(token.raw));
  const quantities=others.filter(token=>token.quantity!==null&&token.quantity>0&&/^\d{1,4}(?:[.,]\d{1,3})?$/.test(token.raw)&&!amounts.includes(token));
  if(total===0)return null;
  if(amounts.length===0){
    if(quantities.length===1){
      const unit=total/quantities[0].quantity!;
      return Number.isSafeInteger(unit)?{quantity:quantities[0].quantity!,unit,total,observed:false}:"conflict";
    }
    return quantities.length===0?{quantity:1,unit:total,total,observed:false}:null;
  }
  if(amounts.every(token=>token.money===total))return {quantity:1,unit:total,total,observed:false};
  // A second, unexplained amount is ambiguous unless a damaged cell may be its quantity.
  if(unreadable&&amounts.length===1)return {quantity:1,unit:total,total,observed:false};
  return quantities.length>0?"conflict":null;
}

// Printed VND grouping keeps a rebuilt row recognizable as a priced row after a text-only re-parse.
const groupedAmount=(value:number)=>String(value).replace(/\B(?=(\d{3})+(?!\d))/g,".");
const valueTokens=(cells:Cell[])=>cells.flatMap(cell=>cell.tokens);

/**
 * Rebuild product rows from geometry, without headers or a total anchor.
 * - Same visual row: name on the left, value cells on the right.
 * - Stacked POS: a name row (optionally two lines) directly above a row of values only.
 * The row is rewritten as "name q x unit | total" or "name total" and consumed
 * value lines are removed. Ambiguous rows are left untouched.
 */
export function receiptGeometryRows(lines:ReceiptTextLine[]):ReceiptTextLine[]{
  const boxes=lines.filter(positioned);
  if(boxes.length<2)return lines;
  const {top:bodyTop}=receiptBodyStart(lines);
  const summaryTop=Math.min(Infinity,...boxes.filter(line=>(typeof bodyTop!=="number"||line.top>bodyTop)&&isReceiptSummary(line.text)).map(line=>line.top));
  const entries=boxes.filter(line=>line.top<summaryTop).map(line=>({line,...classify(line)}));
  const rows=buildRows(entries,receiptLineSlopes(lines));
  const height=median(entries.map(({line})=>line.bottom-line.top))||1;
  const used=new Set<ReceiptTextLine>(),replacements=new Map<ReceiptTextLine,ReceiptTextLine>();
  const emit=(names:Cell[],values:Cell[],reading:Exclude<Reading,null|"conflict">,stacked:boolean)=>{
    const name=names.map(cell=>cell.line.text.trim()).join(" ");
    const text=reading.observed||reading.quantity!==1||reading.total===0?`${name} ${reading.quantity} x ${reading.unit} | ${reading.total}`:`${name} ${groupedAmount(reading.total)}`;
    if(isReceiptMetadata(text))return;
    const parts=[...names,...values].map(cell=>cell.line);
    const evidence=Math.min(...parts.map(line=>line.confidence??0.75));
    const first=names[0].line;
    replacements.set(first,{...first,text,
      left:Math.min(...parts.map(line=>line.left)),right:Math.max(...parts.map(line=>line.right)),
      bottom:Math.max(...parts.map(line=>line.bottom)),
      // Inferred quantity/unit price stays visibly lower confidence; stacked pairing is weaker evidence.
      confidence:reading.observed?Math.min(evidence,stacked?0.85:1):Math.min(evidence,0.55)});
    for(const cell of names.slice(1))used.add(cell.line);
    for(const cell of values)used.add(cell.line);
  };
  let pending:Cell[]=[],pendingY=-Infinity;
  const valuesOnly=(row:{cells:Cell[]})=>row.cells.every(cell=>cell.kind==="values");
  for(let index=0;index<rows.length;index++){
    const row=rows[index];
    const names=row.cells.filter(cell=>cell.kind==="name");
    let values=row.cells.filter(cell=>cell.kind==="values");
    const blocked=row.cells.some(cell=>cell.kind==="blocked"||cell.kind==="priced");
    // Under a stacked name, tilt can split one value row into close fragments; rejoin them
    // when they are disjoint columns within about one line height.
    if(names.length===0&&!blocked&&pending.length>0)while(index+1<rows.length&&valuesOnly(rows[index+1])&&rows[index+1].y-row.y<=height*1.1&&
      rows[index+1].cells.every(cell=>values.every(other=>Math.min(other.line.right,cell.line.right)-Math.max(other.line.left,cell.line.left)<=0)))
      values=[...values,...rows[++index].cells].sort((a,b)=>a.line.left-b.line.left);
    if(names.length===1&&values.length>0&&!blocked){
      const name=names[0],leading=values.filter(cell=>cell.line.right<=name.line.left+height*0.5);
      const trailing=values.filter(cell=>cell.line.left>=name.line.right-height*0.5);
      // Values clearly above this name, right under an unpriced name, may belong to that name.
      const drifted=pending.length>0&&row.y-pendingY<=height*2&&trailing.some(cell=>cell.y<name.y-height*0.25);
      // The skipped name stays unpriced, so the same doubt carries to the next row down.
      if(drifted){pending=[name];pendingY=name.y;continue;}
      if(!drifted&&leading.length+trailing.length===values.length&&trailing.length>0){
        const lead=valueTokens(leading);
        const reading=lead.every(token=>token.quantity!==null&&token.money===null||/^\d{1,3}(?:[.,]\d{1,3})?$/.test(token.raw))?readValues(valueTokens(trailing),lead):null;
        if(reading&&reading!=="conflict")emit([name],[...leading,...trailing],reading,false);
        else if(reading==="conflict")replacements.set(name.line,{...name.line,reviewIssue:"inconsistent-item"});
      }
      pending=[];continue;
    }
    if(names.length===0&&values.length>0&&!blocked&&pending.length>0&&row.y-pendingY<=height*2.4&&row.y-pendingY>=height*0.6){
      const tokens=valueTokens(values);
      // A stacked value row needs its own structure (two or more cells), never a lone number.
      const reading=tokens.length>=2&&values[0].line.left>=Math.min(...pending.map(cell=>cell.line.left))-height*2?readValues(tokens,[]):null;
      if(reading&&reading!=="conflict")emit(pending,values,reading,true);
      pending=[];continue;
    }
    if(names.length===1&&values.length===0&&!blocked){
      const name=names[0];
      // Up to two stacked name lines that start near the same left edge form one product name.
      if(pending.length===1&&row.y-pendingY<=height*1.8&&Math.abs(pending[0].line.left-name.line.left)<=height*4)pending=[...pending,name];
      else pending=[name];
      pendingY=row.y;continue;
    }
    pending=[];
  }
  if(replacements.size===0)return lines;
  return lines.filter(line=>!used.has(line)).map(line=>replacements.get(line)??line);
}
