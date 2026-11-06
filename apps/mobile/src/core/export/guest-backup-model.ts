import type { GuestFinance } from "@/core/local/guest-finance";
import { guestOwnerId } from "@/core/local/guest-finance";
import type { Keepsake } from "@/features/keepsakes/keepsake-store";
import { makeGuestReceipt, type GuestReceipt } from "@/core/receipts/guest-receipt-model";
import { backupAppearance } from "./backup-appearance";
import {validateReconciliationReceipts} from "../local/guest-reconciliation-receipts";

export interface GuestBackupPayload {
  finance: GuestFinance;
  keepsakes: Keepsake[];
  receipts: GuestReceipt[];
  media: Record<string, string>;
}

const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
const hasId = (value: unknown): value is { id: string } => object(value) && typeof value.id === "string" && value.id.length > 0;

// Preserve ISO values verbatim, but reject Date.parse's calendar normalization.
function validScheduleInstant(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T([0-2]\d):([0-5]\d):([0-5]\d)(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})?)?$/.exec(value);
  if (!match || (match[4] !== undefined && Number(match[4]) > 23)) return false;
  const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1] && Number.isFinite(Date.parse(value));
}

export function validateGuestBackupPayload(value: unknown): GuestBackupPayload {
  if (!object(value) || !object(value.finance) || !Array.isArray(value.keepsakes) || !Array.isArray(value.receipts) || !object(value.media)) throw new Error("Bản sao trên máy không hợp lệ.");
  const finance = value.finance;
  if (!object(finance.profile) || finance.profile.id !== guestOwnerId ||
      !Array.isArray(finance.accounts) || !Array.isArray(finance.categories) ||
      !Array.isArray(finance.transactions) || !Array.isArray(finance.budgets) ||
      !Array.isArray(finance.bills) || !Array.isArray(finance.subscriptions) ||
      !object(finance.splits) || !object(finance.planningPeriods) || !object(finance.planningCloses) ||
      typeof finance.planningMethod !== "string") throw new Error("Dữ liệu tài chính trong bản sao không hợp lệ.");
  backupAppearance(finance.profile);
  validateReconciliationReceipts(finance.reconciliationReceipts);
  const receiptIds = finance.receiptCreateIds;
  if (receiptIds !== undefined && (!Array.isArray(receiptIds) || receiptIds.length > 50_000 ||
      !receiptIds.every(id => typeof id === "string" && id.length > 0 && id.length <= 200) ||
      new Set(receiptIds).size !== receiptIds.length)) throw new Error("Lịch sử tạo hóa đơn trong bản sao không hợp lệ.");
  for (const key of ["accounts", "categories", "transactions", "budgets", "bills", "subscriptions"] as const) {
    if (!(finance[key] as unknown[]).every(hasId)) throw new Error("Danh sách tài chính trong bản sao không hợp lệ.");
    const ids = (finance[key] as { id: string }[]).map(item => item.id);
    if (new Set(ids).size !== ids.length) throw new Error("Danh sách tài chính trong bản sao có mã trùng lặp.");
  }
  const validMoney = (amount: unknown) => Number.isSafeInteger(amount) && (amount as number) >= 0 && (amount as number) <= 9_000_000_000_000;
  const validMonth = (month: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(month);
  if (!["simple", "envelope", "zero_based", "fifty_thirty_twenty", "event"].includes(String(finance.planningMethod))) throw new Error("Phương pháp ngân sách trong bản sao không hợp lệ.");
  for (const [key, limit] of Object.entries(finance.planningPeriods)) {
    const separator = key.indexOf(":");
    if (separator !== 7 || !validMonth(key.slice(0, separator)) || key.length === 8 || !validMoney(limit)) throw new Error("Hạn mức trong bản sao không hợp lệ.");
  }
  for (const [month, close] of Object.entries(finance.planningCloses)) {
    if (!validMonth(month) || !object(close) || close.month !== month ||
        !Number.isSafeInteger(close.income) || (close.income as number) < 0 || !Number.isSafeInteger(close.expense) ||
        typeof close.note !== "string" || close.note.length > 1000 || typeof close.rollover !== "boolean" ||
        typeof close.closedAt !== "string" || !Number.isFinite(Date.parse(close.closedAt))) throw new Error("Thông tin chốt tháng trong bản sao không hợp lệ.");
  }
  const accountIds = new Set((finance.accounts as { id: string }[]).map((item) => item.id));
  const currencies=new Map((finance.accounts as {id:string;currencyCode:string}[]).map(item=>[item.id,item.currencyCode]));
  for (const account of finance.accounts as Record<string, unknown>[]) {
    if (typeof account.name !== "string" || !Number.isSafeInteger(account.openingBalance) || Math.abs(account.openingBalance as number)>9e12 || typeof account.currencyCode!=="string" || !/^[A-Z]{3}$/.test(account.currencyCode)) throw new Error("Ví trong bản sao không hợp lệ.");
  }
  for (const transaction of finance.transactions as Record<string, unknown>[]) {
    if (typeof transaction.title !== "string" || !validMoney(transaction.amount) || transaction.amount === 0 ||
        typeof transaction.occurredAt !== "string" || Number.isNaN(Date.parse(transaction.occurredAt)) ||
        typeof transaction.accountId !== "string" || !accountIds.has(transaction.accountId) ||
        (transaction.destinationAccountId !== null && (typeof transaction.destinationAccountId !== "string" || !accountIds.has(transaction.destinationAccountId)))) throw new Error("Giao dịch trong bản sao không hợp lệ.");
    if(!["income","expense","refund","transfer"].includes(String(transaction.kind)) ||
      (transaction.kind==="transfer" && (transaction.destinationAccountId===transaction.accountId || !transaction.destinationAccountId || currencies.get(String(transaction.accountId))!==currencies.get(String(transaction.destinationAccountId)))) ||
      (transaction.kind!=="transfer"&&transaction.destinationAccountId!==null))throw new Error("Invalid transfer in backup");
  }
  const transactionsById = new Map((finance.transactions as Record<string, unknown>[]).map(item => [item.id, item]));
  const categoryIds = new Set((finance.categories as { id: string }[]).map(item => item.id));
  const validTitle = (title: unknown) => typeof title === "string" && title.trim().length > 0 && title.length <= 160;
  for (const bill of finance.bills as Record<string, unknown>[]) {
    if (!validTitle(bill.title) || !validMoney(bill.amount) || bill.amount === 0 || !validScheduleInstant(bill.dueAt) ||
        !["pending", "paid", "overdue", "cancelled"].includes(String(bill.status))) throw new Error("Hóa đơn trong bản sao không hợp lệ.");
  }
  for (const subscription of finance.subscriptions as Record<string, unknown>[]) {
    if (!validTitle(subscription.title) || !validMoney(subscription.amount) || subscription.amount === 0 || !validScheduleInstant(subscription.nextDueAt) ||
        !["weekly", "monthly", "quarterly", "yearly", "custom"].includes(String(subscription.cadence)) ||
        !Number.isInteger(subscription.cycleMonths) || (subscription.cycleMonths as number) < 1 || (subscription.cycleMonths as number) > 120 ||
        !Number.isInteger(subscription.alertDays) || (subscription.alertDays as number) < 0 || (subscription.alertDays as number) > 365 ||
        typeof subscription.active !== "boolean" || typeof subscription.note !== "string" || subscription.note.length > 2000 ||
        (subscription.walletId !== null && !accountIds.has(subscription.walletId as string)) ||
        (subscription.categoryId !== null && !categoryIds.has(subscription.categoryId as string))) throw new Error("Chi phí định kỳ trong bản sao không hợp lệ.");
  }
  for (const budget of finance.budgets as Record<string, unknown>[]) {
    if (typeof budget.name !== "string" || typeof budget.categoryId !== "string" || !categoryIds.has(budget.categoryId) ||
        !validMoney(budget.defaultLimit) || !Number.isInteger(budget.alertPercent) ||
        (budget.alertPercent as number) < 1 || (budget.alertPercent as number) > 100 || typeof budget.active !== "boolean" ||
        (budget.currencyCode !== undefined && (typeof budget.currencyCode !== "string" || !/^[A-Z]{3}$/.test(budget.currencyCode)))) throw new Error("Ngân sách trong bản sao không hợp lệ.");
  }
  const splitIds = new Set<string>();
  for (const [transactionId, parts] of Object.entries(finance.splits)) {
    const transaction = transactionsById.get(transactionId);
    if (!transaction || !Array.isArray(parts)) throw new Error("Phân bổ trong bản sao không thuộc giao dịch hợp lệ.");
    let total = 0n;
    for (const part of parts) {
      if (!object(part) || typeof part.id !== "string" || !part.id || part.transactionId !== transactionId ||
          typeof part.categoryId !== "string" || !categoryIds.has(part.categoryId) ||
          !validMoney(part.amount) || part.amount === 0 || splitIds.has(part.id)) throw new Error("Phân bổ danh mục trong bản sao không hợp lệ.");
      splitIds.add(part.id);
      if (!part.deletedAt) total += BigInt(part.amount as number);
    }
    if (total > BigInt(transaction.amount as number)) throw new Error("Tổng phân bổ vượt số tiền giao dịch trong bản sao.");
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
