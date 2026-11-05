import {parseReceiptItemMoney} from "./receipt-money";
import type {ReceiptTextLine} from "./receipt-parser";
import {receiptTableTokens} from "./receipt-table-tokens";
type PositionedLine=ReceiptTextLine&{left:number;right:number;top:number;bottom:number};
const clean=(value:string)=>value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d").replace(/\s+/g," ").replace(/^[|\s]+|[|\s]+$/g,"");
const namePattern=/^(ten\s*(mon|hang|san pham|hang hoa)(?:,?\s*dich vu)?|san pham|mat hang|item|description)$/;
const quantityPattern=/^(sl|s\.l\.?|so luong|qty|quantity)$/;
const unitPattern=/^(don gia|d[.]?g[.]?|gia|unit price|price)$/;
const totalPattern=/^(thanh tien|t[. ]?tien|tt|t tren|amount|total)$/;
const optionalPattern=/^(stt|don vi tinh|dvt|thue suat|\(%\)|bh|bao hanh|giam gia)$/;
function positioned(line:ReceiptTextLine):line is PositionedLine{
 return [line.left,line.right,line.top,line.bottom].every(value=>typeof value==="number"&&Number.isFinite(value))&&line.right!>line.left!&&line.bottom!>line.top!;
}
const centerY=(line:PositionedLine)=>(line.top+line.bottom)/2;
export function receiptHasTableColumns(lines:ReceiptTextLine[]):boolean{
 return [namePattern,quantityPattern,unitPattern,totalPattern].every(pattern=>lines.some(line=>pattern.test(clean(line.text))));
}
/** Headers may be centered; match cells by column bounds and header-relative row offset. */
export function receiptTableRows(lines:ReceiptTextLine[]):ReceiptTextLine[]{
 lines=receiptTableTokens(lines);
 const used=new Set<ReceiptTextLine>(),replacements=new Map<ReceiptTextLine,ReceiptTextLine>();
 const positionedLines=lines.filter(positioned);
 for(const nameHeader of positionedLines.filter(line=>namePattern.test(clean(line.text)))){
  const height=nameHeader.bottom-nameHeader.top;
  const headers=positionedLines.filter(line=>Math.abs(centerY(line)-centerY(nameHeader))<=height*1.5&&
   [namePattern,quantityPattern,unitPattern,totalPattern,optionalPattern].some(pattern=>pattern.test(clean(line.text)))).sort((a,b)=>a.left-b.left);
  const find=(pattern:RegExp)=>{const matches=headers.filter(line=>pattern.test(clean(line.text)));return matches.length===1?matches[0]:undefined;};
  const quantityHeader=find(quantityPattern),unitHeader=find(unitPattern),totalHeader=find(totalPattern);
  if(!quantityHeader||!unitHeader||!totalHeader||new Set([nameHeader,quantityHeader,unitHeader,totalHeader]).size!==4)continue;
  const band=(header:PositionedLine)=>{
   const index=headers.indexOf(header),previous=headers[index-1],next=headers[index+1];
   return {left:previous?(previous.right+header.left)/2:-Infinity,right:next?(header.right+next.left)/2:Infinity};
  };
  const nextNameHeader=headers[headers.indexOf(nameHeader)+1];
  const previousNameHeader=headers[headers.indexOf(nameHeader)-1];
  const nameLeft=previousNameHeader?.right??nameHeader.left-height*2;
  const nameRight=nextNameHeader?(nameHeader.right+nextNameHeader.left)/2:quantityHeader.left;
  const end=Math.min(Infinity,...positionedLines.filter(line=>line.top>nameHeader.bottom&&
   /^(tong|total|subtotal|tien hang|tien thue|tien thanh toan|so tien bang chu)\b/.test(clean(line.text))).map(line=>line.top));
  const body=positionedLines.filter(line=>line.top>nameHeader.bottom&&line.top<end&&!used.has(line));
  const column=(header:PositionedLine)=>{const bounds=band(header);return body.filter(line=>(line.left+line.right)/2>=bounds.left&&(line.left+line.right)/2<bounds.right);};
  const corrected=(line:PositionedLine,header:PositionedLine)=>centerY(line)-(centerY(header)-centerY(nameHeader));
  const unitCells=column(unitHeader),quantityCells=column(quantityHeader);
  const totals=column(totalHeader).filter(line=>/^\d[\d.,\s]*(?:vnd|đ|d|₫)?$/i.test(line.text.trim()));
  const names=body.filter(line=>line.left>=nameLeft-height*0.25&&(line.left+line.right)/2<nameRight&&/[A-Za-zÀ-ỹ]/.test(line.text));
  const partsByTotal=new Map<PositionedLine,PositionedLine[]>();
  const rowPositions=totals.map(total=>({total,y:corrected(total,totalHeader)}));
  for(const name of names){
   let nearest:PositionedLine|undefined,best=Infinity,second=Infinity;
   for(const row of rowPositions){
    const distance=Math.abs(centerY(name)-row.y);
    if(distance<best){second=best;best=distance;nearest=row.total;}else if(distance<second)second=distance;
   }
   if(nearest&&best<=Math.max(name.bottom-name.top,nearest.bottom-nearest.top)&&second-best>2){
    const parts=partsByTotal.get(nearest)??[];parts.push(name);partsByTotal.set(nearest,parts);
   }
  }
  for(const total of totals){
   const rowY=corrected(total,totalHeader);
   const cells=(header:PositionedLine)=> (header===unitHeader?unitCells:quantityCells).filter(line=>
    Math.abs(corrected(line,header)-rowY)<=Math.max(line.bottom-line.top,total.bottom-total.top)*0.85);
   const units=cells(unitHeader),quantities=cells(quantityHeader);
   if(units.length>1||quantities.length>1)continue;
   const numeric=(line:ReceiptTextLine|undefined)=>{
    const text=line?.text.replace(/^[|│]+|[|│]+$/g, "").trim();
    return text&&/^\d[\d.,\s]*(?:vnd|đ|d|₫)?$/i.test(text)?parseReceiptItemMoney(text):null;
   };
   const amount=numeric(total);let unit=numeric(units[0]);
   let quantity=quantities[0]&&/^\d+(?:[.,]\d+)?$/.test(quantities[0].text.trim())?Number(quantities[0].text.replace(',', '.')):null;
   let inferred=false;
   if(amount===null)continue;
   if(quantity===null&&unit!==null&&unit>0){quantity=Math.round(amount/unit);inferred=true;}
   else if(unit===null&&quantity!==null&&quantity>0){unit=amount/quantity;inferred=true;}
   if(quantity===null||unit===null||!Number.isFinite(quantity)||quantity<=0||quantity>1_000_000||inferred&&!Number.isSafeInteger(unit)||Math.abs(quantity*unit-amount)>1){
    const unresolved=(partsByTotal.get(total)??[])[0];
    if(unresolved&&amount>0&&quantity!==null&&quantity>0&&unit!==null&&(inferred&&!Number.isSafeInteger(unit)||Math.abs(quantity*unit-amount)>1))
     replacements.set(unresolved,{...unresolved,reviewIssue:"inconsistent-item"});
    continue;
   }
   const parts=(partsByTotal.get(total)??[]).sort((a,b)=>a.top-b.top);
   if(parts.length===0)continue;
   const name=parts[0],text=parts.map(part=>part.text).join(" ");
   replacements.set(name,{...name,text:`${text} ${quantity} x ${unit} | ${amount}`,confidence:inferred?0.55:name.confidence,right:total.right});
   parts.slice(1).forEach(part=>used.add(part));[...quantities,...units,total].forEach(cell=>used.add(cell));
  }
 }
 return lines.filter(line=>!used.has(line)).map(line=>replacements.get(line)??line);
}
