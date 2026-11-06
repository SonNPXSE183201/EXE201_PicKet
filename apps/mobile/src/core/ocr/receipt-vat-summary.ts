import type { ReceiptTextLine } from "./receipt-parser";

type PositionedLine = ReceiptTextLine & {left: number; right: number; top: number; bottom: number};
const normalize = (text: string) => text.toLowerCase().normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/\s+/g, " ")
  .replace(/^[\s|│┃]+|[\s|│┃]+$/g, "").trim();
const positioned = (line: ReceiptTextLine): line is PositionedLine =>
  [line.left, line.right, line.top, line.bottom].every(value => typeof value === "number" && Number.isFinite(value)) &&
  line.right! > line.left! && line.bottom! > line.top!;
const moneyCell = (line: ReceiptTextLine) => /^\d[\d.,\s]*(?:vnd|đ|d|₫)?$/i.test(line.text.trim());
const moneyValue = (line: ReceiptTextLine) => {
  const digits = line.text.replace(/[^0-9,.]/g, "");
  return Number((/[,.]\d{2}$/.test(digits) ? digits.slice(0, -3) : digits).replace(/\D/g, ""));
};

/** Independent final-row cells can verify the printed total despite a damaged base/tax cell. */
function paymentColumnsMatch(lines:PositionedLine[],payable:PositionedLine,totalHeader:PositionedLine,rowGap:number,total:number){
  const headers=lines.filter(line=>/^thue suat\s*\d+\s*%$/.test(normalize(line.text))&&
    line.left>payable.right&&line.right<totalHeader.left&&Math.abs(line.top-totalHeader.top)<=rowGap*3).sort((a,b)=>a.left-b.left);
  const sums:number[]=[];
  for(let index=0;index<headers.length;index++){
    const header=headers[index],previous=headers[index-1],next=headers[index+1];
    const left=previous?(previous.right+header.left)/2:header.left-(payable.bottom-payable.top);
    const right=((next?.left??totalHeader.left)+header.right)/2;
    const cells=lines.filter(line=>moneyCell(line)&&(line.left+line.right)/2>=left&&(line.left+line.right)/2<right&&
      line.top>header.bottom&&line.bottom<=payable.bottom+rowGap*2).sort((a,b)=>a.top-b.top);
    if(cells.length!==3)continue;
    const value=moneyValue(cells[2]);
    if(Number.isSafeInteger(value)&&value>0)sums.push(value);
  }
  return sums.length>=2&&Math.abs(sums.reduce((sum,value)=>sum+value,0)-total)<=1;
}

/** Resolve a VAT summary by column order and checked arithmetic, even on a skewed photo. */
export function receiptVatSummaryRows(lines: ReceiptTextLine[]): ReceiptTextLine[] {
  const removed = new Set<ReceiptTextLine>();
  const replacements = new Map<ReceiptTextLine, ReceiptTextLine>();
  const positionedLines = lines.filter(positioned);
  for (const payable of positionedLines.filter(line => /^(?:tien|tong tien) thanh toan\s*:?$/.test(normalize(line.text)))) {
    const labelHeight = payable.bottom - payable.top;
    const labels = positionedLines.filter(line => Math.abs(line.left - payable.left) <= labelHeight &&
      line.top < payable.top && payable.top - line.top <= labelHeight * 8);
    const subtotals = labels.filter(line => /^tien hang\s*:?$/.test(normalize(line.text)));
    const taxes = labels.filter(line => /^tien thue\s*:?$/.test(normalize(line.text)));
    if (subtotals.length !== 1 || taxes.length !== 1 || subtotals[0].top >= taxes[0].top) continue;
    const subtotal = subtotals[0];
    const rowGap = Math.max(taxes[0].top - subtotal.top, payable.top - taxes[0].top);
    const headers = positionedLines.filter(line => /^tong cong\s*:?$/.test(normalize(line.text)) &&
      line.left > payable.right && line.top < subtotal.bottom && subtotal.top - line.bottom <= rowGap * 4);
    // A bare table heading is not itself a payable amount. Preserve other text,
    // but omit unresolved total labels so raw-text reparse cannot guess a tax cell.
    removed.add(payable);
    headers.forEach(header => removed.add(header));
    if (headers.length !== 1) continue;
    const header = headers[0];
    const width = header.right - header.left;
    const amounts = positionedLines.filter(line => moneyCell(line) && line.left >= header.left - labelHeight &&
      line.left <= header.right + width && line.top > header.bottom &&
      line.bottom <= payable.bottom + rowGap * 2).sort((a, b) => a.top - b.top);
    if(amounts.length<1||amounts.length>3)continue;
    const values=amounts.map(moneyValue),total=values.at(-1)!;
    if(!values.every(Number.isSafeInteger)||total<=0||total>9_000_000_000_000)continue;
    const componentsMatch=values.length===3&&Math.abs(values[0]+values[1]-total)<=1;
    if(!componentsMatch&&!paymentColumnsMatch(positionedLines,payable,header,rowGap,total))continue;
    removed.delete(payable);
    removed.add(amounts.at(-1)!);
    replacements.set(payable, {...payable, text: `Tiền thanh toán: ${total}`,
      ...(!componentsMatch?{reviewIssue:"inconsistent-vat-components" as const,confidence:Math.min(payable.confidence??0.75,0.55)}:{})});
  }
  return lines.filter(line => !removed.has(line)).map(line => replacements.get(line) ?? line);
}
