import type {ReceiptDraft} from "./receipt-parser";
import {scanReceiptSession,type ReceiptOcrSession,type OcrSample} from "./receipt-scan-session";
import {canAttachReceipt,canAttachParsedReceipt} from "./receipt-eligibility";
export type ReceiptOcrResult={draft:ReceiptDraft;durationMs:number;budgetExceeded?:boolean};
type NativeSession={
 open(uri:string):Promise<{id:string;width:number;height:number}>;
 direction(id:string,timeoutMs:number):Promise<OcrSample>;
 inspect(id:string,timeoutMs:number):Promise<OcrSample>;
 select(id:string,angle:number):Promise<{width:number;height:number}>;
 crop(id:string,x:number,y:number,width:number,height:number,timeoutMs:number):Promise<OcrSample>;
 close(id:string):Promise<void>;
};
let scanning=false;
/** Native owns decoded pixels and the recognizer; no PNG files cross the bridge. */
export async function recognizeReceipt(imageUri:string,signal?:AbortSignal):Promise<ReceiptOcrResult>{
 if(scanning)throw new Error("OCR_BUSY");
 scanning=true;
 try{
  const {requireNativeModule}=await import("expo");
  const module=requireNativeModule<NativeSession>("PicketReceiptOcr");
  const native:ReceiptOcrSession={open:uri=>module.open(uri),direction:(...args)=>module.direction(...args),inspect:(...args)=>module.inspect(...args),select:(...args)=>module.select(...args),
   crop:(id,region,timeout)=>module.crop(id,region.originX,region.originY,region.width,region.height,timeout),close:id=>module.close(id)};
  const result=await scanReceiptSession(imageUri,native,()=>Date.now(),signal);
  console.info("PICKET_OCR_PERF",JSON.stringify({durationMs:result.durationMs,budgetExceeded:result.budgetExceeded,...result.stats,
   hasAmount:result.draft.amount!==null,hasMerchant:result.draft.merchant!==null,hasDate:result.draft.date!==null,itemsCount:result.draft.lineItems.length,
   parsedEligible:canAttachParsedReceipt(result.draft),rawEligible:canAttachReceipt(result.draft)}));
  return result;
 }catch(error){
  const code=["OCR_BUSY","OCR_TIMEOUT","OCR_CANCELLED","OCR_ORIENTATION_UNCERTAIN"].find(code=>String(error).includes(code))??"OCR_FAILED";
  console.info("PICKET_OCR_STATUS",JSON.stringify({code}));
  throw error;
 }finally{scanning=false;}
}
