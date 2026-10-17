import type { GuestFinance } from "@/core/local/guest-finance";
import { guestOwnerId } from "@/core/local/guest-finance";
import type { Keepsake } from "@/features/keepsakes/keepsake-store";
import { makeGuestReceipt, type GuestReceipt } from "@/core/receipts/guest-receipt-model";

export interface GuestBackupPayload {
  finance: GuestFinance;
  keepsakes: Keepsake[];
  receipts: GuestReceipt[];
  media: Record<string, string>;
}

const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
const hasId = (value: unknown): value is { id: string } => object(value) && typeof value.id === "string" && value.id.length > 0;

export function validateGuestBackupPayload(value: unknown): GuestBackupPayload {
  if (!object(value) || !object(value.finance) || !Array.isArray(value.keepsakes) || !Array.isArray(value.receipts) || !object(value.media)) throw new Error("Bản sao trên máy không hợp lệ.");
  const finance = value.finance;
  if (!object(finance.profile) || finance.profile.id !== guestOwnerId ||
      !Array.isArray(finance.accounts) || !Array.isArray(finance.categories) ||
      !Array.isArray(finance.transactions) || !Array.isArray(finance.budgets) ||
      !Array.isArray(finance.bills) || !Array.isArray(finance.subscriptions) ||
      !object(finance.splits) || !object(finance.planningPeriods) || !object(finance.planningCloses) ||
      typeof finance.planningMethod !== "string") throw new Error("Dữ liệu tài chính trong bản sao không hợp lệ.");
  for (const key of ["accounts", "categories", "transactions", "budgets", "bills", "subscriptions"] as const) {
    if (!(finance[key] as unknown[]).every(hasId)) throw new Error("Danh sách tài chính trong bản sao không hợp lệ.");
  }
  const validMoney = (amount: unknown) => Number.isSafeInteger(amount) && (amount as number) >= 0 && (amount as number) <= 9_000_000_000_000;
  const accountIds = new Set((finance.accounts as { id: string }[]).map((item) => item.id));
  for (const account of finance.accounts as Record<string, unknown>[]) {
    if (typeof account.name !== "string" || !validMoney(account.openingBalance)) throw new Error("Ví trong bản sao không hợp lệ.");
  }
  for (const transaction of finance.transactions as Record<string, unknown>[]) {
    if (typeof transaction.title !== "string" || !validMoney(transaction.amount) || transaction.amount === 0 ||
        typeof transaction.occurredAt !== "string" || Number.isNaN(Date.parse(transaction.occurredAt)) ||
        typeof transaction.accountId !== "string" || !accountIds.has(transaction.accountId) ||
        (transaction.destinationAccountId !== null && (typeof transaction.destinationAccountId !== "string" || !accountIds.has(transaction.destinationAccountId)))) throw new Error("Giao dịch trong bản sao không hợp lệ.");
  }
  for (const item of value.keepsakes) {
    if (!object(item) || !hasId(item)) throw new Error("Kỷ vật trong bản sao không hợp lệ.");
    const record = item as Record<string, unknown>;
    const photoUri = record.photoUri;
    if (record.userId !== guestOwnerId || (photoUri !== null && (typeof photoUri !== "string" || !/^image:\d+$/.test(photoUri) || typeof value.media[photoUri] !== "string"))) throw new Error("Kỷ vật hoặc ảnh trong bản sao không hợp lệ.");
  }
  const transactionIds = new Set((finance.transactions as { id: string }[]).map((item) => item.id));
  for (const receipt of value.receipts) {
    if (!object(receipt) || !transactionIds.has(String(receipt.transactionId))) throw new Error("Ảnh hóa đơn không thuộc giao dịch trong bản sao.");
    makeGuestReceipt(receipt as unknown as GuestReceipt);
  }
  return value as unknown as GuestBackupPayload;
}
