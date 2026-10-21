"use server";

import {
  MAX_MONEY,
  type AccountKind,
  type BillStatus,
  type Category,
  type ReceiptLineItemInput,
  type SubscriptionCadence,
  type TransactionKind,
} from "@picket/domain";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireApiSession } from "@/core/auth/require-api-session";

const accountKinds = new Set<AccountKind>(["cash", "bank", "ewallet", "other"]);
const categoryKinds = new Set<Category["kind"]>(["expense", "income", "both"]);
const transactionKinds = new Set<TransactionKind>(["expense", "income"]);
const billStatuses = new Set<BillStatus>([
  "pending",
  "paid",
  "overdue",
  "cancelled",
]);
const subscriptionCadences = new Set<SubscriptionCadence>([
  "weekly",
  "monthly",
  "quarterly",
  "yearly",
  "custom",
]);

function text(data: FormData, key: string, max: number) {
  const value = String(data.get(key) ?? "").trim();
  if (!value || value.length > max) throw new Error(`Invalid ${key}`);
  return value;
}

function optionalText(data: FormData, key: string, max: number) {
  const value = String(data.get(key) ?? "").trim();
  if (value.length > max) throw new Error(`Invalid ${key}`);
  return value;
}

function integer(
  data: FormData,
  key: string,
  options: { min?: number; max?: number } = {},
) {
  const raw = String(data.get(key) ?? "");
  if (!/^-?\d+$/.test(raw)) throw new Error(`Invalid ${key}`);
  const value = Number(raw);
  if (
    !Number.isSafeInteger(value) ||
    value < (options.min ?? -9_000_000_000_000) ||
    value > (options.max ?? 9_000_000_000_000)
  ) {
    throw new Error(`Invalid ${key}`);
  }
  return value;
}

function id(data: FormData, key: string) {
  const value = String(data.get(key) ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(value)) throw new Error(`Invalid ${key}`);
  return value;
}

function currency(data: FormData) {
  const value = text(data, "currencyCode", 3).toUpperCase();
  if (!/^[A-Z]{3}$/.test(value)) throw new Error("Invalid currency");
  return value;
}

function occurredAt(data: FormData) {
  const date = text(data, "occurredAt", 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Invalid date");
  return `${date}T12:00:00.000Z`;
}

function dateTimeAt(data: FormData, key: string) {
  const date = text(data, key, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`Invalid ${key}`);
  return `${date}T12:00:00.000Z`;
}

async function commit(
  path: string,
  operation: () => Promise<unknown>,
  successPath = path,
) {
  try {
    await operation();
  } catch {
    redirect(`${path}?error=save_failed`);
  }
  revalidatePath(path);
  revalidatePath("/dashboard");
  redirect(successPath);
}

export async function createAccount(data: FormData) {
  const name = text(data, "name", 80);
  const kind = text(data, "kind", 20) as AccountKind;
  if (!accountKinds.has(kind)) throw new Error("Invalid account kind");
  const currencyCode = currency(data);
  const openingBalance = integer(data, "openingBalance");
  await commit("/accounts", async () => {
    const { accessToken, api, claims } = await requireApiSession();
    await api.createAccount(
      accessToken,
      { name, kind, currencyCode, openingBalance },
      `${claims.sub}:${crypto.randomUUID()}`,
    );
  });
}

export async function updateAccount(data: FormData) {
  const accountId = id(data, "id");
  const expectedVersion = integer(data, "version", { min: 1 });
  const name = text(data, "name", 80);
  const kind = text(data, "kind", 20) as AccountKind;
  if (!accountKinds.has(kind)) throw new Error("Invalid account kind");
  const currencyCode = currency(data);
  await commit("/accounts", async () => {
    const { accessToken, api } = await requireApiSession();
    await api.updateAccount(accessToken, accountId, {
      expectedVersion,
      name,
      kind,
      currencyCode,
    });
  });
}

export async function archiveAccount(data: FormData) {
  const accountId = id(data, "id");
  const expectedVersion = integer(data, "version", { min: 1 });
  await commit("/accounts", async () => {
    const { accessToken, api } = await requireApiSession();
    await api.archiveAccount(accessToken, accountId, expectedVersion);
  });
}

export async function createCategory(data: FormData) {
  const name = text(data, "name", 80);
  const kind = text(data, "kind", 20) as Category["kind"];
  if (!categoryKinds.has(kind)) throw new Error("Invalid category kind");
  const color = optionalText(data, "color", 16) || null;
  await commit("/categories", async () => {
    const { accessToken, api, claims } = await requireApiSession();
    await api.createCategory(
      accessToken,
      { name, kind, color },
      `${claims.sub}:${crypto.randomUUID()}`,
    );
  });
}

export async function updateCategory(data: FormData) {
  const categoryId = id(data, "id");
  const expectedVersion = integer(data, "version", { min: 1 });
  const name = text(data, "name", 80);
  const kind = text(data, "kind", 20) as Category["kind"];
  if (!categoryKinds.has(kind)) throw new Error("Invalid category kind");
  const color = optionalText(data, "color", 16) || null;
  await commit("/categories", async () => {
    const { accessToken, api } = await requireApiSession();
    await api.updateCategory(accessToken, categoryId, {
      expectedVersion,
      name,
      kind,
      color,
    });
  });
}

export async function archiveCategory(data: FormData) {
  const categoryId = id(data, "id");
  const expectedVersion = integer(data, "version", { min: 1 });
  await commit("/categories", async () => {
    const { accessToken, api } = await requireApiSession();
    await api.archiveCategory(accessToken, categoryId, expectedVersion);
  });
}

function transactionInput(data: FormData) {
  const kind = text(data, "kind", 20) as TransactionKind;
  if (!transactionKinds.has(kind)) throw new Error("Invalid transaction kind");
  const categoryValue = String(data.get("categoryId") ?? "").trim();
  return {
    title: text(data, "title", 160),
    amount: integer(data, "amount", { min: 1 }),
    kind: kind as "expense" | "income",
    accountId: id(data, "accountId"),
    categoryId: categoryValue ? id(data, "categoryId") : null,
    occurredAt: occurredAt(data),
    note: optionalText(data, "note", 1000),
  };
}

export async function createTransfer(data: FormData) {
  const sourceAccountId = id(data, "sourceAccountId");
  const destinationAccountId = id(data, "destinationAccountId");
  if (sourceAccountId === destinationAccountId)
    throw new Error("Accounts must differ");
  const request = {
    sourceAccountId,
    destinationAccountId,
    title: text(data, "title", 160),
    amount: integer(data, "amount", { min: 1 }),
    occurredAt: occurredAt(data),
    note: optionalText(data, "note", 1000),
  };
  await commit(
    "/transactions/transfer",
    async () => {
      const { accessToken, api, claims } = await requireApiSession();
      await api.createTransfer(
        accessToken,
        request,
        `${claims.sub}:${crypto.randomUUID()}`,
      );
    },
    "/transactions",
  );
}

export async function createRefund(data: FormData) {
  const transactionId = id(data, "transactionId");
  const request = {
    amount: integer(data, "amount", { min: 1 }),
    occurredAt: occurredAt(data),
    note: optionalText(data, "note", 1000),
  };
  const path = `/transactions/${transactionId}/refund`;
  await commit(
    path,
    async () => {
      const { accessToken, api, claims } = await requireApiSession();
      await api.createRefund(
        accessToken,
        transactionId,
        request,
        `${claims.sub}:${crypto.randomUUID()}`,
      );
    },
    "/transactions",
  );
}

export async function setTransactionSplits(data: FormData) {
  const transactionId = id(data, "transactionId");
  const expectedVersion = integer(data, "version", { min: 1 });
  const transactionAmount = integer(data, "transactionAmount", { min: 1 });
  const splits = [...data.entries()]
    .filter(
      ([key, value]) => key.startsWith("split:") && String(value).trim() !== "",
    )
    .map(([key, value]) => {
      const categoryId = key.slice("split:".length);
      const splitData = new FormData();
      splitData.set("categoryId", categoryId);
      splitData.set("amount", String(value));
      return {
        categoryId: id(splitData, "categoryId"),
        amount: integer(splitData, "amount", { min: 1 }),
      };
    });
  if (
    splits.length > 20 ||
    new Set(splits.map((item) => item.categoryId)).size !== splits.length
  ) {
    throw new Error("Invalid splits");
  }
  const total = splits.reduce((sum, item) => sum + item.amount, 0);
  if (splits.length > 0 && total !== transactionAmount)
    throw new Error("Invalid split total");
  const path = `/transactions/${transactionId}/splits`;
  await commit(
    path,
    async () => {
      const { accessToken, api } = await requireApiSession();
      await api.setTransactionSplits(accessToken, transactionId, {
        expectedVersion,
        splits,
      });
    },
    "/transactions",
  );
}

export async function createTransaction(data: FormData) {
  const request = transactionInput(data);
  await commit("/transactions", async () => {
    const { accessToken, api, claims } = await requireApiSession();
    await api.createTransaction(
      accessToken,
      request,
      `${claims.sub}:${crypto.randomUUID()}`,
    );
  });
}

export async function updateTransaction(data: FormData) {
  const transactionId = id(data, "id");
  const expectedVersion = integer(data, "version", { min: 1 });
  const request = transactionInput(data);
  await commit("/transactions", async () => {
    const { accessToken, api } = await requireApiSession();
    await api.updateTransaction(accessToken, transactionId, {
      expectedVersion,
      accountId: request.accountId,
      categoryId: request.categoryId,
      title: request.title,
      amount: request.amount,
      occurredAt: request.occurredAt,
      note: request.note,
    });
  });
}

export async function archiveTransaction(data: FormData) {
  const transactionId = id(data, "id");
  const expectedVersion = integer(data, "version", { min: 1 });
  await commit("/transactions", async () => {
    const { accessToken, api } = await requireApiSession();
    await api.archiveTransaction(accessToken, transactionId, expectedVersion);
  });
}

function optionalMoney(data: FormData, key: string) {
  const raw = String(data.get(key) ?? "").trim();
  if (!raw) return null;
  const value = Number(raw);
  if (
    !/^\d+$/.test(raw) ||
    !Number.isSafeInteger(value) ||
    value <= 0 ||
    value > MAX_MONEY
  ) {
    throw new Error(`Invalid ${key}`);
  }
  return value;
}

function optionalDate(data: FormData, key: string) {
  const raw = String(data.get(key) ?? "").trim();
  if (!raw) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) throw new Error(`Invalid ${key}`);
  const date = new Date(`${raw}T00:00:00.000Z`);
  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== raw
  ) {
    throw new Error(`Invalid ${key}`);
  }
  return date.toISOString();
}

function receiptLineItems(data: FormData): ReceiptLineItemInput[] {
  const indexes = [...data.keys()]
    .map((key) => /^lineName:(\d+)$/.exec(key)?.[1])
    .filter((value): value is string => value !== undefined)
    .map(Number)
    .sort((left, right) => left - right);
  if (indexes.length > 100 || new Set(indexes).size !== indexes.length) {
    throw new Error("Invalid receipt lines");
  }
  const result: ReceiptLineItemInput[] = [];
  for (const index of indexes) {
    if (data.get(`lineDelete:${index}`) === "on") continue;
    const name = String(data.get(`lineName:${index}`) ?? "").trim();
    const quantityRaw = String(data.get(`lineQuantity:${index}`) ?? "").trim();
    const unitPriceRaw = String(
      data.get(`lineUnitPrice:${index}`) ?? "",
    ).trim();
    const totalRaw = String(data.get(`lineTotal:${index}`) ?? "").trim();
    // Empty editor rows intentionally default quantity to 1 for convenience.
    // Treat them as placeholders until the user enters a name or an amount.
    if (!name && !unitPriceRaw && !totalRaw) continue;
    const quantity = Number(quantityRaw);
    const total = Number(totalRaw);
    const unitPrice = unitPriceRaw ? Number(unitPriceRaw) : null;
    if (
      !name ||
      name.length > 200 ||
      !Number.isFinite(quantity) ||
      quantity <= 0 ||
      quantity > 1_000_000 ||
      !/^\d+$/.test(totalRaw) ||
      !Number.isSafeInteger(total) ||
      total <= 0 ||
      total > MAX_MONEY ||
      (unitPrice !== null &&
        (!/^\d+$/.test(unitPriceRaw) ||
          !Number.isSafeInteger(unitPrice) ||
          unitPrice < 0 ||
          unitPrice > MAX_MONEY ||
          Math.abs(Math.round(quantity * unitPrice) - total) > 1))
    ) {
      throw new Error("Invalid receipt line");
    }
    result.push({ name, quantity, unitPrice, total, confidence: null });
  }
  return result;
}

export async function updateReceipt(data: FormData) {
  const receiptId = id(data, "receiptId");
  const expectedVersion = integer(data, "version", { min: 1 });
  const merchant = optionalText(data, "merchant", 160) || null;
  const detectedTotal = optionalMoney(data, "detectedTotal");
  const purchasedAt = optionalDate(data, "purchasedAt");
  const lineItems = receiptLineItems(data);
  const path = `/receipts/${receiptId}`;
  try {
    const { accessToken, api } = await requireApiSession();
    await api.updateReceipt(accessToken, receiptId, {
      expectedVersion,
      merchant,
      detectedTotal,
      purchasedAt,
      reviewRequired: false,
      lineItems,
    });
  } catch {
    redirect(`${path}?error=save_failed`);
  }
  revalidatePath("/receipts");
  revalidatePath(path);
  redirect(`${path}?updated=1`);
}

export async function checkReceiptDuplicate(data: FormData) {
  const merchant = text(data, "merchant", 160);
  const purchasedAt = optionalDate(data, "purchasedAt");
  const total = optionalMoney(data, "total");
  if (purchasedAt === null || total === null) {
    throw new Error("Invalid duplicate receipt fields");
  }

  let destination = "/receipts?duplicate=none";
  try {
    const { accessToken, api } = await requireApiSession();
    const { duplicates } = await api.findDuplicateReceipts(accessToken, {
      merchant,
      purchasedAt,
      total,
    });
    const match = duplicates[0];
    if (match) {
      destination = `/receipts/${match.id}?duplicate=${match.matchType}`;
    }
  } catch {
    destination = "/receipts?duplicate=check_failed";
  }
  redirect(destination);
}

export async function createBudget(data: FormData) {
  const categoryId = id(data, "categoryId");
  const name = text(data, "name", 120);
  const defaultLimit = integer(data, "defaultLimit", { min: 1 });
  const alertPercent = integer(data, "alertPercent", { min: 1, max: 100 });
  await commit("/budgets", async () => {
    const { accessToken, api, claims } = await requireApiSession();
    await api.createBudget(
      accessToken,
      { categoryId, name, defaultLimit, alertPercent },
      `${claims.sub}:${crypto.randomUUID()}`,
    );
  });
}

export async function updateBudget(data: FormData) {
  const budgetId = id(data, "id");
  const expectedVersion = integer(data, "version", { min: 1 });
  const name = text(data, "name", 120);
  const defaultLimit = integer(data, "defaultLimit", { min: 1 });
  const alertPercent = integer(data, "alertPercent", { min: 1, max: 100 });
  const active = data.get("active") === "on";
  await commit("/budgets", async () => {
    const { accessToken, api } = await requireApiSession();
    await api.updateBudget(accessToken, budgetId, {
      expectedVersion,
      name,
      defaultLimit,
      alertPercent,
      active,
    });
  });
}

export async function archiveBudget(data: FormData) {
  const budgetId = id(data, "id");
  const expectedVersion = integer(data, "version", { min: 1 });
  await commit("/budgets", async () => {
    const { accessToken, api } = await requireApiSession();
    await api.archiveBudget(accessToken, budgetId, expectedVersion);
  });
}

export async function updateProfile(data: FormData) {
  const displayName = text(data, "displayName", 120);
  const locale = text(data, "locale", 16);
  const timezone = text(data, "timezone", 80);
  if (!/^[a-z]{2}(?:-[A-Z]{2})?$/.test(locale))
    throw new Error("Invalid locale");
  await commit("/profile", async () => {
    const { accessToken, api } = await requireApiSession();
    await api.updateProfile(accessToken, {
      display_name: displayName,
      locale,
      timezone,
    });
  });
}

export async function updatePreferences(data: FormData) {
  const persona = text(data, "persona", 80);
  const goal = text(data, "goal", 120);
  const currencyCode = currency(data);
  const hideBalance = data.get("hideBalance") === "on";
  await commit("/profile", async () => {
    const { accessToken, api } = await requireApiSession();
    await api.updatePreferences(accessToken, {
      persona,
      goal,
      currency_code: currencyCode,
      hide_balance: hideBalance,
    });
  });
}

export async function createBill(data: FormData) {
  const request = {
    title: text(data, "title", 160),
    amount: integer(data, "amount", { min: 1, max: MAX_MONEY }),
    dueAt: dateTimeAt(data, "dueAt"),
  };
  await commit("/bills", async () => {
    const { accessToken, api, claims } = await requireApiSession();
    await api.createBill(
      accessToken,
      request,
      `${claims.sub}:${crypto.randomUUID()}`,
    );
  });
}

export async function updateBill(data: FormData) {
  const billId = id(data, "id");
  const status = text(data, "status", 20) as BillStatus;
  if (!billStatuses.has(status)) throw new Error("Invalid bill status");
  await commit("/bills", async () => {
    const { accessToken, api } = await requireApiSession();
    await api.updateBill(accessToken, billId, {
      expectedVersion: integer(data, "version", { min: 1 }),
      title: text(data, "title", 160),
      amount: integer(data, "amount", { min: 1, max: MAX_MONEY }),
      dueAt: dateTimeAt(data, "dueAt"),
      status,
    });
  });
}

export async function archiveBill(data: FormData) {
  const billId = id(data, "id");
  await commit("/bills", async () => {
    const { accessToken, api } = await requireApiSession();
    await api.archiveBill(
      accessToken,
      billId,
      integer(data, "version", { min: 1 }),
    );
  });
}

function subscriptionInput(data: FormData) {
  const cadence = text(data, "cadence", 20) as SubscriptionCadence;
  if (!subscriptionCadences.has(cadence)) throw new Error("Invalid cadence");
  const walletId = String(data.get("walletId") ?? "").trim();
  const categoryId = String(data.get("categoryId") ?? "").trim();
  return {
    walletId: walletId ? id(data, "walletId") : null,
    categoryId: categoryId ? id(data, "categoryId") : null,
    title: text(data, "title", 160),
    amount: integer(data, "amount", { min: 1, max: MAX_MONEY }),
    cadence,
    nextDueAt: dateTimeAt(data, "nextDueAt"),
    cycleMonths: integer(data, "cycleMonths", { min: 1, max: 120 }),
    note: optionalText(data, "note", 2000),
    alertDays: integer(data, "alertDays", { min: 0, max: 365 }),
  };
}

export async function createSubscription(data: FormData) {
  const request = subscriptionInput(data);
  await commit("/subscriptions", async () => {
    const { accessToken, api, claims } = await requireApiSession();
    await api.createSubscription(
      accessToken,
      request,
      `${claims.sub}:${crypto.randomUUID()}`,
    );
  });
}

export async function updateSubscription(data: FormData) {
  const subscriptionId = id(data, "id");
  const request = subscriptionInput(data);
  await commit("/subscriptions", async () => {
    const { accessToken, api } = await requireApiSession();
    await api.updateSubscription(accessToken, subscriptionId, {
      expectedVersion: integer(data, "version", { min: 1 }),
      ...request,
      active: data.get("active") === "on",
    });
  });
}

export async function archiveSubscription(data: FormData) {
  const subscriptionId = id(data, "id");
  await commit("/subscriptions", async () => {
    const { accessToken, api } = await requireApiSession();
    await api.archiveSubscription(
      accessToken,
      subscriptionId,
      integer(data, "version", { min: 1 }),
    );
  });
}
