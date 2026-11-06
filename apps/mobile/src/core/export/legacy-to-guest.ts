import type { FinancePayload, FinancialAccount, Category, Transaction, Budget, Bill, FinanceSubscription, TransactionSplit } from "@picket/domain";
import { toByteArray } from "base64-js";

import { emptyGuestFinance, guestOwnerId } from "@/core/local/guest-finance";
import { makeGuestReceipt } from "@/core/receipts/guest-receipt-model";
import { validateGuestBackupPayload, type GuestBackupPayload } from "./guest-backup-model";
import { backupAppearance } from "./backup-appearance";

function imageMime(encoded: string) {
  const bytes = toByteArray(encoded);
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "image/webp";
  throw new Error("Ảnh trong backup Flutter không được hỗ trợ.");
}

function month(value: string) {
  const match = /^(\d{4})-(\d{1,2})$/.exec(value);
  if (!match || Number(match[2]) < 1 || Number(match[2]) > 12) throw new Error("Tháng trong backup Flutter không hợp lệ.");
  return `${match[1]}-${match[2].padStart(2, "0")}`;
}

/** Lossless for Flutter finance fields represented by the Expo guest model; no cloud writes. */
export function convertLegacyBackupToGuest(backup: { data: FinancePayload; media: Record<string, string> }): GuestBackupPayload {
  const data = backup.data;
  if (!data || ![1, 2].includes(data.version) || !Array.isArray(data.wallets) || !Array.isArray(data.entries) ||
      !Array.isArray(data.budgets) || !Array.isArray(data.bills) || !Array.isArray(data.keepsakes) ||
      !Array.isArray(data.subscriptions) || !Array.isArray(data.closedMonths) || !Array.isArray(data.customCategories)) throw new Error("Dữ liệu backup Flutter không hợp lệ.");
  const now = new Date().toISOString();
  const appearance=backupAppearance(data.preferences);
  const preferredCurrency=data.preferences.currency??"VND";
  if(typeof preferredCurrency!=="string"||!/^[A-Z]{3}$/.test(preferredCurrency))throw new Error("Invalid backup currency");
  const version = { version:1, createdAt:now, updatedAt:now, deletedAt:null } as const;
  const names = new Set<string>([...data.customCategories, ...data.entries.map((item) => item.category), ...data.entries.flatMap((item) => item.parts.map((part) => part.category)), ...data.budgets.map((item) => item.category)]);
  const categories: Category[] = [...names].filter(Boolean).map((name) => ({ ...version, id:`legacy-category:${encodeURIComponent(name)}`, name, kind:"both", color:null, icon:null, custom:true }));
  const categoryId = (name: string) => categories.find((item) => item.name === name)?.id ?? null;
  const accounts: FinancialAccount[] = data.wallets.map((item) => ({ ...version, id:item.id, name:item.name, kind:"cash", currencyCode:item.currencyCode===undefined?preferredCurrency:item.currencyCode, openingBalance:item.openingBalance, archived:false }));
  const accountIds = new Set(accounts.map((item) => item.id));
  if (data.entries.some((item) => !accountIds.has(item.walletId) || (item.destinationId && !accountIds.has(item.destinationId)))) throw new Error("Giao dịch trỏ tới ví không có trong backup Flutter.");
  const transactions: Transaction[] = data.entries.map((item) => ({ ...version, id:item.id, title:item.title, amount:item.amount,
    kind:item.refundOf ? "refund" : item.type, accountId:item.walletId, destinationAccountId:item.destinationId,
    categoryId:categoryId(item.category), occurredAt:item.date, note:item.note, refundOfTransactionId:item.refundOf,
    reconciledAccountIds:item.reconciledWalletIds.length ? item.reconciledWalletIds : item.reconciled ? [item.walletId, ...(item.destinationId ? [item.destinationId] : [])] : [],
  }));
  const splits: Record<string, TransactionSplit[]> = {};
  for (const entry of data.entries) if (entry.parts.length) splits[entry.id] = entry.parts.map((part, index) => ({ ...version, id:`legacy-split:${entry.id}:${index}`, transactionId:entry.id, categoryId:categoryId(part.category) ?? `legacy-category:${encodeURIComponent(part.category)}`, amount:part.amount }));
  const budgets: Budget[] = data.budgets.map((item) => ({ ...version, id:item.id, categoryId:categoryId(item.category)!, name:item.category, currencyCode:"VND", defaultLimit:item.limit, alertPercent:item.alertPercent, active:true }));
  const planningPeriods: Record<string, number> = {};
  for (const budget of data.budgets) for (const [period, limit] of Object.entries(budget.monthLimits)) planningPeriods[`${month(period)}:${budget.id}`] = limit;
  const bills: Bill[] = data.bills.map((item) => ({ ...version, id:item.id, title:item.title, amount:item.amount, dueAt:item.dueDate, paidTransactionId:item.paidEntryId, status:item.paidEntryId ? "paid" : "pending" }));
  const subscriptions: FinanceSubscription[] = data.subscriptions.map((item) => ({ ...version, id:item.id, walletId:null, categoryId:null, title:item.name, amount:item.amount, cadence:item.cycleMonths === 1 ? "monthly" : "custom", nextDueAt:item.nextDate, cycleMonths:item.cycleMonths, active:item.active, note:item.note, alertDays:item.alertDays }));
  const finance = { ...emptyGuestFinance(), profile:{ ...emptyGuestFinance().profile, ...appearance, currencyCode:preferredCurrency, displayName:data.name || "bạn", onboardingCompleted:data.onboarded, hideBalance:data.hideBalance },
    accounts, categories, transactions, splits, budgets, bills, subscriptions, planningPeriods,
    planningCloses:Object.fromEntries(data.closedMonths.map((item) => [month(item.month), { month:month(item.month), closedAt:item.closedAt, income:item.income, expense:item.expense, note:item.note, rollover:false }])),
  };
  const media = { ...backup.media };
  const keepsakes = data.keepsakes.map((item) => ({ id:item.id, userId:guestOwnerId, title:item.title, amount:item.amount, date:item.date, note:item.note, photoUri:item.photoPath, category:item.category, warrantyUntil:item.warrantyUntil, returnUntil:item.returnUntil }));
  const receipts = data.entries.filter((item) => item.receiptPath).map((item) => {
    const encoded = media[item.receiptPath!];
    if (typeof encoded !== "string") throw new Error("Thiếu ảnh hóa đơn trong backup Flutter.");
    return makeGuestReceipt({ transactionId:item.id, imageBase64:encoded, contentType:imageMime(encoded), merchant:item.title, amount:item.amount, purchasedAt:item.date, rawText:null, lineItems:[] });
  });
  return validateGuestBackupPayload({ finance, keepsakes, receipts, media });
}
