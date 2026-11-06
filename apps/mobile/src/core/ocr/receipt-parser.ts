import { parseReceiptMoney, parseReceiptItemMoney, parseReceiptSummaryMoney } from "./receipt-money";
import {receiptHasTableColumns,receiptTableRows} from "./receipt-table-layout";
import { receiptVatSummaryRows } from "./receipt-vat-summary";
import {isReceiptMetadata,isReceiptSummary,isReceiptDocumentLabel,receiptBodyStart,merchantDisplayName,receiptMerchantFromDocumentHeading,noisyReceiptSummaryRole} from "./receipt-semantics";
import {receiptPosRows} from "./receipt-pos-rows";
import {receiptTotalRole,looksLikeContactAmount} from "./receipt-total-role";
import {receiptUnheadedRows} from "./receipt-unheaded-rows";
import {receiptAdjustmentLabel} from "./receipt-adjustments";
import { receiptDate } from "./receipt-date";
export { parseReceiptMoney } from "./receipt-money";

export type ReceiptTextLine = {
  text: string;
  confidence?: number;
  angle?: number;
  reviewIssue?: "inconsistent-item" | "inconsistent-vat-components";
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
  elements?: {text:string;confidence?:number;left:number;right:number;top:number;bottom:number}[];
};

export type ReceiptDraft = {
  rawText: string;
  merchant: string | null;
  amount: number | null;
  date: string | null;
  merchantConfidence: number | null;
  amountConfidence: number | null;
  dateConfidence: number | null;
  recognizedLineCount: number;
  needsReview: boolean;
  reviewReason: string | null;
  lineItems: ReceiptDraftLine[];
};

export type ReceiptDraftLine = {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  confidence: number;
};

const bareSumLabel=/^cong\b(?!\s*tien\s*hang)/;
const weakSumLabelConfidence=0.6;
// Row text emitted by receiptTableRows: "name qty x unit | total".
const assembledTableRow=/\s\d+(?:[.,]\d+)?\s*x\s*.*\|\s*\d/;
const totalWords = /^cong(?=\s*(?:[:|]\s*)?(?:\d|$))|^(?:teng cong|tng tien|t[.]tien)\b|^tota[\/l][^a-z]|tong\s*(cong|tien|thanh\s*toan)?|tng\s*cng|cong\s*tien\s*hang|so\s*tien\s*(thanh\s*toan|phai\s*tra)|can\s*(?:thanh\s*toan|tra)|thanh\s*toan|phai\s*tra|grand\s*total|round(?:ed|\s*d)\s*total|total\s*due|amount\s*due|^total\b|^due$/i;
const strongTotalWords = /tong\s*cong|tng\s*cng|thanh\s*toan|phai\s*tra|can\s*tra|grand\s*total|round(?:ed|\s*d)\s*total|total\s*due|amount\s*due|^due$/i;
const trailingTotalWords = /^(?:total\s*due|amount\s*due|due)$/i;
const rejectedTotalWords = /hinh\s*thuc|phuong\s*thuc|payment\s*method|\b(?:dt|dien\s*thoai|phone|hotline|tel)\b|subtotal|tam\s*tinh|tien\s*khach|tien\s*thua|change|tendered|cash\s*received|total\s*item|\b(?:qty|0ty)\b|so\s*luong/i;
const rejectedItemWords = /^(tong|total|subtotal|tam\s*tinh|thanh\s*toan|phai\s*(?:thanh\s*toan|tra)|can\s*(?:thanh\s*toan|tra)|vat|tax|thue|giam\s*gia|discount|tien\s*(?:thua|khach|hang|thue|thanh\s*toan|ca\s*the|the|mat|chuyen\s*khoan|quet\s*the)|change|cash|card|barcode|ma\s*(?:don(?:\s*hang)?|dh|dat\s*hang|hoa\s*don|hd|phieu|bien\s*lai|chung\s*tu|giao\s*dich|tham\s*chieu|tra\s*cuu|the|cqt|khach(?:\s*hang)?|kh|nhan\s*vien|nv|bill|order|vach|hang|sp|san\s*pham)|don\s*gia|so\s*(?:don(?:\s*hang)?|dh|hoa\s*don|hd|phieu|bien\s*lai|chung\s*tu|giao\s*dich|tham\s*chieu|bill|order|luong)|(?:order|bill|ref(?:erence)?|trans(?:action)?|doc(?:ument)?)\s*(?:no|number|id|code)|qty|ngay|date|gio|time|gis\s*ra|gio\s*ra|mst|ma\s*so\s*thue|hoa\s*don|receipt|invoice|dia\s*chi|address|hotline|tel)\b/i;

function normalized(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ")
    .trim();
}

function confidence(line: ReceiptTextLine, fallback = 0.75) {
  return Math.max(0, Math.min(1, line.confidence ?? fallback));
}

function receiptItemCandidates(
  recognizedLines: ReceiptTextLine[],
): {items: {item:ReceiptDraftLine;source:ReceiptTextLine}[]; hasArithmeticConflict: boolean} {
  const items: {item:ReceiptDraftLine;source:ReceiptTextLine}[] = [];
  let hasArithmeticConflict = false;
  const {index:header,top:tableTop}=receiptBodyStart(recognizedLines);
  const summary = recognizedLines.findIndex((line,index) => index > header && (typeof tableTop !== "number" || typeof line.top !== "number" || line.top > tableTop) && isReceiptSummary(line.text));
  for (let index=0;index<recognizedLines.length;index++) {
    const line=recognizedLines[index];
    if (items.length >= 100) break;
    const text = line.text.trim();
    const clean = normalized(text);
    if (isReceiptMetadata(text)||isReceiptDocumentLabel(text)||isReceiptSummary(text)) continue;
    if (header >= 0 && (typeof tableTop === "number" && typeof line.top === "number" ? line.top < tableTop : index <= header)) continue;
    if (summary >= 0 && (typeof recognizedLines[summary].top === "number" && typeof line.top === "number" ? line.top >= recognizedLines[summary].top! : index >= summary)) continue;
    if (!/[A-Za-zÀ-ỹ]/.test(text) || rejectedItemWords.test(clean) || /^(?:so|so hd|ma|no|dt|sdt)\s*[:.#-]/.test(clean)) continue;
    const priceMatch = text.match(
      /(?:^|[\s|:~])(\d{1,3}(?:[.,][ \u00a0]*\d{3}|[ \u00a0]\d{3})+(?:[.,]\d{2})?|\d{3,}(?:[.,]\d{2})?|0(?:[.,]0{2})?)(?:\s*(?:vnd|đ|d|₫))?\s*$/i,
    );
    if (!priceMatch || priceMatch.index === undefined) continue;
    const total = parseReceiptItemMoney(priceMatch[1]);
    if (total === null) continue;
    let name = text.slice(0, priceMatch.index).replace(/[-:|~]+\s*$/, "").trim();
    const lowConfidenceRow = /~\s*\d[\d.,\s]*(?:vnd|đ|d|₫)?\s*$/i.test(text);
    let quantity = 1;
    let unitPrice = total;
    let inferredUnit = false;
    const leadingQuantity = name.match(/^(\d+(?:[.,]\d+)?)\s*[xX×]\s+(.+)$/);
    if (leadingQuantity) {
      quantity = Number(leadingQuantity[1].replace(',', '.'));
      if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 1_000_000) continue;
      unitPrice = total / quantity;
      if (!Number.isSafeInteger(unitPrice)) continue;
      name = leadingQuantity[2].trim();
      inferredUnit = true;
    }
    const quantityMatch = name.match(
      /^(.*?)\s+(\d+(?:[.,]\d+)?)\s*[xX*@]\s*(\d[\d.,\s]*)\s*$/,
    );
    if (quantityMatch) {
      const parsedQuantity = Number(quantityMatch[2].replace(",", "."));
      const parsedUnitPrice = parseReceiptItemMoney(quantityMatch[3]);
      if (
        Number.isFinite(parsedQuantity) &&
        parsedQuantity > 0 &&
        parsedQuantity <= 1_000_000 &&
        parsedUnitPrice !== null &&
        Math.abs(parsedQuantity * parsedUnitPrice - total) <= 1
      ) {
        name = quantityMatch[1].trim();
        quantity = parsedQuantity;
        unitPrice = parsedUnitPrice;
      } else {
        if (Number.isFinite(parsedQuantity) && parsedQuantity > 0 && parsedQuantity <= 1_000_000 &&
          parsedUnitPrice !== null && Math.abs(parsedQuantity * parsedUnitPrice - total) > 1) hasArithmeticConflict = true;
        continue;
      }
    }
    if ((total === 0 && !quantityMatch && !leadingQuantity) || name.length < 3 || name.length > 200 || name.replace(/[^A-Za-zÀ-ỹ]/g, "").length < 2 || isReceiptMetadata(name) || isReceiptSummary(name) || isReceiptDocumentLabel(name) || /^(?:\d+[\s\-_]*)?(?:cai|lon|chai|ly|hop|goi|dia|bat|to|phan|chiec|kg|g)$/i.test(normalized(name)) || (/^[\d.,\s\-_oOcCsSdDleI]+$/i.test(name) && /\d/.test(name)) || /(?:^|\s)(?:\d+[Oo]+|[Oo]+\d+)$/.test(name)) continue;
    items.push({source:line,item:{
      name,
      quantity,
      unitPrice,
      total,
      confidence: quantityMatch && !inferredUnit && !lowConfidenceRow ? confidence(line) : Math.min(0.65,confidence(line)),
    }});
  }
  return { items, hasArithmeticConflict };
}

export function parseReceiptLineItems(recognizedLines:ReceiptTextLine[]):ReceiptDraftLine[]{
  return receiptItemCandidates(recognizedLines).items.map(candidate=>candidate.item);
}

export function parseReceiptText(rawText: string): ReceiptDraft {
  return parseReceiptLines(rawText.split(/\r?\n/).map((text) => ({ text })));
}

function spatialTotalCandidates(label:ReceiptTextLine,lines:ReceiptTextLine[]):ReceiptTextLine[]{
  if(typeof label.top!=="number"||typeof label.bottom!=="number"||typeof label.right!=="number"||
    ![label.top,label.bottom,label.right].every(Number.isFinite)||label.bottom<=label.top)return [];
  const top=label.top,bottom=label.bottom,right=label.right,left=typeof label.left==="number"&&Number.isFinite(label.left)?label.left:right;
  const angle=typeof label.angle==="number"&&Number.isFinite(label.angle)&&Math.abs(label.angle)<=15?label.angle:0;
  const role=receiptTotalRole(label.text);
  const parseCandidateAmount=(text:string)=>parseReceiptMoney(text)??(role>=2?parseReceiptSummaryMoney(text):null);
  const isCandidateAmount=(text:string)=>/^\s*\d[\d.,\s]*(?:vnd|đ|d|₫)?\s*$/i.test(text)||role>=2&&/^\s*\d[\d.,\s]*(?:vnd|đ|d|₫)?[oO]\s*$/i.test(text);
  const shift=(line:ReceiptTextLine)=>angle&&typeof line.left==="number"&&typeof line.right==="number"?((line.left+line.right)/2-(left+right)/2)*Math.tan(angle*Math.PI/180):0;
  const labelCy=(top+bottom)/2;
  const raw=lines.filter(line=>{
    if(line===label||typeof line.top!=="number"||typeof line.bottom!=="number"||typeof line.left!=="number"||
      ![line.top,line.bottom,line.left].every(Number.isFinite)||line.bottom<=line.top||line.left<right)return false;
    const overlap=Math.min(bottom,line.bottom)-Math.max(top,line.top);
    return overlap>=Math.min(bottom-top,line.bottom-line.top)*0.2&&
      isCandidateAmount(line.text)&&!looksLikeContactAmount(line.text)&&parseCandidateAmount(line.text)!==null;
  });
  if(raw.length<=1)return raw;
  const closer=raw.filter(line=>{
    const lineCy=(line.top!+line.bottom!)/2,dist=Math.abs(labelCy+shift(line)-lineCy);
    return !lines.some(other=>other!==label&&other!==line&&typeof other.top==="number"&&typeof other.bottom==="number"&&typeof other.right==="number"&&
      other.right<=line.left!&&/[A-Za-zÀ-ỹ]/.test(other.text)&&Math.abs((other.top+other.bottom)/2+shift(line)-lineCy)+1<dist);
  });
  return closer.length>0?closer:raw;
}

/** Match a nearby, non-overlapping amount only to one explicit payable label. */
function nearbyPayableTotalCandidates(label:ReceiptTextLine,lines:ReceiptTextLine[]):ReceiptTextLine[]{
  if(receiptTotalRole(label.text)<2||typeof label.top!=="number"||typeof label.bottom!=="number"||typeof label.right!=="number"||
    ![label.top,label.bottom,label.right].every(Number.isFinite)||label.bottom<=label.top)return [];
  const labelHeight=label.bottom-label.top;
  const labelLeft=typeof label.left==="number"&&Number.isFinite(label.left)?label.left:label.right;
  const unreadableInlineAmount=lines.some(line=>line!==label&&typeof line.top==="number"&&typeof line.bottom==="number"&&typeof line.left==="number"&&
    [line.top,line.bottom,line.left].every(Number.isFinite)&&line.left>=label.right!&&Math.min(label.bottom!,line.bottom)-Math.max(label.top!,line.top)>0&&
    /\d/.test(line.text)&&parseReceiptMoney(line.text)===null&&parseReceiptSummaryMoney(line.text)===null);
  if(unreadableInlineAmount)return [];
  const candidates=lines.flatMap(line=>{
    if(line===label||typeof line.top!=="number"||typeof line.bottom!=="number"||typeof line.left!=="number"||
      ![line.top,line.bottom,line.left].every(Number.isFinite)||line.left<label.right!||line.bottom<=line.top||
      looksLikeContactAmount(line.text))return [];
    const gap=line.bottom<=label.top!?label.top!-line.bottom:line.top>=label.bottom!?line.top-label.bottom!:null;
    if(gap===null||gap>Math.min(labelHeight,line.bottom-line.top)*1.5)return [];
    const belowLabel=line.top>=label.bottom!;
    if(belowLabel&&typeof label.left==="number"&&lines.some(other=>other!==label&&other!==line&&typeof other.top==="number"&&typeof other.bottom==="number"&&
      typeof other.left==="number"&&typeof other.right==="number"&&[other.top,other.bottom,other.left,other.right].every(Number.isFinite)&&/[\p{L}]/u.test(other.text)&&
      Math.min(line.bottom!,other.bottom)-Math.max(line.top!,other.top)>0&&Math.min(label.right!,other.right)-Math.max(labelLeft,other.left)>0&&other.right<=line.left!))return [];
    const amount=parseReceiptMoney(line.text)??parseReceiptSummaryMoney(line.text);
    return amount===null?[]:[{line,gap,height:Math.min(labelHeight,line.bottom-line.top)}];
  }).sort((a,b)=>a.gap-b.gap);
  if(candidates.length===0)return [];
  const [nearest,second]=candidates;
  if(second&&second.gap-nearest.gap<=nearest.height*0.2)return [nearest.line,second.line];
  return [nearest.line];
}

function adjacentTotalCandidate(label:ReceiptTextLine,candidate:ReceiptTextLine|undefined,before=false):ReceiptTextLine|undefined {
  const role=receiptTotalRole(label.text);
  const isAmount=/^\s*\d[\d.,\s]*(?:vnd|đ|d|₫)?\s*$/i.test(candidate?.text??"")||role>=2&&/^\s*\d[\d.,\s]*(?:vnd|đ|d|₫)?[oO]\s*$/i.test(candidate?.text??"");
  if(!candidate||!isAmount||looksLikeContactAmount(candidate.text)||(parseReceiptMoney(candidate.text)??(role>=2?parseReceiptSummaryMoney(candidate.text):null))===null)return undefined;
  const frames=[label.top,label.bottom,candidate.top,candidate.bottom];
  if(!frames.some(value=>value!==undefined))return candidate;
  if(!frames.every(value=>typeof value==='number'&&Number.isFinite(value)))return undefined;
  const height=Math.min(label.bottom!-label.top!,candidate.bottom!-candidate.top!);
  const gap=before?label.top!-candidate.bottom!:candidate.top!-label.bottom!;
  return height>0&&gap>=-height*.2&&gap<=height*1.5?candidate:undefined;
}

/** Pure parser shared by the future native ML Kit adapter and review UI. */
export function parseReceiptLines(recognizedLines: ReceiptTextLine[]): ReceiptDraft {
  const structured = receiptVatSummaryRows(receiptPosRows(receiptTableRows(recognizedLines
    .map((line) => ({ ...line, text: line.text.trim() }))
    // A bare "Cộng" is a weak label; a damaged read of it is not evidence of a summary row.
    .filter((line) => line.text.length > 0 && !(bareSumLabel.test(normalized(line.text)) && typeof line.confidence === "number" && line.confidence < weakSumLabelConfidence)))));
  const assembledTable=receiptHasTableColumns(structured)&&structured.some(line=>assembledTableRow.test(line.text));
  const lines=assembledTable?structured:receiptUnheadedRows(structured);
  // Preserve an unambiguous visual total row in the text saved to drafts.
  // Re-parsing that text after restart must not depend on lost native frames.
  const joinedTotals=new Map<ReceiptTextLine,ReceiptTextLine>(),unlinkedAmounts=new Set<ReceiptTextLine>();
  for(const [index,line] of lines.entries()){
    const clean=normalized(line.text);
    if(isReceiptMetadata(line.text)||(!totalWords.test(clean)&&noisyReceiptSummaryRole(line.text)===null)||rejectedTotalWords.test(clean)||receiptTotalRole(line.text)===0||/\b\d/.test(line.text.replace(/^tota[l\/]\s*[-(][^:]*:/i,"Total:").replace(/\([^)]*\)/g," ")))continue;
    const candidates=spatialTotalCandidates(line,lines);
    if(candidates.length===1)joinedTotals.set(line,candidates[0]);
    else if(candidates.length===0){
      const nearby=receiptTotalRole(line.text)>=2?nearbyPayableTotalCandidates(line,lines):[];
      if(nearby.length===1)joinedTotals.set(line,nearby[0]);
      else if(nearby.length===0){
        const before=trailingTotalWords.test(clean),candidate=lines[index+(before?-1:1)];
        const adjacent=adjacentTotalCandidate(line,candidate,before);
        if(adjacent)joinedTotals.set(line,adjacent);
        else if(candidate&&/^\s*\d[\d.,\s]*(?:vnd|đ|d|₫)?\s*$/i.test(candidate.text))unlinkedAmounts.add(candidate);
      }
    }
  }
  // Keep observed tax/fee cells attached to their own labels in raw evidence.
  // Review eligibility can then check arithmetic after geometry is discarded.
  for(const line of lines){
    if(receiptAdjustmentLabel(line.text)===null)continue;
    const candidates=spatialTotalCandidates(line,lines);
    if(candidates.length===1)joinedTotals.set(line,candidates[0]);
  }
  const joinedAmounts=new Set(joinedTotals.values());
  const rawText = [...lines.filter(line=>!joinedAmounts.has(line))].sort((a,b)=>typeof a.top==="number"&&typeof b.top==="number"&&a.top!==b.top?a.top-b.top:0).map(line=>{
    const amount=joinedTotals.get(line);
    if(unlinkedAmounts.has(line))return `Thông tin OCR: số tiền chưa gắn dòng tổng — ${line.text}`;
    const serialized = typeof line.confidence === "number" && line.confidence < 0.7 ? line.text.replace(/\|(\s*\d[\d.,\s]*(?:vnd|đ|d|₫)?\s*)$/i, "~$1") : line.text;
    return amount?`${serialized} ${amount.text}`:serialized;
  }).join("\n");
  const maxBottom = Math.max(0, ...lines.map((line) => line.bottom ?? 0));
  const totals: { amount: number; score: number; evidenceConfidence:number; role:1|2|3 }[] = [];

  lines.forEach((line, index) => {
    const clean = normalized(line.text);
    const role=receiptTotalRole(line.text);
    if (isReceiptMetadata(line.text) || (!totalWords.test(clean)&&noisyReceiptSummaryRole(line.text)===null) || rejectedTotalWords.test(clean) || role===0) return;
    const amountText = line.text.replace(/^tota[l\/]\s*[-(][^:]*:/i,"Total:").replace(/\([^)]*\)/g," ");
    // Do not truncate a damaged token (12O000 -> 12) into a valid amount.
    const ownNumbers = [...amountText.matchAll(/(?:^|[^\p{L}\d.,])(\d.*|[A-Za-z]\d.*)$/gu)].map(match=>[match[1].trim()]);
    const spatial=ownNumbers.length===0?spatialTotalCandidates(line,lines):[];
    const nearby=ownNumbers.length===0&&spatial.length===0&&role>=2?nearbyPayableTotalCandidates(line,lines):[];
    if(nearby.length>1)return;
    // Multiple distinct amounts beside one label require review, not a guess.
    if(new Set(spatial.map(candidate=>parseReceiptMoney(candidate.text)??(role>=2?parseReceiptSummaryMoney(candidate.text):null))).size>1)return;
    const next=adjacentTotalCandidate(line,lines[index+1]);
    const previous=adjacentTotalCandidate(line,lines[index-1],true);
    const previousNumbers = previous
      ? [...previous.text.matchAll(/\d[\d.,\s]*/g)]
      : [];
    const usePrevious =
      ownNumbers.length === 0 &&
      trailingTotalWords.test(clean) &&
      previousNumbers.length > 0;
    const source = ownNumbers.length > 0 ? line : spatial[0]??nearby[0]??(usePrevious ? previous : next);
    const numbers = ownNumbers.length > 0
      ? ownNumbers
      : spatial[0]
        ? [...spatial[0].text.matchAll(/\d[\d.,\s]*/g)]
      : nearby[0]
        ? [...nearby[0].text.matchAll(/\d[\d.,\s]*/g)]
      : usePrevious
        ? previousNumbers
        : next
          ? [...next.text.matchAll(/\d[\d.,\s]*/g)]
          : [];
    const token=numbers.at(-1)?.[0]??"";
    const amount = numbers.length > 0 && !looksLikeContactAmount(token) ? parseReceiptMoney(token)??(role>=2?parseReceiptSummaryMoney(token):null) : null;
    if (!source || amount === null) return;
    const nearBottom = maxBottom > 0 && (source.bottom ?? 0) / maxBottom >= 0.55;
    const score = Math.min(line.reviewIssue==="inconsistent-vat-components"?0.65:1, 0.52 + confidence(source) * 0.22 + (source === line ? 0.14 : 0.08) + (nearBottom ? 0.08 : 0.0) + (strongTotalWords.test(clean) || role>=2 ? 0.12 : 0));
    totals.push({ amount, score, evidenceConfidence:Math.min(score,confidence(source)),role });
  });
  totals.sort((left, right) => right.role-left.role||right.score - left.score);
  const hasExplicitPayable = lines.some(line=>!isReceiptMetadata(line.text)&&(totalWords.test(normalized(line.text))||noisyReceiptSummaryRole(line.text)!==null)&&!rejectedTotalWords.test(normalized(line.text))&&receiptTotalRole(line.text)>=2);
  const selectedTotal = hasExplicitPayable&&(totals[0]?.role??0)<2?null:totals[0]??null;
  const conflictingTotals = selectedTotal !== null && totals.some(candidate => candidate.role===selectedTotal.role && candidate.amount !== selectedTotal.amount && candidate.score >= 0.8 && selectedTotal.score - candidate.score < 0.15);

  const selectedDate = receiptDate(lines);
  const date = selectedDate?.date ?? null;
  const dateConfidence = selectedDate?.confidence ?? null;

  const bodyStart=receiptBodyStart(lines);
  const dateLineIndex=selectedDate?.index ?? -1;
  const dateLine=dateLineIndex>=0?lines[dateLineIndex]:null;
  const tableRowLines = receiptHasTableColumns(lines) ? lines.filter(line => /\s\d+(?:[.,]\d+)?\s*x\s*.*\|\s*\d/.test(line.text)) : [];
  // Headers alone do not make a table: if no row could be assembled, read the lines as plain rows.
  const itemLines = tableRowLines.length > 0 ? tableRowLines : lines;
  const {items:itemCandidates,hasArithmeticConflict}=receiptItemCandidates(itemLines),lineItems=itemCandidates.map(candidate=>candidate.item);
  const bodySources=new Set([...itemCandidates.map(candidate=>candidate.source),...lines.filter(line=>isReceiptSummary(line.text))]);
  const bodyTop=Math.min(Infinity,...[...bodySources].flatMap(line=>typeof line.top==='number'&&Number.isFinite(line.top)?[line.top]:[]));
  const bodyIndex=lines.findIndex(line=>bodySources.has(line));
  const merchants = lines
    .map((line, index) => {
      const headingMerchant=receiptMerchantFromDocumentHeading(line.text);
      const merchantText=headingMerchant??line.text;
      const clean = normalized(merchantText);
      if((isReceiptMetadata(line.text)&&headingMerchant===null)||(isReceiptDocumentLabel(line.text)&&headingMerchant===null)||(isReceiptSummary(line.text)&&headingMerchant===null))return null;
      // A missing/obscured header must stay missing: neither an unpriced item
      // continuation nor footer text can become a store after the body starts.
      if(bodyIndex>=0&&(Number.isFinite(bodyTop)&&typeof line.top==='number'?line.top>=bodyTop:index>=bodyIndex))return null;
      const afterDatedDocumentHeader=bodyStart.index>=0&&!bodyStart.hasTable&&dateLine!==null&&headingMerchant===null&&(
        typeof line.top==='number'&&typeof dateLine.top==='number'?line.top>dateLine.top:index>dateLineIndex
      );
      if(afterDatedDocumentHeader)return null;
      if(/\s(?:\d{3,}|\d{1,3}(?:[., ]\d{3})+)(?:[.,]00)?\s*(?:vnd|đ|d|₫)?\s*$/i.test(merchantText))return null;
      if((bodyStart.hasTable||(bodyStart.index>=0&&/^\d+\s+/.test(clean)))&&(bodyStart.top!==null&&line.top!==undefined?line.top>=bodyStart.top:index>bodyStart.index))return null;
      const digitCount = (merchantText.match(/\d/g) ?? []).length;
      if(/gia\s*tri\s*gia\s*tang|phieu\s*(mua|ban|giao|thu)|ten\s*(san pham|hang hoa)|^sl$|^bh$|don\s*gia|thanh\s*tien|phuong\s*thuc|thong\s*tin|khach\s*hang|website|www\.|https?:|@/i.test(clean))return null;
      if (merchantText.length < 3 || !/[A-Za-zÀ-ỹ]/.test(merchantText) || /hoa\s*don|bi(?:e)?n\s*lai|cash\s*bill|receipt|invoice|mst|tax|dia\s*chi|address|hotline|tel\b|ngay\b|date\b|tong|subtotal|thanh\s*toan|^no\.?\s*\d|\bjalan\b|\b\d{5}\b/i.test(clean) || digitCount > merchantText.length / 3) return null;
      const relativeTop = maxBottom > 0 && line.top !== undefined ? line.top / maxBottom : index / Math.max(1, lines.length);
      const letters = merchantText.replace(/[^A-Za-zÀ-ỹ]/g, "");
      const uppercaseCount = [...letters].filter(
        (letter) => letter === letter.toUpperCase(),
      ).length;
      const uppercaseRatio = letters.length > 0 ? uppercaseCount / letters.length : 0;
      return { value: merchantDisplayName(headingMerchant??line.text), score: Math.min(1, confidence(line) * 0.45 + (1 - relativeTop) * 0.35 + 0.1 + (letters.length >= 4 && uppercaseRatio >= 0.7 ? 0.1 : 0)) };
    })
    .filter((candidate): candidate is { value: string; score: number } => candidate !== null)
    .sort((left, right) => right.score - left.score);
  const merchant = merchants[0] ?? null;

  const reviewReason = rawText.length === 0
    ? "Không nhận diện được chữ trong ảnh."
    : conflictingTotals
      ? "Các tổng tiền không khớp. Hãy đối chiếu số tiền cần thanh toán trên hóa đơn."
    : lines.some(line => line.reviewIssue === "inconsistent-vat-components")
      ? "Một số ô tiền hàng hoặc thuế chưa khớp. Hãy kiểm tra tổng tiền."
    : hasArithmeticConflict || lines.some(line => line.reviewIssue === "inconsistent-item")
      ? "Một số dòng sản phẩm có số lượng, đơn giá và thành tiền không khớp nên chưa được đưa vào danh sách. Hãy đối chiếu và bổ sung dòng thiếu."
    : lineItems.some(item => item.confidence < 0.7)
      ? "Một số số lượng hoặc đơn giá được suy ra, chưa được xác nhận từ ảnh. Hãy đối chiếu từng dòng với hóa đơn."
    : selectedTotal === null
      ? "Không tìm thấy tổng tiền cần thanh toán."
      : merchant === null
        ? "Chưa đọc được tên cửa hàng. Hãy nhập tên trước khi tiếp tục."
      : selectedTotal.evidenceConfidence < 0.7
        ? "Tổng tiền có độ tin cậy thấp."
        : lines.length < 3
          ? "Ảnh có quá ít dòng chữ để kiểm tra kết quả."
          : null;
  return { rawText, merchant: merchant?.value ?? null, amount: selectedTotal?.amount ?? null, date, merchantConfidence: merchant?.score ?? null, amountConfidence: selectedTotal?.evidenceConfidence ?? null, dateConfidence, recognizedLineCount: lines.length, needsReview: reviewReason !== null, reviewReason, lineItems };
}
