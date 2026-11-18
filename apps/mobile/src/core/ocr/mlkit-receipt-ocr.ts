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
 prepare?():Promise<void>;
};
let scanning=false;
let prepared:Promise<void>|null=null;
/** Loads the recognition model in the background (camera screen open), so the first scan skips it. */
export function prepareReceiptOcr():void{
 prepared??=import("expo").then(({requireNativeModule})=>requireNativeModule<NativeSession>("PicketReceiptOcr").prepare?.())
  .then(()=>undefined,(error:unknown)=>{prepared=null;console.info("PICKET_OCR_STATUS",JSON.stringify({code:"OCR_PREPARE_FAILED",detail:String(error).slice(0,120)}));});
}
/** Native owns decoded pixels and the recognizer; no PNG files cross the bridge. */
export async function recognizeReceipt(imageUri:string,signal?:AbortSignal):Promise<ReceiptOcrResult>{
 if(scanning)throw new Error("OCR_BUSY");
 scanning=true;
 try{
  const {requireNativeModule}=await import("expo");
  const module=requireNativeModule<NativeSession>("PicketReceiptOcr");
  const native:ReceiptOcrSession={open:uri=>module.open(uri),direction:(...args)=>module.direction(...args),inspect:(...args)=>module.inspect(...args),select:(...args)=>module.select(...args),
   crop:(id,region,timeout)=>module.crop(id,region.originX,region.originY,region.width,region.height,timeout),close:id=>module.close(id)};
  const called=Date.now();
  const result=await scanReceiptSession(imageUri,native,()=>Date.now(),signal);
  // Wall time the caller waited, including closing the native session.
  const totalMs=Date.now()-called;
  // Diagnostics re-parse the evidence; run them after the review screen has rendered, never on the result path.
  setTimeout(()=>console.info("PICKET_OCR_PERF",JSON.stringify({durationMs:result.durationMs,totalMs,budgetExceeded:result.budgetExceeded,...result.stats,
   hasAmount:result.draft.amount!==null,hasMerchant:result.draft.merchant!==null,hasDate:result.draft.date!==null,itemsCount:result.draft.lineItems.length,
   parsedEligible:canAttachParsedReceipt(result.draft),rawEligible:canAttachReceipt(result.draft)})),1500);
  return result;
 }catch(error){
  const code=["OCR_BUSY","OCR_TIMEOUT","OCR_CANCELLED","OCR_ORIENTATION_UNCERTAIN"].find(code=>String(error).includes(code))??"OCR_FAILED";
  console.info("PICKET_OCR_STATUS",JSON.stringify({code}));
  throw error;
 }finally{scanning=false;}
}
