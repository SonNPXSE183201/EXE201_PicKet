import {normalizeReceiptLabel,noisyReceiptSummaryRole} from "./receipt-semantics";

/** Explicit payable labels outrank generic totals; subtotals never become payable. */
export function receiptTotalRole(text:string):0|1|2|3 {
  const label=normalizeReceiptLabel(text).replace(/^[\s|:–—-]+/,'');
  if(/^\d+\s+[a-z]+\s+.*\b(?:tong|total)\b|^(?:phieu\s+(?:thanh\s*toan|tinh\s*tien|ban\s*hang)|tong\s*(?:so luong|sl|san pham|tien hang)|cong tien hang|tien hang|sub[ -]?total|tam tinh|total\s*item|total\s*qty|tien\s*(?:khach|thua|tra lai)|khach dua|cash|change|tendered|vat|tax|thue|phi|shipping|discount|giam gia)\b/.test(label))return 0;
  if(/^t[.]?\s*tien\s*[:\-]?\s*\d/.test(label))return 3;
  if(/(?:tong\s*cong|tng\s*cng|thanh\s*toan|phai\s*tra|can\s*tra|grand\s*total|round(?:ed|\s*d)\s*total|amount\s*due|total\s*due|^due\b)/.test(label))return 2;
  const noisyRole=noisyReceiptSummaryRole(text);
  if(noisyRole!==null)return noisyRole;
  return 1;
}

export function looksLikeContactAmount(text:string):boolean {
  const digits=text.replace(/\s*(?:vnd|đ|d|₫)\s*$/i,'').replace(/[ .()-]/g,'');
  return /^(?:0\d{8,10}|\+84\d{8,10})$/.test(digits);
}
