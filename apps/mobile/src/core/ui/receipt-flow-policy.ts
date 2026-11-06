import type { Href } from "expo-router";

export function receiptCalendarDate(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : null;
}

/** The recognized purchase day selects the calendar destination; selection is a fallback. */
export function receiptCaptureDate(chosen: unknown, detected: string | null, now = new Date()): string {
  const detectedDay=detected&&Number.isFinite(Date.parse(detected))?receiptCalendarDate(detected.slice(0,10)):null;
  const day = detectedDay??receiptCalendarDate(chosen);
  if (day) {
    const [year, month, date] = day.split("-").map(Number);
    return new Date(year, month - 1, date, 12).toISOString();
  }
  return now.toISOString();
}

export type ReceiptCompletion = { receiptId?: string; transactionId: string; month: string };
export function receiptHome(month: string): Href {
  return { pathname: "/", params: { receiptMonth: /^\d{4}-(0[1-9]|1[0-2])$/.test(month) ? month : "" } } as Href;
}
export function finishReceiptFlow(navigation: { dismissTo(href: Href): void; push(href: Href): void }, result: ReceiptCompletion) {
  navigation.dismissTo(receiptHome(result.month));
  navigation.push({ pathname: "/receipt-saved", params: result } as unknown as Href);
}
