import {parseReceiptLines,type ReceiptDraft,type ReceiptTextLine} from "./receipt-parser";
import {canAttachParsedReceipt} from "./receipt-eligibility";
import {receiptTableCrop} from "./receipt-table-crop";
import {receiptVatSummaryRows} from "./receipt-vat-summary";
import {inferReceiptRotation,orientReceiptLines} from "./receipt-direction";
import {receiptSummaryCrop} from "./receipt-summary-crop";
import {offsetReceiptCropLines} from "./receipt-crop-coordinates";
export type OcrSample={lines:ReceiptTextLine[];width:number;height:number;durationMs?:number;reused?:boolean};
export type OcrRegion={originX:number;originY:number;width:number;height:number};
export type ReceiptOcrSession={
 open(uri:string):Promise<{id:string;width:number;height:number}>;
 direction(id:string,timeoutMs:number):Promise<OcrSample>;
 inspect(id:string,timeoutMs:number):Promise<OcrSample>;
 select(id:string,angle:number):Promise<{width:number;height:number}>;
 crop(id:string,region:OcrRegion,timeoutMs:number):Promise<OcrSample>;
 close(id:string):Promise<void>;
};
export type ReceiptScanResult={draft:ReceiptDraft;durationMs:number;budgetExceeded:boolean;stats:{inspections:number;previews:number;fullReads:number;cropReads:number;summaryReads:number;nativeMs:number;nativeCacheHits:number}};
export const RECEIPT_SCAN_BUDGET_MS=20_000;
function verifiedUpright(sample:OcrSample,draft:ReceiptDraft){
 if(!canAttachParsedReceipt(draft)||!receiptTableCrop(sample.lines))return false;
 return receiptVatSummaryRows(sample.lines).some(line=>!sample.lines.includes(line)&&/^Tiền thanh toán: \d+$/.test(line.text));
}
/** A small direction pass precedes one full-resolution reading and at most one detail crop. */
export async function scanReceiptSession(uri:string,native:ReceiptOcrSession,now=()=>Date.now(),signal?:AbortSignal):Promise<ReceiptScanResult>{
 const ensureCurrent=()=>{if(signal?.aborted)throw new Error("OCR_CANCELLED");};ensureCurrent();
 const start=now(),deadline=start+RECEIPT_SCAN_BUDGET_MS,opened=await native.open(uri);
 const stats={inspections:0,previews:0,fullReads:0,cropReads:0,summaryReads:0,nativeMs:0,nativeCacheHits:0};
 const remaining=()=>Math.max(0,deadline-now());let budgetExceeded=false;
 const finish=(draft:ReceiptDraft):ReceiptScanResult=>({draft:budgetExceeded?{...draft,needsReview:true,reviewReason:"Đã hết thời gian đọc chi tiết. Hãy kiểm tra kết quả hoặc chụp lại ảnh rõ hơn."}:draft,durationMs:now()-start,budgetExceeded,stats});
 try {
  ensureCurrent();if(remaining()<=0)throw new Error("OCR_TIMEOUT");
  stats.inspections++;const direction=await native.direction(opened.id,remaining());stats.nativeMs+=direction.durationMs??0;ensureCurrent();
  if(remaining()<=0)throw new Error("OCR_TIMEOUT");
  const angle=inferReceiptRotation(direction.lines);
  let selectedDimensions=await native.select(opened.id,angle??0);ensureCurrent();
  if(remaining()<=0)throw new Error("OCR_TIMEOUT");
  stats.fullReads++;let sample=await native.inspect(opened.id,remaining());stats.nativeMs+=sample.durationMs??0;ensureCurrent();
  if(sample.reused)stats.nativeCacheHits++;
  let fullDirection=inferReceiptRotation(sample.lines);
  if(fullDirection!==null&&fullDirection!==0){
   if(remaining()<=0)budgetExceeded=true;
   else {
    selectedDimensions=await native.select(opened.id,fullDirection);ensureCurrent();
    if(remaining()<=0)budgetExceeded=true;
    else {
     stats.fullReads++;sample=await native.inspect(opened.id,remaining());stats.nativeMs+=sample.durationMs??0;ensureCurrent();
     fullDirection=inferReceiptRotation(sample.lines);
    }
   }
  }
  let lines=orientReceiptLines(sample.lines,sample.width,sample.height,0);
  const rawDraft=parseReceiptLines(lines);
  if(!rawDraft.rawText)return finish(rawDraft);
  let orientationNeedsReview=fullDirection!==null&&fullDirection!==0||angle===null&&fullDirection===null&&!verifiedUpright(sample,rawDraft);
  const orientationReviewReason="Không xác định chắc hướng ảnh. Hãy kiểm tra các trường trước khi tiếp tục.";
  let draft=orientationNeedsReview
   ?{...rawDraft,needsReview:true,reviewReason:orientationReviewReason}
   :rawDraft;
  if(remaining()<=0){budgetExceeded=true;return finish(draft);}
  const summary=draft.amount===null?receiptSummaryCrop(lines,selectedDimensions.width,selectedDimensions.height):null;
  if(summary){
   try{
    ensureCurrent();stats.summaryReads++;
    const detail=await native.crop(opened.id,summary,remaining());stats.nativeMs+=detail.durationMs??0;ensureCurrent();
    const outside=lines.filter(line=>{const y=(line.top!+line.bottom!)/2;return y<summary.originY||y>=summary.originY+summary.height;});
    const merged=orientReceiptLines([...outside,...offsetReceiptCropLines(detail.lines,summary.originX,summary.originY)],selectedDimensions.width,selectedDimensions.height,0);
    const refined=parseReceiptLines(merged);
    if(refined.amount!==null){lines=merged;draft=orientationNeedsReview?{...refined,needsReview:true,reviewReason:orientationReviewReason}:refined;}
   }catch{ensureCurrent();budgetExceeded=remaining()<=0;}
  }
  if(remaining()<=0){budgetExceeded=true;return finish(draft);}
  if(remaining()<=0){budgetExceeded=true;return finish(draft);}
  const itemSum=draft.lineItems.reduce((sum,item)=>sum+item.total,0);
  const completeObservedTable=draft.amount!==null&&draft.lineItems.length>0&&!draft.needsReview&&
   draft.lineItems.every(item=>item.confidence>=0.7)&&Math.abs(itemSum-draft.amount)<=1;
  const region=completeObservedTable?null:receiptTableCrop(lines);
  if(!region)return finish(draft);
  ensureCurrent();const dimensions=selectedDimensions;ensureCurrent();
  if(remaining()<=0){budgetExceeded=true;return finish(draft);}
  const crop={...region,originX:0,width:dimensions.width,height:Math.min(region.height,dimensions.height-region.originY)};
  if(crop.height>0&&crop.width>0){
   try {
    stats.cropReads++;const detail=await native.crop(opened.id,crop,remaining());stats.nativeMs+=detail.durationMs??0;ensureCurrent();
    const outside=lines.filter(line=>{const y=(line.top!+line.bottom!)/2;return y<crop.originY||y>=crop.originY+crop.height;});
    const detailLines=offsetReceiptCropLines(detail.lines,crop.originX,crop.originY);
    const refined=parseReceiptLines([...outside,...detailLines]);
    if(refined.amount===draft.amount&&refined.lineItems.length>draft.lineItems.length)draft=orientationNeedsReview?{...refined,needsReview:true,reviewReason:orientationReviewReason}:refined;
   }catch{ensureCurrent();budgetExceeded=remaining()<=0;}
  }
  budgetExceeded=budgetExceeded||remaining()<=0;return finish(draft);
 }finally{await native.close(opened.id);}
}
