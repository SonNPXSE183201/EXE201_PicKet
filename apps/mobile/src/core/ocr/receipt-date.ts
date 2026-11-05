import type { ReceiptTextLine } from "./receipt-parser";
import { normalizeReceiptLabel } from "./receipt-semantics";

const months: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
  apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7,
  aug: 8, august: 8, sep: 9, sept: 9, september: 9,
  oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
};
const unrelatedDate = /\b(?:hsd|nsx|mfg|exp(?:iry|iration)?|best before|use by|date of birth|birth ?date|ngay sinh|ngay san xuat|han su dung|han dung|ngay ky|da ky|signed|signature|due date|ngay den han)\b/;
const transactionLabel = /^(?:ngay(?:\s+(?:ban|tao|lap|mua|giao dich|hoa don))?|date(?:\s+of\s+(?:sale|purchase))?|invoice date|transaction date)\b/;

function calendarDate(year: number, month: number, day: number): string | null {
  if (year < 2000 || year > new Date().getFullYear() + 1) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? date.toISOString() : null;
}

/** Parse observed transaction dates only, without using the current date as a fallback. */
export function receiptDate(lines: ReceiptTextLine[]): { date: string; confidence: number; index: number } | null {
  const candidates: { date: string; confidence: number; index: number; priority: number }[] = [];
  lines.forEach((line, index) => {
    const text = normalizeReceiptLabel(line.text);
    if (unrelatedDate.test(text)) return;
    let date: string | null = null;
    const numeric = text.match(/\b(\d{4})[./-](\d{1,2})[./-](\d{1,2})\b/);
    if (numeric) date = calendarDate(Number(numeric[1]), Number(numeric[2]), Number(numeric[3]));
    else {
      const local = text.match(/\b(\d{1,2})[./-](\d{1,2})[./-](\d{2}|\d{4})\b/)
        ?? text.match(/\bngay\s*(\d{1,2})\s*thang\s*(\d{1,2})\s*nam\s*(\d{4})\b/);
      if (local) date = calendarDate(Number(local[3]) + (local[3].length === 2 ? 2000 : 0), Number(local[2]), Number(local[1]));
      else {
        // Anchor named-month dates after a date label or at the start of a date
        // line. A product model containing a month name is not date evidence.
        const value = text.replace(/^(?:date|invoice date|transaction date)\s*:?\s*/, "")
          .replace(/^(?:mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)[,\s]+/, "");
        const dayFirst = value.match(/^(\d{1,2})[\s-]+([a-z]+)[\s,-]+(\d{4})(?=$|\s)/);
        const monthFirst = value.match(/^([a-z]+)\s+(\d{1,2}),?\s+(\d{4})(?=$|\s)/);
        if (dayFirst && months[dayFirst[2]]) date = calendarDate(Number(dayFirst[3]), months[dayFirst[2]], Number(dayFirst[1]));
        else if (monthFirst && months[monthFirst[1]]) date = calendarDate(Number(monthFirst[3]), months[monthFirst[1]], Number(monthFirst[2]));
      }
    }
    if (date) candidates.push({ date, confidence: Math.max(0, Math.min(1, line.confidence ?? .8)), index,
      priority: transactionLabel.test(text) ? 1 : 0 });
  });
  candidates.sort((a, b) => b.priority - a.priority || a.index - b.index);
  return candidates[0] ?? null;
}
