import type { ReceiptTextLine } from "./receipt-parser";
import {noisyReceiptSummaryRole,normalizeReceiptLabel} from "./receipt-semantics";

const clean = (text:string) => text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d").replace(/[|│┃]/g,"").replace(/\s+/g," ").trim();

/** Crop only an observed payable/VAT summary; never guess a location from a contact line. */
export function receiptSummaryCrop(lines: ReceiptTextLine[], width: number, height: number): {originX:number;originY:number;width:number;height:number}|null {
  if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)return null;
  const isExplicitPayable=(text:string)=>/^(?:(?:tien|tong|tong tien) thanh toan|tong\s*\([^)]*vat[^)]*\)|tong tien|tong cong|grand total|amount due)\s*:?$/.test(clean(text))||
    noisyReceiptSummaryRole(text)===2||/^t[.]?\s*tien\s*:?$/i.test(normalizeReceiptLabel(text));
  const labels=lines.filter(line=>typeof line.top==="number"&&typeof line.bottom==="number"&&Number.isFinite(line.top)&&Number.isFinite(line.bottom)&&line.bottom>line.top&&
    (/^(?:tien hang|tien thue|(?:tien|tong|tong tien) thanh toan|tong\s*\([^)]*vat[^)]*\)|tong tien|tong cong|grand total|amount due)\s*:?$/.test(clean(line.text))||noisyReceiptSummaryRole(line.text)!==null||/^t[.]?\s*tien\s*:?$/i.test(normalizeReceiptLabel(line.text))));
  const distinct=new Set(labels.map(line=>clean(line.text).replace(/\s*:\s*$/,""))).size;
  if(distinct<2&&!labels.some(line=>isExplicitPayable(line.text)))return null;
  const top=Math.min(...labels.map(line=>line.top!)),bottom=Math.max(...labels.map(line=>line.bottom!));
  const rowHeight=Math.max(...labels.map(line=>line.bottom!-line.top!));
  const margin=Math.max(rowHeight*(distinct<2?6:3),(bottom-top)*0.8);
  const originY=Math.max(0,Math.floor(top-margin));
  const end=Math.min(height,Math.ceil(bottom+margin));
  if(end<=originY||end-originY>height/2)return null;
  return {originX:0,originY,width:Math.floor(width),height:end-originY};
}
