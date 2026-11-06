export type PaymentFormError = "titleRequired" | "titleTooLong" | "invalidAmount" | "invalidDate";
type PaymentFields = { title: string; amount: string; dueDate: string };
type PaymentPayload = { title: string; amount: number; dueAt: string };

export function parsePaymentAmount(input: string): number | null {
  const amount = Number(input);
  return /^\d+$/.test(input) && Number.isSafeInteger(amount) && amount > 0 && amount <= 9_000_000_000_000 ? amount : null;
}

/** Form dates are local calendar days, not UTC dates. */
export function paymentDateInput(instant: string): string {
  const date = new Date(instant);
  if (!Number.isFinite(date.getTime())) return "";
  return `${String(date.getFullYear()).padStart(4, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function initialPaymentDueDate(now = new Date()): string {
  const next = new Date(now);
  next.setDate(next.getDate() + 7);
  return paymentDateInput(next.toISOString());
}

export function parsePaymentForm(input: PaymentFields): { value: PaymentPayload } | { error: PaymentFormError } {
  const title = input.title.trim();
  if (!title) return { error: "titleRequired" };
  if (title.length > 160) return { error: "titleTooLong" };
  const amount = parsePaymentAmount(input.amount);
  if (amount === null) return { error: "invalidAmount" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate)) return { error: "invalidDate" };
  const date = new Date(`${input.dueDate}T12:00:00`);
  // Date normalizes invalid days (e.g. 31 February); compare the calendar fields.
  if (!Number.isFinite(date.getTime()) || paymentDateInput(date.toISOString()) !== input.dueDate) return { error: "invalidDate" };
  return { value: { title, amount, dueAt: date.toISOString() } };
}
