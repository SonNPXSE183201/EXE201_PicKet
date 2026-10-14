export type ReceiptTextLine = {
  text: string;
  confidence?: number;
  top?: number;
  bottom?: number;
};

export type ReceiptDraft = {
  rawText: string;
  merchant: string | null;
  amount: number | null;
  date: string | null;
  merchantConfidence: number | null;
  amountConfidence: number | null;
  dateConfidence: number | null;
  recognizedLineCount: number;
  needsReview: boolean;
  reviewReason: string | null;
  lineItems: ReceiptDraftLine[];
};

export type ReceiptDraftLine = {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  confidence: number;
};

const totalWords = /tong\s*(cong|tien|thanh\s*toan)?|tng\s*cng|cong\s*tien\s*hang|so\s*tien\s*(thanh\s*toan|phai\s*tra)|can\s*thanh\s*toan|thanh\s*toan|phai\s*tra|grand\s*total|round(?:ed|\s*d)\s*total|total\s*due|amount\s*due|^total\b|^due$/i;
const strongTotalWords = /tong\s*cong|tng\s*cng|thanh\s*toan|phai\s*tra|grand\s*total|round(?:ed|\s*d)\s*total|total\s*due|amount\s*due|^due$/i;
const trailingTotalWords = /^(?:total\s*due|amount\s*due|due)$/i;
const rejectedTotalWords = /subtotal|tam\s*tinh|tien\s*khach|tien\s*thua|change|tendered|cash\s*received|so\s*luong/i;
const rejectedItemWords = /\b(tong|total|subtotal|tam\s*tinh|thanh\s*toan|phai\s*tra|vat|tax|thue|giam\s*gia|discount|tien\s*thua|tien\s*khach|change|cash|barcode|ma\s*hang|don\s*gia|so\s*luong|qty|ngay|date|gio|time|mst|ma\s*so\s*thue|hoa\s*don|receipt|invoice|dia\s*chi|address|hotline|tel)\b/i;

function normalized(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ")
    .trim();
}

function confidence(line: ReceiptTextLine, fallback = 0.75) {
  return Math.max(0, Math.min(1, line.confidence ?? fallback));
}

export function parseReceiptMoney(value: string): number | null {
  let digits = value.replace(/[^0-9,.]/g, "");
  if (/[,.]\d{2}$/.test(digits)) digits = digits.slice(0, -3);
  digits = digits.replace(/\D/g, "");
  const amount = Number.parseInt(digits, 10);
  return Number.isSafeInteger(amount) && amount > 0 && amount <= 9000000000000
    ? amount
    : null;
}

export function parseReceiptLineItems(
  recognizedLines: ReceiptTextLine[],
): ReceiptDraftLine[] {
  const items: ReceiptDraftLine[] = [];
  for (const line of recognizedLines) {
    if (items.length >= 100) break;
    const text = line.text.trim();
    const clean = normalized(text);
    if (!/[A-Za-zÀ-ỹ]/.test(text) || rejectedItemWords.test(clean)) continue;
    const priceMatch = text.match(
      /(\d{1,3}(?:[.,\s]\d{3})+(?:[.,]\d{2})?|\d{3,}(?:[.,]\d{2})?)(?:\s*(?:vnd|đ|d|₫))?\s*$/i,
    );
    if (!priceMatch || priceMatch.index === undefined) continue;
    const total = parseReceiptMoney(priceMatch[1]);
    if (total === null) continue;
    let name = text.slice(0, priceMatch.index).replace(/[-:|]+\s*$/, "").trim();
    let quantity = 1;
    let unitPrice = total;
    const quantityMatch = name.match(
      /^(.*?)\s+(\d+(?:[.,]\d+)?)\s*[xX*@]\s*(\d[\d.,\s]*)\s*$/,
    );
    if (quantityMatch) {
      const parsedQuantity = Number(quantityMatch[2].replace(",", "."));
      const parsedUnitPrice = parseReceiptMoney(quantityMatch[3]);
      if (
        Number.isFinite(parsedQuantity) &&
        parsedQuantity > 0 &&
        parsedQuantity <= 1_000_000 &&
        parsedUnitPrice !== null &&
        Math.abs(parsedQuantity * parsedUnitPrice - total) <= 1
      ) {
        name = quantityMatch[1].trim();
        quantity = parsedQuantity;
        unitPrice = parsedUnitPrice;
      } else {
        continue;
      }
    }
    if (name.length < 2 || name.length > 200) continue;
    items.push({
      name,
      quantity,
      unitPrice,
      total,
      confidence: confidence(line),
    });
  }
  return items;
}

export function parseReceiptText(rawText: string): ReceiptDraft {
  return parseReceiptLines(rawText.split(/\r?\n/).map((text) => ({ text })));
}

/** Pure parser shared by the future native ML Kit adapter and review UI. */
export function parseReceiptLines(recognizedLines: ReceiptTextLine[]): ReceiptDraft {
  const lines = recognizedLines
    .map((line) => ({ ...line, text: line.text.trim() }))
    .filter((line) => line.text.length > 0);
  const rawText = lines.map((line) => line.text).join("\n");
  const maxBottom = Math.max(0, ...lines.map((line) => line.bottom ?? 0));
  const totals: { amount: number; score: number }[] = [];

  lines.forEach((line, index) => {
    const clean = normalized(line.text);
    if (!totalWords.test(clean) || rejectedTotalWords.test(clean)) return;
    const ownNumbers = [...line.text.matchAll(/\d[\d.,\s]*/g)];
    const next = lines[index + 1];
    const previous = lines[index - 1];
    const previousNumbers = previous
      ? [...previous.text.matchAll(/\d[\d.,\s]*/g)]
      : [];
    const usePrevious =
      ownNumbers.length === 0 &&
      trailingTotalWords.test(clean) &&
      previousNumbers.length > 0;
    const source = ownNumbers.length > 0 ? line : usePrevious ? previous : next;
    const numbers = ownNumbers.length > 0
      ? ownNumbers
      : usePrevious
        ? previousNumbers
        : next
          ? [...next.text.matchAll(/\d[\d.,\s]*/g)]
          : [];
    const amount = numbers.length > 0 ? parseReceiptMoney(numbers.at(-1)?.[0] ?? "") : null;
    if (!source || amount === null) return;
    const nearBottom = maxBottom > 0 && (source.bottom ?? 0) / maxBottom >= 0.55;
    const score = Math.min(1, 0.52 + confidence(source) * 0.22 + (source === line ? 0.14 : 0.08) + (nearBottom ? 0.08 : 0.0) + (strongTotalWords.test(clean) ? 0.12 : 0));
    totals.push({ amount, score });
  });
  totals.sort((left, right) => right.score - left.score);
  const selectedTotal = totals[0] ?? null;

  let date: string | null = null;
  let dateConfidence: number | null = null;
  for (const line of lines) {
    const match = line.text.match(
      /\b(\d{1,2})[./-](\d{1,2})[./-](\d{2}|\d{4})\b/,
    );
    if (!match) continue;
    const [day, month] = match.slice(1, 3).map(Number);
    const parsedYear = Number(match[3]);
    const year = match[3].length === 2 ? 2000 + parsedYear : parsedYear;
    const candidate = new Date(Date.UTC(year, month - 1, day));
    if (candidate.getUTCFullYear() === year && candidate.getUTCMonth() === month - 1 && candidate.getUTCDate() === day && year >= 2000 && year <= new Date().getFullYear() + 1) {
      date = candidate.toISOString();
      dateConfidence = confidence(line, 0.8);
      break;
    }
  }

  const merchants = lines
    .map((line, index) => {
      const clean = normalized(line.text);
      const digitCount = (line.text.match(/\d/g) ?? []).length;
      if (line.text.length < 3 || !/[A-Za-zÀ-ỹ]/.test(line.text) || /hoa\s*don|receipt|invoice|mst|tax|dia\s*chi|address|hotline|tel\b|ngay\b|date\b|tong|subtotal|thanh\s*toan/i.test(clean) || digitCount > line.text.length / 3) return null;
      const relativeTop = maxBottom > 0 && line.top !== undefined ? line.top / maxBottom : index / Math.max(1, lines.length);
      const letters = line.text.replace(/[^A-Za-zÀ-ỹ]/g, "");
      return { value: line.text, score: Math.min(1, confidence(line) * 0.45 + (1 - relativeTop) * 0.35 + 0.1 + (letters.length >= 4 && letters === letters.toUpperCase() ? 0.1 : 0)) };
    })
    .filter((candidate): candidate is { value: string; score: number } => candidate !== null)
    .sort((left, right) => right.score - left.score);
  const merchant = merchants[0] ?? null;
  const lineItems = parseReceiptLineItems(lines);

  const reviewReason = rawText.length === 0
    ? "Không nhận diện được chữ trong ảnh."
    : selectedTotal === null
      ? "Không tìm thấy tổng tiền cần thanh toán."
      : selectedTotal.score < 0.7
        ? "Tổng tiền có độ tin cậy thấp."
        : lines.length < 3
          ? "Ảnh có quá ít dòng chữ để kiểm tra kết quả."
          : null;
  return { rawText, merchant: merchant?.value ?? null, amount: selectedTotal?.amount ?? null, date, merchantConfidence: merchant?.score ?? null, amountConfidence: selectedTotal?.score ?? null, dateConfidence, recognizedLineCount: lines.length, needsReview: reviewReason !== null, reviewReason, lineItems };
}
