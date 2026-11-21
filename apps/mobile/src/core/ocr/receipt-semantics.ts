import type {ReceiptTextLine} from "./receipt-parser";

/** Small bounded memo for pure per-line string functions; one parse asks about the same line many times. */
function memoized<T>(compute: (value: string) => T): (value: string) => T {
  const cache = new Map<string, T>();
  return (value) => {
    if (cache.has(value)) return cache.get(value) as T;
    if (cache.size >= 4096) cache.clear();
    const result = compute(value);
    cache.set(value, result);
    return result;
  };
}

/** Normalize labels only; never rewrite the displayed merchant/product name. */
export const normalizeReceiptLabel = memoized((value: string) => value.toLowerCase().normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/\s+/g, " ").trim());

const noisySummaryPhrases: { words: string[]; role: 1 | 2 }[] = [
  { words: ["tong", "thanh", "toan"], role: 2 },
  { words: ["tong", "tien", "thanh", "toan"], role: 2 },
  { words: ["thanh", "toan"], role: 2 },
  { words: ["phai", "tra"], role: 2 },
  { words: ["can", "tra"], role: 2 },
  // OCR can confuse generic "tổng cộng" with a payable label. Keep its
  // damaged spelling at generic priority; "tổng tiền" is more specific.
  { words: ["tong", "cong"], role: 1 },
  { words: ["tong", "tien"], role: 2 },
  { words: ["tong", "gom", "vat"], role: 1 },
];

function differsByAtMostOneCharacter(left: string, right: string): boolean {
  if (left === right) return true;
  // Allow only observed OCR confusions in Vietnamese total words. Arbitrary
  // substitutions (for example "cộng tiền" or "rong biển") create false totals.
  if (right === "tong" && /^(?:[ilr]ong|teng)$/.test(left)) return true;
  if (right === "thanh" && left === "thant") return true;
  const commonOcrConfusions: Record<string, string> = { r: "t", e: "o" };
  if (Math.abs(left.length - right.length) > 1) return false;
  let leftIndex = 0, rightIndex = 0, edits = 0;
  while (leftIndex < left.length && rightIndex < right.length) {
    if (left[leftIndex] === right[rightIndex]) {
      leftIndex++;
      rightIndex++;
      continue;
    }
    if (++edits > 1) return false;
    if (left.length === right.length) {
      const leftCharacter = left[leftIndex], rightCharacter = right[rightIndex];
      if (commonOcrConfusions[leftCharacter] !== rightCharacter && commonOcrConfusions[rightCharacter] !== leftCharacter) return false;
      leftIndex++;
      rightIndex++;
      continue;
    }
    if (left.length > right.length) leftIndex++;
    else rightIndex++;
  }
  return edits + (leftIndex < left.length || rightIndex < right.length ? 1 : 0) <= 1;
}

/** Correct only small, per-token OCR noise in known summary phrases. */
export const noisyReceiptSummaryRole = memoized(noisySummaryRoleOf);
function noisySummaryRoleOf(text: string): 1 | 2 | null {
  const prefix = normalizeReceiptLabel(text).split(/\d/, 1)[0]
    .replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();
  const words = prefix.split(" ").filter(Boolean);
  if (words.length < 2 || words.length > 4) return null;
  for (const phrase of noisySummaryPhrases) {
    if (phrase.words.length !== words.length) continue;
    let edits = 0, matches = true;
    for (let index = 0; index < words.length; index++) {
      if (!differsByAtMostOneCharacter(words[index], phrase.words[index])) {
        matches = false;
        break;
      }
      if (words[index] !== phrase.words[index]) edits++;
    }
    if (matches && edits > 0 && edits <= 2) return phrase.role;
  }
  return null;
}

/** A product name has at least one real word: letters only, or a brand/size such as "7UP", "200g", "C2". */
export function receiptNameHasWord(text:string):boolean{
  return text.split(/\s+/).some(word=>/^[(["'•*-]?(?:\p{L}{2,}|\d+\p{L}+|\p{L}+\d+)[.,:;)\]"'/-]*$/u.test(word));
}

export function merchantDisplayName(value:string):string {
  return value.replace(/^(?:đơn vị bán hàng|tên cửa hàng|seller|merchant)\s*:\s*/iu,'')
    .replace(/^((?:cà\s+phê|nhà\s+hàng|cửa\s+hàng|siêu\s+thị|nhà\s+thuốc))(?=\p{L})/iu,'$1 ').trim();
}

/** Some cash receipts put the seller after a "payment slip" heading. */
export function receiptMerchantFromDocumentHeading(text:string):string|null {
  const match=text.match(/^ph[ií][eêế]u\s+thanh\s+to(?:a|á)?n?\s+(.+)$/iu);
  const candidate=match?.[1]?.trim();
  return candidate&&/[\p{L}]{3}/u.test(candidate)?candidate:null;
}

// A printed line amount ("32.000", "| 32000", low-confidence "~ 32000") ends product rows,
// never a street address.
const pricedRow = /(?:\s\d{1,3}(?:[.,]\d{3})+(?:[.,]00)?|[|~]\s*\d+)\s*(?:vnd|d)?$/;

/** Street-address shapes. Product names such as "Đường mía" or "Nước ... Ít Đường" are only
 * excluded from this test when the row carries its own price (see isReceiptMetadata). */
function looksLikeStreetAddress(text: string, value: string): boolean {
  // Folding accents must not turn a restaurant's "Quán" into district "Quận".
  if (/^quán\b/iu.test(text.trim().normalize("NFC"))) return false;
  return /^(?:duong\b|dc\s*[:.]|q[.]|p[.]|tp[.]|tinh\b|huyen\b|quan\b|phuong\b|no[.]?\s*\d)/.test(value)
    // House number immediately followed by a street name ("12 Nguyễn Huệ", "45A/2 Lê Lợi").
    || /^\d+[a-z]?(?:[/-]\d+[a-z]?)*\s+(?:(?:duong|pho)\s+)?(?:nguyen|tran|le|pham|hoang|duong)\b/.test(value)
    || /^\d+\s+[^|]*\b(?:street|road|avenue|kdc|phuong|quan)\b/.test(value);
}

/** `priced` marks a name whose own line amount was already read (the amount is not in `text`). */
export function isReceiptMetadata(text: string, options: { priced?: boolean } = {}): boolean {
  const value = normalizeReceiptLabel(text);
  const priced = options.priced === true || pricedRow.test(value);
  return /^(?:(?:ban|table)\s*[:#-]?\s*\d+\b|cashier\s*name\b|n\s*\/\s*v\s*:|kh\s*:|d\s*\/\s*c\s*:|so\s+order\b|ho(?:\s+va)?\s+ten\s+nguoi\s+mua(?:\s+hang)?\s*:)/.test(value)
    || /^(?:order|bill|inv(?:oice)?|receipt|ref(?:erence)?|trans(?:action)?|doc(?:ument)?|check|ticket|voucher|folio|pos|terminal|approval|auth(?:orization)?|trace|batch)\s*[:#]/.test(value)
    || /^thong tin ocr\s*:|^store\s*:|^thu\s+n?[cgp]?an\b/.test(value)
    // Card-terminal slip fields: terminal/merchant ids, batch, card data and EMV tags are never products.
    || /^(?:tid|mid|lo|the|het\s*han|loai|aid|arqc|tc|tvr|tsi|appl?\s*label|card|exp(?:iry)?)\s*[:.]/.test(value)
    || /^(?:[:|]\s*)?(?:s[. ]?d[. ]?t|dt|dien thoai|phone|hotline|tel|fax|mst|ma so thue|tax id|stk|so tai khoan|account|iban|website|email|thu\s*ngan|cashier|nhan vien|nv|phuc\s*vu|phyc\s*u|khach hang|customer|nguoi mua|nguoi ban|dia chi|address|ma\s*(?:don(?:\s*hang)?|dh|dat\s*hang|the|hd|hoa\s*don|phieu|bien\s*lai|chung\s*tu|cqt|thanh\s*vien|tv|giao\s*dich|gd|thanh\s*toan|tham\s*chieu|tra\s*cuu|xac\s*nhan|chuan\s*chi|phe\s*duyet|bill|order|ticket|check|ban|phong|khach(?:\s*hang)?|kh|nhan\s*vien|nv|thu\s*ngan|tn|cua\s*hang|ch|chi\s*nhanh|cn|quay|may|pos|thiet\s*bi|vach|hang|sp|san\s*pham)|so\s*(?:don(?:\s*hang)?|dh|dat\s*hang|hd|hoa\s*don|phieu|bien\s*lai|chung\s*tu|giao\s*dich|gd|tham\s*chieu|tra\s*cuu|bill|order|ticket|check|hieu|seri|serial|may|quay|pos)|(?:order|bill|inv(?:oice)?|receipt|ref(?:erence)?|trans(?:action)?|doc(?:ument)?|check|ticket|voucher|folio|pos|terminal|approval|auth(?:orization)?|trace|batch)\s*(?:no|number|id|code|#|:|\d)|ban\s*\d|table\s*\d|in luc|gio\s*(?:vao|ra|in)|gi[os]\s*(?:vao|ra)|gia vao|thoi gian|cam on|hen gap|thank|uu dai|khuyen mai|chuong trinh|diem tich|tich diem)\b/.test(value)
    || /^(?:www\.|https?:)/.test(value)
    || /^(?:so|no|ngay|date|time)\s*[:.#-]/.test(value)
    || /\b\d{1,2}[/-]\d{1,2}[/-]/.test(value)
    || /\b\d{1,2}:\d{2}(?::\d{2})?\b/.test(value)
    || (!priced && looksLikeStreetAddress(text, value))
    || /\b(?:q[.]\s*\d|p[.]\s*\d|tp[.]\s|kdc\b|jalan\b|district\b)/.test(value)
    || /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(value)
    || /^(?:[:|]\s*)?[^\d]*\b0\d{8,10}\b/.test(value);
}

export function isReceiptSummary(text: string): boolean {
  if (/^(?:cong(?=\s*(?:[:|]\s*)?(?:\d|$))|da\s+thanh\s+toan\b|already\s+paid\b|amount\s+paid\b|paid\b|khach\s+dua\b|tra\s+lai\b)/.test(normalizeReceiptLabel(text))) return true;
  if(/^(?:phi\s+(?:van chuyen|giao hang)|shipping\s+(?:fee|charge)|delivery\s+(?:fee|charge)|can\s*tra)\b/.test(normalizeReceiptLabel(text)))return true;
  if(/^(?:subttl\b|sub\s*ttl\b|items?\s+\d|total\s*(?:item|qty)|tax\b|pb[ -]?1\b|service charge\b|edc\b)/.test(normalizeReceiptLabel(text)))return true;
  // "t6ng"/"tbng"/"t0ng": OCR reads the hooked "ổ" of "Tổng" as a digit or "b"; no product starts so.
  return /^(?:tong\b|tng\b|t[06b]ng\b|teng cong\b|total\b|grand total\b|sub[ -]?total\b|tam tinh\b|thanh toan\b|so tien\b|tien\s*(?:hang|thue|khach|thua|thanh toan|ca\s*the|the|mat|chuyen\s*khoan|quet\s*the)\b|phai\s*(?:thanh\s*toan|tra)\b|can\s*(?:thanh\s*toan|tra)\b|vat\b|thue\b|tax\b|giam gia\b|discount\b|service\b|phi dich vu\b|cash\b|change\b|tendered\b|amount due\b|due\b)/.test(normalizeReceiptLabel(text)) || noisyReceiptSummaryRole(text) !== null;
}

/** Printed units of measure that POS receipts put beside a quantity ("GOI 2", "1- Cái"). */
export const receiptUnitWord=/^(?:goi|hop|cai|chai|lon|tui|vi|vien|ong|lo|hu|cap|bo|thung|ly|coc|phan|dia|suat|cay|qua|chiec|doi|kg|g|gr|l|ml|m|pcs|pc|ea|box|pack|unit|dvt)$/;

/** A quantity cell with its unit ("1- Cái", "2 hộp") is a value, never a product name. */
export function isReceiptQuantityWithUnit(text:string):boolean{
  const match=/^\d{1,4}(?:[.,]\d{1,3})?\s*[-–]?\s*(\p{L}+)$/u.exec(text.trim());
  return match!==null&&receiptUnitWord.test(normalizeReceiptLabel(match[1]));
}

/** A grouped amount ("290,000") is not a quantity; a weight keeps a small integer part ("0,375", "1,500"). */
export function isReceiptQuantityText(text:string):boolean{
  const match=/^(\d+)(?:[.,](\d+))?$/.exec(text.trim());
  return match!==null&&!(match[2]?.length===3&&Number(match[1])>=100);
}

export function isReceiptDocumentLabel(text: string): boolean {
  return /^(?:hoa\s*(?:don|dn|bn)\b|h[do]a\s*don\b|phieu\b|bien lai\b|bin lai\b|receipt\b|sales\s*invo|invoice\b|cash\s*bill\b|(?:gia|g)\s*ban\b|(?:gia|g|ca)\s*dang\s*k(?:y)?\b|don gia\b|thanh\s*ti[eêi]n\b|thanh\s*tin\b|t[.]?\s*tien\b|mat hang\b|(?:tt\s+)?ten\s*(?:mon|hang|san\s*pham|sp)\b|sl\b|so luong\b|qty\b|bao hanh\b|thong tin\b|hinh thuc\b|phuong thuc\b)/.test(normalizeReceiptLabel(text));
}

/** A header is positive evidence of a body boundary; a document title is a fallback. */
export function receiptBodyStart(lines: ReceiptTextLine[]): {index:number;top:number|null;hasTable:boolean} {
  const labels=lines.map(line=>normalizeReceiptLabel(line.text));
  // A one-line column header ("Tên SL Đơn giá Khuyến mại") names a quantity or price column after the name column.
  let index=labels.findIndex(text=>/^(?:mat hang|(?:tt\s+|stt\s+)?ten\s*(?:mon|hang(?:\s*hoa)?|san\s*pham|sp)|description|item)(?:\b|$)/.test(text)||
    /^(?:tt\s+|stt\s+)?(?:ten|san\s*pham)\s+(?:sl|so luong|qty|dvt|don gia|gia)\b.*\b(?:sl|so luong|qty|don gia|gia|thanh\s*tien|khuyen\s*mai)\b/.test(text));
  const quantity=/^(?:sl|s[.]l[.]?|so luong|qty|quantity)$/;
  for(let i=0;i<lines.length;i++){
    const line=lines[i];
    if(!quantity.test(labels[i])||line.top===undefined||line.bottom===undefined)continue;
    const cy=(line.top+line.bottom)/2,height=line.bottom-line.top;
    const partner=lines.findIndex((other,j)=>j!==i&&/^(?:don gia|gia(?:\s*ban)?(?:\s*\([^)]*\))?|d[.]?g[.]?|unit price|price|thanh\s*ti[eêi]n|thanh\s*tin|t[. ]?ti[eêi]n|t tren|tong|t[o0]ng|amount|total)$/.test(labels[j])&&other.top!==undefined&&other.bottom!==undefined&&Math.abs((other.top+other.bottom)/2-cy)<=Math.max(height,other.bottom-other.top)*1.5);
    if(partner>=0){
      if(index<0||line.top>(lines[index].top??Infinity))index=Math.max(i,partner);
    }
  }
  const hasTable=index>=0;
  if(index<0)index=labels.findIndex(text=>/^(?:hoa\s*(?:don|dn|bn)\b|phieu\s*(?:tinh|thanh|ban|mua)\b|sales\s*invo|invoice\b|receipt\b)/.test(text));
  return {index,top:index>=0?lines[index].bottom??null:null,hasTable};
}
