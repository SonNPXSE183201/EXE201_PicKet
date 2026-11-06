import { parseReceiptText, type ReceiptDraft } from "./receipt-parser";
import { receiptHasTableColumns } from "./receipt-table-layout";
import {observedReceiptAdjustments} from "./receipt-adjustments";

/** Re-parse OCR evidence; user edits never turn an unrelated image into a receipt. */
export function canAttachReceipt(value: { rawText: string | null; amount?: number | null; merchant?: string | null; date?: string | null; merchantConfidence?: number | null; amountConfidence?: number | null; dateConfidence?: number | null; recognizedLineCount?: number; lineItems?: readonly { name: string; quantity: number; unitPrice?: number | null; total: number; confidence?: number | null }[] }): boolean {
  if (!value.rawText) return false;
  const draft = parseReceiptText(value.rawText);
  if (value.recognizedLineCount !== undefined && Array.isArray(value.lineItems)) {
    const structured: ReceiptDraft = {
      ...draft,
      merchant: value.merchant ?? null,
      amount: value.amount ?? null,
      date: value.date ?? null,
      merchantConfidence: value.merchantConfidence ?? null,
      amountConfidence: value.amountConfidence ?? null,
      dateConfidence: value.dateConfidence ?? null,
      recognizedLineCount: value.recognizedLineCount,
      lineItems: value.lineItems.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice ?? item.total,
        total: item.total,
        confidence: item.confidence ?? 0,
      })),
    };
    return canAttachParsedReceipt(structured) && canAttachParsedReceipt(draft);
  }
  return canAttachParsedReceipt(draft);
}

/** Internal OCR already has a parsed draft; do not parse the same evidence twice. */
export function canAttachParsedReceipt(draft: ReceiptDraft): boolean {
  const evidence = draft.rawText.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
  const explicitVat = /\bhoa don\b/.test(evidence) && /tien hang/.test(evidence) && /tien thue/.test(evidence) &&
    /^tien thanh toan: \d+$/m.test(evidence);
  if(draft.recognizedLineCount<3)return false;
  // A dated, explicitly named invoice with an observed coherent row can be
  // reviewed even when its header or final amount is unreadable. Do not turn
  // manually typed fields, free gifts alone, or arbitrary shopping lists into proof.
  const datedInvoice=/\b(?:hoa\s*(?:don|dn|bn)|h[do]a\s*don|phieu\s*(?:thanh\s*toan|tinh\s*tien|ban\s*hang)|receipt|invoice|bien\s*lai)\b/.test(evidence)&&draft.date!==null;
  if(datedInvoice&&draft.lineItems.some(item=>item.total>0&&item.confidence>=.7&&
    Math.abs(item.quantity*item.unitPrice-item.total)<=1))return true;
  if(draft.merchant===null){
    // A cropped/masked merchant is editable when independent OCR evidence is
    // strong. Typed fields never enter this decision, and the draft stays under review.
    return draft.amount!==null&&draft.lineItems.length>=2&&
      draft.lineItems.every(item=>item.total>0&&Math.abs(item.quantity*item.unitPrice-item.total)<=1)&&
      Math.abs(draft.lineItems.reduce((sum,item)=>sum+item.total,0)+observedReceiptAdjustments(draft.rawText)-draft.amount)<=1;
  }
  if(draft.amount!==null)return draft.lineItems.length>0||draft.date!==null||explicitVat;
  // A proven, incomplete invoice can request a manual total. This does not
  // authorize arbitrary text/photos or treat a user-entered amount as OCR proof.
  return /\b(?:hoa don|receipt|invoice|bien lai)\b/.test(evidence)&&draft.date!==null&&
    receiptHasTableColumns(draft.rawText.split(/\r?\n/).map(text=>({text})))&&
    draft.lineItems.filter(item=>item.total>0&&Math.abs(item.quantity*item.unitPrice-item.total)<=1).length>=2;
}
