import type {ReceiptTextLine} from "./receipt-parser";
import {parseReceiptMoney,parseReceiptItemMoney} from "./receipt-money";
import {isReceiptDocumentLabel,isReceiptMetadata,isReceiptSummary,receiptBodyStart} from "./receipt-semantics";
import {looksLikeContactAmount} from "./receipt-total-role";
type Box=ReceiptTextLine&{left:number;right:number;top:number;bottom:number};
const positioned=(line:ReceiptTextLine):line is Box=>[line.left,line.right,line.top,line.bottom].every(x=>typeof x==='number'&&Number.isFinite(x))&&line.right!>line.left!&&line.bottom!>line.top!;
const cy=(line:Box)=>(line.top+line.bottom)/2;
const numeric=/^\d[\d.,\s]*(?:vnd|đ|d|₫)?$/i;

/** Headerless name/amount rows require one unambiguous spatial amount before a summary. */
export function receiptUnheadedRows(lines:ReceiptTextLine[]):ReceiptTextLine[]{
  const boxes=lines.filter(positioned),used=new Set<ReceiptTextLine>(),replacements=new Map<ReceiptTextLine,ReceiptTextLine>();
  const {top:bodyTop}=receiptBodyStart(lines);
  const summaryTop=Math.min(Infinity,...boxes.filter(line=>(typeof bodyTop!=="number"||line.top>bodyTop)&&isReceiptSummary(line.text)).map(line=>line.top));
  if(!Number.isFinite(summaryTop))return lines;
  const eligibleName=(line:Box)=>line.bottom<summaryTop&&line.text.replace(/[^A-Za-zÀ-ỹ]/g,'').length>=3&&!isReceiptMetadata(line.text)&&!isReceiptSummary(line.text)&&!isReceiptDocumentLabel(line.text);
  // Some POS print the name above an explicit "quantity X unit price" row.
  // Require both spatial agreement and arithmetic; a lone number is insufficient.
  for(const operand of boxes){
    if(operand.bottom>=summaryTop)continue;
    const match=operand.text.match(/^(\d+(?:[.,]\d+)?)\s*[xX*]\s*(\d[\d., ]*)\s*$/);
    if(!match)continue;
    const quantity=Number(match[1].replace(',','.')),unit=parseReceiptItemMoney(match[2]);
    if(quantity<=0||quantity>1_000_000||unit===null)continue;
    const names=boxes.filter(line=>eligibleName(line)&&!replacements.has(line)&&line.bottom<=operand.top&&operand.top-line.bottom<=Math.max(line.bottom-line.top,operand.bottom-operand.top)*1.5&&Math.abs(line.left-operand.left)<(line.bottom-line.top)*2);
    if(names.length!==1)continue;
    const name=names[0];
    const amounts=boxes.filter(line=>!used.has(line)&&line.top<summaryTop&&line.left>=Math.max(name.right,operand.right)&&numeric.test(line.text)&&!looksLikeContactAmount(line.text)&&Math.min(operand.bottom,line.bottom)-Math.max(operand.top,line.top)>=Math.min(operand.bottom-operand.top,line.bottom-line.top)*.3);
    if(amounts.length!==1)continue;
    const amount=amounts[0],total=parseReceiptItemMoney(amount.text);
    if(total===null||Math.abs(quantity*unit-total)>1)continue;
    replacements.set(name,{...name,text:`${name.text} ${quantity} x ${unit} | ${total}`,right:amount.right,confidence:Math.min(name.confidence??.75,operand.confidence??.75,amount.confidence??.75)});
    used.add(operand);used.add(amount);
  }
  for(const name of boxes){
    if(used.has(name)||replacements.has(name))continue;
    const explicitQuantity=/^\d+(?:[.,]\d+)?\s*[xX×]\s+/.test(name.text);
    if(name.bottom>=summaryTop||name.text.replace(/[^A-Za-zÀ-ỹ]/g,'').length<3||(!explicitQuantity&&/\d\s*(?:[xX*@]|[.,]\d{3})/.test(name.text))||isReceiptMetadata(name.text)||isReceiptSummary(name.text)||isReceiptDocumentLabel(name.text))continue;
    const right=boxes.filter(line=>line!==name&&!used.has(line)&&line.left>=name.right&&line.top<summaryTop&&numeric.test(line.text)&&!looksLikeContactAmount(line.text)&&(explicitQuantity?parseReceiptItemMoney(line.text):parseReceiptMoney(line.text))!==null&&
      Math.min(name.bottom,line.bottom)-Math.max(name.top,line.top)>=Math.min(name.bottom-name.top,line.bottom-line.top)*.3);
    if(right.length!==1)continue;
    const amount=right[0],total=parseReceiptItemMoney(amount.text)!;
    const quantities=boxes.filter(line=>line.right<=name.left&&!used.has(line)&&Math.abs(cy(line)-cy(name))<Math.min(name.bottom-name.top,line.bottom-line.top)*.6&&/^\d+(?:[.,]\d+)?\s*[xX]?$/.test(line.text));
    let text=`${name.text} ${total}`,confidence=Math.min(name.confidence??.75,amount.confidence??.75,.65);
    if(quantities.length===1){
      const quantity=Number(quantities[0].text.replace(/[xX\s]/g,'').replace(',','.')),unit=total/quantity;
      if(!Number.isFinite(quantity)||quantity<=0||quantity>1_000_000||!Number.isSafeInteger(unit)){
        replacements.set(name,{...name,reviewIssue:"inconsistent-item"});used.add(quantities[0]);used.add(amount);continue;
      }
      text=`${name.text} ${quantity} x ${unit} | ${total}`;confidence=Math.min(confidence,.55);used.add(quantities[0]);
    }
    replacements.set(name,{...name,text,right:amount.right,confidence});used.add(amount);
  }
  return lines.filter(line=>!used.has(line)).map(line=>replacements.get(line)??line);
}
