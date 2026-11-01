import {parseReceiptItemMoney} from "./receipt-money";
import {normalizeReceiptLabel} from "./receipt-semantics";

/** Only named tax/fee/discount rows; a percentage is never itself a money value. */
export function receiptAdjustmentLabel(text:string):1|-1|null {
  const label=normalizeReceiptLabel(text).replace(/\(?\s*\d+(?:[.,]\d+)?\s*%\s*\)?/g,'').replace(/\s*:\s*$/,'').trim();
  if(/^(?:discount|giam gia)$/.test(label))return -1;
  return /^(?:service(?: charge)?|phi (?:dich vu|giao hang|van chuyen)|shipping(?: fee| charge)?|delivery (?:fee|charge)|vat|tax|pb[ -]?1|(?:tien )?thue(?: gtgt)?)$/.test(label)?1:null;
}

export function observedReceiptAdjustments(rawText:string):number {
  let result=0;
  for(const line of rawText.split(/\r?\n/)){
    const match=line.trim().match(/^(.*?)\s+(-?\d[\d., \u00a0]*(?:vnd|đ|d|₫)?)$/i);
    if(!match)continue;
    const role=receiptAdjustmentLabel(match[1]);
    if(role===null||role===1&&match[2].startsWith('-'))continue;
    const amount=parseReceiptItemMoney(match[2].replace(/^-/,''));
    if(amount!==null)result+=role*amount;
  }
  return result;
}
