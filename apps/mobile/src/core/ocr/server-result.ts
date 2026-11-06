import { parseReceiptLines, parseReceiptText, type ReceiptTextLine, type ReceiptDraftLine } from "./receipt-parser";
import {isReceiptMetadata,isReceiptDocumentLabel,isReceiptSummary} from "./receipt-semantics";

const maxReceiptAmount = 9_000_000_000_000;

export interface ParsedServerOcrResult {
  rawText: string;
  merchant: string | null;
  amount: number | null;
  date: string | null;
  lineItems: ReceiptDraftLine[];
  confidence: number | null;
  needsReview: boolean;
}

function validStructuredDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/,
  );
  if (!match || !Number.isFinite(Date.parse(value))) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const calendarDay = new Date(Date.UTC(year, month - 1, day));
  return calendarDay.getUTCFullYear() === year &&
    calendarDay.getUTCMonth() === month - 1 &&
    calendarDay.getUTCDate() === day;
}

export function parseServerOcrResult(
  result: Record<string, unknown>,
): ParsedServerOcrResult {
  const rawText = typeof result.rawText === "string" ? result.rawText : "";
  const providerLines: ReceiptTextLine[] = [];
  if (Array.isArray(result.lines)) for (const item of result.lines.slice(0,160)) {
    if (!item || typeof item !== "object" || typeof item.text !== "string" || !item.text.trim() || item.text.length > 500) continue;
    const box: unknown = item.box;
    if (!Array.isArray(box) || box.length < 4 || box.length > 8 || !box.every(point => Array.isArray(point) && point.length === 2 && point.every(v => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100000))) continue;
    const points = box as number[][];
    const left=Math.min(...points.map(p=>p[0])),right=Math.max(...points.map(p=>p[0]));
    const top=Math.min(...points.map(p=>p[1])),bottom=Math.max(...points.map(p=>p[1]));
    if (left >= right || top >= bottom) continue;
    providerLines.push({text:item.text, left,right,top,bottom,confidence:typeof item.confidence === "number" && Number.isFinite(item.confidence) && item.confidence >= 0 && item.confidence <= 1 ? item.confidence : undefined});
  }
  // Partial geometry must not silently remove rows present in the original text.
  const completeGeometry = providerLines.length > 0 && providerLines.map(line=>line.text.trim()).join("\n") === rawText.split(/\r?\n/).map(line=>line.trim()).filter(Boolean).join("\n");
  const parsed = completeGeometry ? parseReceiptLines(providerLines) : parseReceiptText(rawText);
  const structuredMerchant =
    typeof result.merchant === "string" &&
    result.merchant.trim().length > 0 &&
    result.merchant.trim().length <= 160
    && !isReceiptMetadata(result.merchant) && !isReceiptDocumentLabel(result.merchant) && !isReceiptSummary(result.merchant)
      ? result.merchant.trim()
      : null;
  const structuredAmount =
    typeof result.amount === "number" &&
    Number.isSafeInteger(result.amount) &&
    result.amount > 0 &&
    result.amount <= maxReceiptAmount
      ? result.amount
      : null;
  const structuredDate = validStructuredDate(result.purchasedAt)
    ? result.purchasedAt
    : validStructuredDate(result.date)
      ? result.date
      : null;
  const parsedMerchant = parsed.merchant
    ?.replace(/\s+\d{1,3}(?:[.,]\d{3})+\s*$/, "")
    .trim();
  const confidence =
    typeof result.confidence === "number" &&
    Number.isFinite(result.confidence) &&
    result.confidence >= 0 &&
    result.confidence <= 1
      ? result.confidence
      : null;

  return {
    rawText: completeGeometry ? parsed.rawText : rawText,
    merchant: structuredMerchant ?? parsedMerchant ?? null,
    amount: structuredAmount ?? parsed.amount,
    date: structuredDate ?? parsed.date,
    lineItems: parsed.lineItems,
    confidence,
    needsReview: parsed.needsReview || confidence === null || confidence < 0.7 ||
      (structuredAmount !== null && parsed.amount !== null && structuredAmount !== parsed.amount),
  };
}
