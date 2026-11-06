import { canAttachReceipt } from "./receipt-eligibility";
import type { ReceiptDraft } from "./receipt-parser";
export type ReceiptAngle = 0 | 90 | 180 | 270;
export type ReceiptOrientationAdapter = {
 prepare(angle: ReceiptAngle): Promise<{uri: string; dispose(): void}>;
 recognize(uri: string): Promise<ReceiptDraft>;
};
/** Evidence from structured rows outweighs a plausible number read upside-down. */
export function receiptOrientationScore(draft: ReceiptDraft): number {
 const text=draft.rawText.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d");
 const anchors=[/hoa\s*don/,/ten (?:san pham|hang hoa)/,/so luong|qty/,/don gia|unit price/,/thanh tien/,/tien hang/,/tien thue/,/thanh toan|grand total/];
 const rows=(text.match(/^.*\s\d+(?:[.,]\d+)?\s*x\s*.*\|\s*\d.*$/gm)??[]).length;
 const vatSummary=/^tien thanh toan: \d+$/m.test(text)&&/tien hang/.test(text)&&/tien thue/.test(text);
 return (vatSummary?100:0)+Math.min(rows,100)*20+anchors.filter(pattern=>pattern.test(text)).length*3+(draft.date?5:0);
}
/** Compare all angles; never mix receipt fields from different orientations. */
export async function recognizeReceiptOrientations(adapter: ReceiptOrientationAdapter): Promise<ReceiptDraft> {
 let best: ReceiptDraft | undefined;
 let firstError: unknown;
 const eligible: ReceiptDraft[]=[];
 for(const angle of [0,90,180,270] as const) {
  let image: Awaited<ReturnType<ReceiptOrientationAdapter['prepare']>> | undefined;
  try {
   image=await adapter.prepare(angle);
   const draft=await adapter.recognize(image.uri);
   if(canAttachReceipt(draft)) eligible.push(draft);
   if(!best || draft.recognizedLineCount>best.recognizedLineCount) best=draft;
  } catch(error) { firstError ??= error; }
  finally { try { image?.dispose(); } catch { /* Cleanup must not replace recognition results. */ } }
 }
 eligible.sort((a,b)=>receiptOrientationScore(b)-receiptOrientationScore(a));
 if(eligible.length){
  const selected=eligible[0];
  if(eligible.some(other=>receiptOrientationScore(other)===receiptOrientationScore(selected)&&other.amount!==selected.amount))
   throw new Error("Receipt orientation has conflicting totals");
  return selected;
 }
 if(best) return best;
 throw firstError ?? new Error("Receipt recognition failed");
}
