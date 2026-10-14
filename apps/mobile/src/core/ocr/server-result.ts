import { parseReceiptText, type ReceiptDraftLine } from "./receipt-parser";

export interface ParsedServerOcrResult {
  rawText: string;
  merchant: string | null;
  amount: number | null;
  date: string | null;
  lineItems: ReceiptDraftLine[];
}

export function parseServerOcrResult(
  result: Record<string, unknown>,
): ParsedServerOcrResult {
  const rawText = typeof result.rawText === "string" ? result.rawText : "";
  const parsed = parseReceiptText(rawText);
  const structuredMerchant =
    typeof result.merchant === "string" && result.merchant.trim()
      ? result.merchant.trim()
      : null;
  const structuredAmount =
    typeof result.amount === "number" &&
    Number.isSafeInteger(result.amount) &&
    result.amount > 0
      ? result.amount
      : null;
  const structuredDate =
    typeof result.purchasedAt === "string"
      ? result.purchasedAt
      : typeof result.date === "string"
        ? result.date
        : null;
  const parsedMerchant = parsed.merchant
    ?.replace(/\s+\d{1,3}(?:[.,]\d{3})+\s*$/, "")
    .trim();

  return {
    rawText,
    merchant: structuredMerchant ?? parsedMerchant ?? null,
    amount: structuredAmount ?? parsed.amount,
    date: structuredDate ?? parsed.date,
    lineItems: parsed.lineItems,
  };
}
