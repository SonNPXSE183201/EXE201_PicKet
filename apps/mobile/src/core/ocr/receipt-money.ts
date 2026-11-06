function moneyText(value:string):string {
  // ML Kit can split punctuation and the following digits into separate words.
  // Only horizontal whitespace beside punctuation is removed; complete-value
  // validation below still rejects separate columns and malformed grouping.
  return value.trim().replace(/\s*(?:vnd|đ|d|₫)\s*$/i, "").trim()
    .replace(/[ \u00a0]*([.,])[ \u00a0]*/g,'$1');
}

export function parseReceiptMoney(value: string): number | null {
  let digits = moneyText(value);
  // Accept one complete amount, never concatenate separate columns or repair
  // malformed grouping. VND values must be integral; never silently discard cents.
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+|\d{1,3}(?:,\d{3})+|\d{1,4}(?:[ \u00a0]\d{3})+)(?:[.,]\d{2})?$/.test(digits)) return null;
  if (/[,.]\d{2}$/.test(digits)) {
    if (!/[,.]00$/.test(digits)) return null;
    digits = digits.slice(0, -3);
  }
  digits = digits.replace(/\D/g, "");
  const amount = Number.parseInt(digits, 10);
  return Number.isSafeInteger(amount) && amount > 0 && amount <= 9000000000000
    ? amount
    : null;
}

/** Repairs one trailing OCR letter only for callers that already proved a payable-total label. */
export function parseReceiptSummaryMoney(value: string): number | null {
  const strict = parseReceiptMoney(value);
  if (strict !== null) return strict;
  const token = value.trim();
  if (!/[oO]$/.test(token)) return null;
  return parseReceiptMoney(token.slice(0, -1));
}

export function parseReceiptItemMoney(value: string): number | null {
 const digits=moneyText(value);
 return /^0(?:[.,]0{2})?$/.test(digits) ? 0 : parseReceiptMoney(digits);
}
