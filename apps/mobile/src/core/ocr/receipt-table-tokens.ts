import type {ReceiptTextLine} from "./receipt-parser";
import {normalizeReceiptLabel} from "./receipt-semantics";

const header=/^(mat hang|ten mon|ten hang|ten san pham|ten hang hoa|description|item|sl|so luong|qty|quantity|don gia|gia|d[.]?g[.]?|unit price|price|thanh tien|t[. ]?tien|tt|amount|total)$/;
const nameHeader=/^(mat hang|ten mon|ten hang|ten san pham|ten hang hoa|description|item)$/;
const quantityHeader=/^(sl|so luong|qty|quantity)$/;
const totalHeader=/^(thanh tien|t[. ]?tien|tt|amount|total)$/;
function combine(parts:NonNullable<ReceiptTextLine['elements']>):ReceiptTextLine{
 return {text:parts.map(p=>p.text).join(' '),left:Math.min(...parts.map(p=>p.left)),right:Math.max(...parts.map(p=>p.right)),top:Math.min(...parts.map(p=>p.top)),bottom:Math.max(...parts.map(p=>p.bottom)),confidence:Math.min(...parts.map(p=>p.confidence??.75))};
}

/** Use word bounds only when a positive table header establishes column roles. */
export function receiptTableTokens(lines:ReceiptTextLine[]):ReceiptTextLine[]{
 const expanded=lines.flatMap(line=>{
  const words=line.elements;
  if(!words||words.length<3||words.length>60)return [line];
  const groups:ReceiptTextLine[]=[];
  for(let i=0;i<words.length;){
   let size=0;
   for(let n=Math.min(4,words.length-i);n>=1;n--)if(header.test(normalizeReceiptLabel(words.slice(i,i+n).map(w=>w.text).join(' ')))){size=n;break;}
   if(!size){groups.push(combine([words[i++]]));continue;}
   groups.push(combine(words.slice(i,i+size)));i+=size;
  }
  return groups.filter(g=>header.test(normalizeReceiptLabel(g.text))).length>=3?groups:[line];
 });
 const anchor=expanded.find(line=>nameHeader.test(normalizeReceiptLabel(line.text))&&line.top!==undefined&&line.bottom!==undefined);
 if(!anchor)return expanded;
 const headers=expanded.filter(line=>line.left!==undefined&&line.right!==undefined&&line.top!==undefined&&line.bottom!==undefined&&
  Math.abs(line.top-anchor.top!)<=Math.max(line.bottom-line.top,anchor.bottom!-anchor.top!)*2&&header.test(normalizeReceiptLabel(line.text))).sort((a,b)=>a.left!-b.left!);
 if(headers.length<3||!headers.some(line=>quantityHeader.test(normalizeReceiptLabel(line.text)))||!headers.some(line=>totalHeader.test(normalizeReceiptLabel(line.text))))return expanded;
 const cuts=headers.slice(1).map((line,i)=>(headers[i].right!+line.left!)/2);
 return expanded.flatMap(line=>{
  if(!line.elements||line.elements.length>60||line.top===undefined||line.top<=anchor.bottom!)return [line];
  const groups=new Map<number,NonNullable<ReceiptTextLine['elements']>>();
  for(const word of line.elements){
   if(![word.left,word.right,word.top,word.bottom].every(Number.isFinite)||word.right<=word.left||word.bottom<=word.top)continue;
   const center=(word.left+word.right)/2,index=cuts.findIndex(cut=>center<cut),column=index<0?cuts.length:index;
   const group=groups.get(column)??[];group.push(word);groups.set(column,group);
  }
  return groups.size>1?[...groups.values()].map(combine):[line];
 });
}
