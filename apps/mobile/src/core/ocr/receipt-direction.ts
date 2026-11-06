import type {ReceiptTextLine} from "./receipt-parser";
export type ReceiptRotation=0|90|180|270;
/** Use agreement between recognized text directions, never a guessed receipt amount. */
export function inferReceiptRotation(lines:ReceiptTextLine[]):ReceiptRotation|null{
 const buckets=new Map<ReceiptRotation,{weight:number;count:number}>();let total=0;
 for(const line of lines){
  if(typeof line.angle!=="number"||!Number.isFinite(line.angle))continue;
  const letters=(line.text.match(/[A-Za-zÀ-ỹ]/g)??[]).length,confidence=line.confidence??0.75;
  if(letters<4||!Number.isFinite(confidence)||confidence<0.45)continue;
  const normalized=((line.angle%360)+360)%360,cardinal=(Math.round(normalized/90)*90)%360;
  const deviation=Math.abs(((normalized-cardinal+540)%360)-180);if(deviation>20)continue;
  const correction=((360-cardinal)%360) as ReceiptRotation,weight=Math.min(letters,40)*confidence;
  const current=buckets.get(correction)??{weight:0,count:0};current.weight+=weight;current.count++;buckets.set(correction,current);total+=weight;
 }
 const best=[...buckets.entries()].sort((a,b)=>b[1].weight-a[1].weight)[0];
 return best&&best[1].count>=2&&best[1].weight>=8&&best[1].weight/total>=0.8?best[0]:null;
}
export function orientReceiptLines(lines:ReceiptTextLine[],width:number,height:number,angle:ReceiptRotation):ReceiptTextLine[]{
 return lines.map(line=>{
  const {left,right,top,bottom}=line;
  if(![left,right,top,bottom].every(value=>typeof value==='number'&&Number.isFinite(value)))return {...line};
  if(angle===90)return {...line,left:height-bottom!,right:height-top!,top:left!,bottom:right!};
  if(angle===180)return {...line,left:width-right!,right:width-left!,top:height-bottom!,bottom:height-top!};
  if(angle===270)return {...line,left:top!,right:bottom!,top:width-right!,bottom:width-left!};
  return {...line};
 }).sort((a,b)=>(a.top??0)-(b.top??0)||(a.left??0)-(b.left??0));
}
