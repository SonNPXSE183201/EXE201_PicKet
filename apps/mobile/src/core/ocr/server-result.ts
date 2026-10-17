import { parseReceiptText, type ReceiptDraftLine } from "./receipt-parser";

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
  const parsed = parseReceiptText(rawText);
  const structuredMerchant =
    typeof result.merchant === "string" &&
    result.merchant.trim().length > 0 &&
    result.merchant.trim().length <= 160
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
    rawText,
    merchant: structuredMerchant ?? parsedMerchant ?? null,
    amount: structuredAmount ?? parsed.amount,
    date: structuredDate ?? parsed.date,
    lineItems: parsed.lineItems,
    confidence,
    needsReview: parsed.needsReview || confidence === null || confidence < 0.7,
  };
}
