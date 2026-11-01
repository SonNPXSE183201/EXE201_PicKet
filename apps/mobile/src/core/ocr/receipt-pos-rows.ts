import type {ReceiptTextLine} from "./receipt-parser";
import {parseReceiptItemMoney} from "./receipt-money";
import {isReceiptMetadata,isReceiptSummary,isReceiptDocumentLabel,normalizeReceiptLabel} from "./receipt-semantics";

type Box=ReceiptTextLine&{left:number;right:number;top:number;bottom:number};
const positioned=(line:ReceiptTextLine):line is Box=>[line.left,line.right,line.top,line.bottom].every(n=>typeof n==='number'&&Number.isFinite(n))&&line.right!>line.left!&&line.bottom!>line.top!;
const cy=(line:Box)=>(line.top+line.bottom)/2;

/** Stacked POS rows: name above quantity/price, with an explicit quantity + amount header. */
export function receiptPosRows(lines:ReceiptTextLine[]):ReceiptTextLine[]{
 const boxes=lines.filter(positioned),used=new Set<ReceiptTextLine>(),replace=new Map<ReceiptTextLine,ReceiptTextLine>();
 for(const quantityHeader of boxes.filter(line=>/^(sl|s[.]l[.]?|so luong|qty|quantity)$/.test(normalizeReceiptLabel(line.text)))){
  const h=quantityHeader.bottom-quantityHeader.top;
  const headers=boxes.filter(line=>line.left>quantityHeader.right&&Math.abs(cy(line)-cy(quantityHeader))<=h*2&&/^(thanh\s*ti[eêi]n|thanh\s*tin|t[. ]?ti[eêi]n|tong|t[o0]ng|amount|total)$/.test(normalizeReceiptLabel(line.text)));
  if(headers.length!==1)continue;const totalHeader=headers[0];
  const end=Math.min(Infinity,...boxes.filter(line=>line.top>quantityHeader.bottom&&isReceiptSummary(line.text)).map(line=>line.top));
  const body=boxes.filter(line=>line.top>Math.max(quantityHeader.bottom,totalHeader.bottom)&&line.top<end&&!used.has(line));
  const totals=body.filter(line=>(line.left+line.right)/2>=totalHeader.left-h&&parseReceiptItemMoney(line.text)!==null);
  for(const total of totals){
   const rowHeight=Math.max(total.bottom-total.top,h),rowY=cy(total)-(cy(totalHeader)-cy(quantityHeader));
   const inRow=(line:Box)=>Math.abs(cy(line)-rowY)<=rowHeight*1.25;
   const quantities=body.filter(line=>line.left>=quantityHeader.left-h&&line.right<quantityHeader.right+h*2&&inRow(line)&&/^\d+(?:[.,]\d+)?$/.test(line.text.trim()));
   const parseUnit=(text:string)=>{const s=text.replace(/\s*\(vat[^)]*\)\s*$/i,'').trim();const d=parseReceiptItemMoney(s);if(d!==null)return d;const p=s.split(/\s+/);return p.length===2?parseReceiptItemMoney(p[1]):null;};
   const prices=body.filter(line=>line.left>quantityHeader.right+h&&line.right<totalHeader.left&&inRow(line)&&parseUnit(line.text)!==null);
   if(quantities.length!==1||prices.length>1)continue;
   const q=Number(quantities[0].text.replace(',','.')),amount=parseReceiptItemMoney(total.text)!,unit=prices.length===1?parseUnit(prices[0].text)!:q>0&&Number.isSafeInteger(amount/q)?amount/q:null;
   if(unit===null||q<=0||q>1_000_000||Math.abs(q*unit-amount)>1)continue;
   const names=body.filter(line=>line.left<(prices[0]?.left??total.left)&&cy(line)<=rowY+rowHeight*.5&&rowY-cy(line)<=rowHeight*2&&!used.has(line)&&
    line.text.replace(/[^A-Za-zÀ-ỹ]/g,'').length>=3&&!isReceiptMetadata(line.text)&&!isReceiptSummary(line.text)&&!isReceiptDocumentLabel(line.text));
   names.sort((a,b)=>Math.abs(cy(a)-rowY)-Math.abs(cy(b)-rowY));
   if(!names.length||names.length>1&&Math.abs(cy(names[0])-cy(names[1]))<rowHeight*.25)continue;
   const name=names[0];
   replace.set(name,{...name,text:`${name.text} ${q} x ${unit} | ${amount}`,confidence:Math.min(prices.length===0?.55:1,...[name,quantities[0],...(prices[0]?[prices[0]]:[]),total].map(line=>line.confidence??.75)),right:total.right});
   used.add(total);if(prices[0])used.add(prices[0]);used.add(quantities[0]);

  }
 }
 return lines.filter(line=>!used.has(line)).map(line=>replace.get(line)??line);
}
