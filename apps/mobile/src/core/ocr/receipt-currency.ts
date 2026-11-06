/** The current transaction editor stores integer VND, not foreign minor units.
 * Detect explicit evidence only; a country/language is not a currency signal. */
export function receiptCurrencyWarning(rawText: string | null): string | null {
  if (!rawText) return null;
  const codes = 'AED|AFN|AMD|ANG|AOA|ARS|AUD|AWG|AZN|BAM|BBD|BDT|BGN|BHD|BIF|BMD|BND|BRL|BSD|BTN|BWP|BYN|BZD|CAD|CDF|CHF|CLP|CNH|CNY|COP|CRC|CVE|CZK|DJF|DKK|DOP|DZD|EGP|ERN|ETB|EUR|FJD|FKP|GBP|GHS|GIP|GMD|GNF|GTQ|GYD|HKD|HNL|HRK|HTG|HUF|IDR|ILS|INR|IQD|IRR|ISK|JMD|JOD|JPY|KES|KGS|KHR|KMF|KPW|KRW|KWD|KYD|KZT|LAK|LBP|LKR|LRD|LSL|LYD|MDL|MGA|MKD|MMK|MNT|MRU|MUR|MVR|MWK|MXN|MYR|MZN|NAD|NGN|NIO|NOK|NPR|NZD|OMR|PAB|PGK|PHP|PKR|PLN|PYG|QAR|RMB|RSD|RUB|RWF|SAR|SBD|SCR|SDG|SEK|SGD|SHP|SLE|SLL|SRD|SSP|STN|SYP|SZL|THB|TJS|TMT|TND|TTD|TWD|TZS|UAH|UGX|USD|UYU|UZS|VES|VUV|WST|XAF|XCD|XOF|XPF|YER|ZAR|ZMW|ZWG|ZWL';
  if (new RegExp(`(?:\\b(?:${codes})\\s*[:.]?\\s*\\d|\\d[\\d., ]*\\s*\\b(?:${codes})\\b|\\b(?:Rp|RM|Kr|Fr|zł|Kč|Ft|lei)\\.?\\s*\\d|\\d[\\d., ]*\\s*\\b(?:Rp|RM|Kr|Fr|zł|Kč|Ft|lei)\\.?|(?:(?!₫)\\p{Sc})\\s*\\d|\\d[\\d., ]*\\s*(?:(?!₫)\\p{Sc}))`, 'iu').test(rawText) || /(?:\b(?:ALL|BOB|CUP|GEL|MAD|MOP|PEN|RON|SOS|SVC|TOP|TRY)\s*[:.]?\s*\d|\d[\d., ]*\s*\b(?:ALL|BOB|CUP|GEL|MAD|MOP|PEN|RON|SOS|SVC|TOP|TRY)\b)/.test(rawText)) {
    return 'Hóa đơn có dấu hiệu dùng ngoại tệ. Picket chưa hỗ trợ chuyển hóa đơn này thành giao dịch VND; không tự quy đổi số tiền.';
  }
  const hasDecimalPrice = rawText.split(/\r?\n/).some(line => {
    if (/(?:total|amount\s*due|tổng|thanh\s*toán|tong|thanh\s*toan|đơn\s*giá|don\s*gia|thành\s*tiền|thanh\s*tien)/i.test(line)
      && /(?:^|\s)\d+(?:[.,]\d{3})*[.,](?!0{1,2}(?:\D|$))\d{1,2}(?=\s|$)/.test(line)) return true;
    // A named product can expose minor units even when the total is integral.
    // Require a terminal price, rather than treating every decimal quantity,
    // date or identifier elsewhere on the receipt as monetary evidence.
    const priceRow = line.match(/^\s*(.*?)\s+(\d+(?:[.,]\d{3})*[.,]\d{1,2})\s*(?:₫|đ|VND)?\s*[.,;:]?\s*$/iu);
    if (!priceRow || !/\p{L}/u.test(priceRow[1])) return false;
    if (/(?:^|\s)(?:x|×|sl|số\s*lượng|so\s*luong|qty|quantity)\s*:?\s*$/iu.test(priceRow[1])) return false;
    if (/^(?:sl|số\s*lượng|so\s*luong|qty|quantity|weight|trọng\s*lượng|trong\s*luong|ngày|ngay|date|giờ|gio|time|tel|phone|điện\s*thoại|dien\s*thoai|địa\s*chỉ|dia\s*chi|address|mã|ma|hóa\s*đơn|hoa\s*don|invoice)(?:\s|:|$)/iu.test(priceRow[1])) return false;
    return !/[.,]0{1,2}$/.test(priceRow[2]);
  });
  if (hasDecimalPrice) {
    return 'Hóa đơn có số tiền thập phân. Hãy kiểm tra tiền tệ; không tự làm tròn hoặc chuyển thành VND.';
  }
  return null;
}
