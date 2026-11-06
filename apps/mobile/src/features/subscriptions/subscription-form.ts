import type { CreateSubscriptionRequest } from "@picket/domain";
import { parsePaymentForm, type PaymentFormError } from "../../core/forms/payment-form";

export const subscriptionFormCadences = ["weekly", "monthly", "quarterly", "yearly"] as const;
const months = { weekly: 1, monthly: 1, quarterly: 3, yearly: 12 } as const;
type FormFields = { title: string; amount: string; nextDueDate: string; cadence: string; alertDays: string; note: string; walletId: string; categoryId: string };
export type SubscriptionFormError = PaymentFormError | "invalidAlertDays" | "noteTooLong" | "invalidCadence";
export function parseSubscriptionForm(input: FormFields): { value: CreateSubscriptionRequest } | { error: SubscriptionFormError } {
  const payment = parsePaymentForm({ title: input.title, amount: input.amount, dueDate: input.nextDueDate });
  if ("error" in payment) return payment;
  const alertDays = Number(input.alertDays);
  if (!/^\d+$/.test(input.alertDays) || !Number.isSafeInteger(alertDays) || alertDays > 365) return { error: "invalidAlertDays" };
  const note = input.note.trim();
  if (note.length > 2000) return { error: "noteTooLong" };
  const cadence = subscriptionFormCadences.find(value => value === input.cadence);
  if (!cadence) return { error: "invalidCadence" };
  return { value: {
    title: payment.value.title, amount: payment.value.amount, nextDueAt: payment.value.dueAt,
    cadence, cycleMonths: months[cadence], alertDays, note,
    walletId: input.walletId || null, categoryId: input.categoryId || null,
  } };
}
