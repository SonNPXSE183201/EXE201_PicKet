import type { Bill, Budget, BudgetMethod, Category, CurrentProfile, FinanceSubscription, FinancialAccount, PlanningMonthClose, Transaction, TransactionSplit } from "@picket/domain";
import { MAX_MONEY } from "@picket/domain";
import {decodeReconciliationRequest} from "../../features/transactions/reconciliation-attempt";
import {validateReconciliationReceipts,type GuestReconciliationReceipt} from "./guest-reconciliation-receipts";
import { budgetOverview } from "./budget-overview";

export type GuestCollection = "accounts" | "categories" | "transactions" | "budgets" | "bills" | "subscriptions";

export interface GuestFinance {
  profile: CurrentProfile;
  accounts: FinancialAccount[];
  categories: Category[];
  transactions: Transaction[];
  splits: Record<string, TransactionSplit[]>;
  budgets: Budget[];
  bills: Bill[];
  subscriptions: FinanceSubscription[];
  planningMethod: BudgetMethod;
  planningPeriods: Record<string, number>;
  planningCloses: Record<string, PlanningMonthClose>;
  /** Durable receipt creation tombstones; absent in older device backups. */
  receiptCreateIds?: string[];
  /** Completed requests, including zero adjustments, survive retries and deletion. */
  reconciliationReceipts?: GuestReconciliationReceipt[];
}

export type GuestMutation =
  | { type: "profile.replace"; value: CurrentProfile }
  | { type: "account.upsert"; value: FinancialAccount }
  | { type: "account.archive"; id: string }
  | { type: "category.upsert"; value: Category }
  | { type: "category.archive"; id: string }
  | { type: "transaction.upsert"; value: Transaction }
  | { type: "transaction.createOnce"; value: Transaction }
  | { type: "transaction.archive"; id: string }
  | { type: "split.replace"; transactionId: string; values: TransactionSplit[] }
  | { type: "budget.upsert"; value: Budget }
  | { type: "budget.archive"; id: string }
  | { type: "bill.upsert"; value: Bill }
  | { type: "bill.archive"; id: string }
  | { type: "subscription.upsert"; value: FinanceSubscription }
  | { type: "subscription.archive"; id: string }
  | { type: "planning.method"; value: BudgetMethod }
  | { type: "planning.transfer"; month: string; sourceBudgetId: string; destinationBudgetId: string; amount: number }
  | { type: "planning.close"; value: PlanningMonthClose }
  | { type: "reconcile.apply"; id: string; accountId: string; statementDate: string; statementBalance: number; selectedTransactionIds: string[]; reason: string; occurredAt: string };

export const guestOwnerId = "device-guest";

export function defaultGuestCategories(): Category[] {
  const now = "2026-01-01T00:00:00.000Z";
  return [
    { id: "guest-cat-food", name: "Ăn uống", kind: "expense", color: "#8C6A7D", icon: "food", custom: false, version: 1, createdAt: now, updatedAt: now, deletedAt: null },
    { id: "guest-cat-groceries", name: "Đi chợ", kind: "expense", color: "#4F8A6B", icon: "groceries", custom: false, version: 1, createdAt: now, updatedAt: now, deletedAt: null },
    { id: "guest-cat-transport", name: "Di chuyển", kind: "expense", color: "#5577A8", icon: "transport", custom: false, version: 1, createdAt: now, updatedAt: now, deletedAt: null },
    { id: "guest-cat-bills", name: "Hóa đơn", kind: "expense", color: "#D46A6A", icon: "bills", custom: false, version: 1, createdAt: now, updatedAt: now, deletedAt: null },
    { id: "guest-cat-shopping", name: "Mua sắm", kind: "expense", color: "#C98A3D", icon: "shopping", custom: false, version: 1, createdAt: now, updatedAt: now, deletedAt: null },
    { id: "guest-cat-leisure", name: "Giải trí", kind: "expense", color: "#5577A8", icon: "leisure", custom: false, version: 1, createdAt: now, updatedAt: now, deletedAt: null },
    { id: "guest-cat-health", name: "Sức khỏe", kind: "expense", color: "#8C6A7D", icon: "health", custom: false, version: 1, createdAt: now, updatedAt: now, deletedAt: null },
    { id: "guest-cat-education", name: "Giáo dục", kind: "expense", color: "#4F8A6B", icon: "education", custom: false, version: 1, createdAt: now, updatedAt: now, deletedAt: null },
    { id: "guest-cat-salary", name: "Lương", kind: "income", color: "#4F8A6B", icon: "salary", custom: false, version: 1, createdAt: now, updatedAt: now, deletedAt: null },
    { id: "guest-cat-bonus", name: "Thưởng", kind: "income", color: "#5577A8", icon: "bonus", custom: false, version: 1, createdAt: now, updatedAt: now, deletedAt: null },
    { id: "guest-cat-invest", name: "Đầu tư", kind: "income", color: "#8C6A7D", icon: "investment", custom: false, version: 1, createdAt: now, updatedAt: now, deletedAt: null },
    { id: "guest-cat-gift", name: "Quà tặng", kind: "income", color: "#D46A6A", icon: "gift", custom: false, version: 1, createdAt: now, updatedAt: now, deletedAt: null },
    { id: "guest-cat-other-inc", name: "Thu nhập khác", kind: "income", color: "#C98A3D", icon: "bloom", custom: false, version: 1, createdAt: now, updatedAt: now, deletedAt: null },
  ];
}

export function emptyGuestFinance(): GuestFinance {
  return {
    profile: { id: guestOwnerId, displayName: "bạn", avatarUrl: null, onboardingCompleted: true, locale: "vi", timezone: "Asia/Ho_Chi_Minh", persona: "", goal: "", currencyCode: "VND", hideBalance: false },
    accounts: [], categories: defaultGuestCategories(), transactions: [], splits: {}, budgets: [], bills: [], subscriptions: [],
    planningMethod: "simple", planningPeriods: {}, planningCloses: {}, receiptCreateIds: [], reconciliationReceipts:[],
  };
}

function upsert<T extends { id: string }>(items: T[], value: T): T[] {
  const index = items.findIndex((item) => item.id === value.id);
  if (index < 0) return [...items, value];
  return items.map((item) => item.id === value.id ? value : item);
}

export function guestBudgetSpent(state: GuestFinance, budget: Budget, month: string) {
  return budgetOverview(budget, month, state.transactions, null, Object.values(state.splits).flat()).spent;
}

export function applyGuestMutation(state: GuestFinance, mutation: GuestMutation): GuestFinance {
  if (mutation.type === "profile.replace") return { ...state, profile: mutation.value };
  if (mutation.type === "transaction.createOnce") {
    const candidate = mutation.value;
    if (!Number.isSafeInteger(candidate.amount) || candidate.amount <= 0 || candidate.amount > MAX_MONEY) throw new Error("Số tiền hóa đơn không hợp lệ.");
    if (candidate.deletedAt || candidate.destinationAccountId || candidate.refundOfTransactionId || !["income", "expense"].includes(candidate.kind)) throw new Error("Giao dịch hóa đơn không hợp lệ.");
    const previous = state.transactions.find(item => item.id === candidate.id);
    if (previous) {
      const fields = ["title", "amount", "kind", "accountId", "categoryId", "occurredAt", "note", "destinationAccountId", "refundOfTransactionId"] as const;
      if (previous.deletedAt || candidate.deletedAt || fields.some(field => (previous[field] ?? null) !== (candidate[field] ?? null))) {
        throw new Error("Giao dịch của bản nháp đã thay đổi; không thể ghi đè khi thử lại.");
      }
      return state;
    }
    if (state.receiptCreateIds?.includes(candidate.id)) throw new Error("Giao dịch của hóa đơn đã bị xóa; không tạo lại khi thử lại bản nháp.");
    if (!state.accounts.some(item => item.id === candidate.accountId && !item.deletedAt && !item.archived)) throw new Error("Hãy tạo hoặc chọn ví đang hoạt động trước khi ghi giao dịch.");
    const created = applyGuestMutation(state, { type: "transaction.upsert", value: candidate });
    return { ...created, receiptCreateIds: [...(state.receiptCreateIds ?? []), candidate.id] };
  }
  if (mutation.type === "transaction.upsert") {
    if (!Number.isSafeInteger(mutation.value.amount) || mutation.value.amount <= 0 || mutation.value.amount > MAX_MONEY) throw new Error("Số tiền phải là số nguyên từ 1 đến 9.000.000.000.000 VND.");
    const previous = state.transactions.find((item) => item.id === mutation.value.id);
    if (state.planningCloses[mutation.value.occurredAt.slice(0, 7)] || (previous && state.planningCloses[previous.occurredAt.slice(0, 7)])) throw new Error("Không thể sửa giao dịch của tháng đã chốt.");
  }
  if (mutation.type === "transaction.archive" || mutation.type === "split.replace") {
    const previous = state.transactions.find((item) => item.id === (mutation.type === "transaction.archive" ? mutation.id : mutation.transactionId));
    if (previous && state.planningCloses[previous.occurredAt.slice(0, 7)]) throw new Error("Không thể sửa giao dịch của tháng đã chốt.");
  }
  if (mutation.type === "planning.method") return { ...state, planningMethod: mutation.value };
  if (mutation.type === "planning.transfer") {
    const { month, sourceBudgetId, destinationBudgetId, amount } = mutation;
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("Tháng không hợp lệ.");
    if (state.planningCloses[month]) throw new Error("Tháng đã chốt.");
    if (sourceBudgetId === destinationBudgetId || !Number.isSafeInteger(amount) || amount <= 0 || amount > MAX_MONEY) throw new Error("Số tiền điều chuyển không hợp lệ.");
    const source = state.budgets.find((item) => item.id === sourceBudgetId && item.active && !item.deletedAt);
    const destination = state.budgets.find((item) => item.id === destinationBudgetId && item.active && !item.deletedAt);
    if (!source || !destination) throw new Error("Không tìm thấy ngân sách.");
    const sourceKey = `${month}:${sourceBudgetId}`;
    const destinationKey = `${month}:${destinationBudgetId}`;
    const sourceLimit = state.planningPeriods[sourceKey] ?? source.defaultLimit;
    const destinationLimit = state.planningPeriods[destinationKey] ?? destination.defaultLimit;
    if (![sourceLimit, destinationLimit].every(limit => Number.isSafeInteger(limit) && limit >= 0 && limit <= MAX_MONEY) || amount > sourceLimit || amount > sourceLimit - guestBudgetSpent(state, source, month) || !Number.isSafeInteger(destinationLimit + amount) || destinationLimit + amount > MAX_MONEY) throw new Error("Hạn mức không đủ hoặc vượt giới hạn.");
    return { ...state, planningPeriods: { ...state.planningPeriods, [sourceKey]: sourceLimit - amount, [destinationKey]: destinationLimit + amount } };
  }
  if (mutation.type === "planning.close") {
    if (state.planningCloses[mutation.value.month]) throw new Error("Tháng đã chốt.");
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mutation.value.month)) throw new Error("Tháng không hợp lệ.");
    if (typeof mutation.value.note !== "string" || mutation.value.note.length > 1000 || typeof mutation.value.closedAt !== "string" || !Number.isFinite(Date.parse(mutation.value.closedAt)) || typeof mutation.value.rollover !== "boolean") throw new Error("Thông tin chốt tháng không hợp lệ.");
    const nextDate = new Date(`${mutation.value.month}-01T00:00:00Z`);
    nextDate.setUTCMonth(nextDate.getUTCMonth() + 1);
    const nextMonth = nextDate.toISOString().slice(0, 7);
    if (nextDate.getTime() > Date.now()) throw new Error("Chỉ chốt tháng đã qua.");
    if (mutation.value.rollover && state.planningCloses[nextMonth]) throw new Error("Không thể chuyển dư vì tháng sau đã chốt.");
    let income = 0n, expense = 0n;
    for (const row of state.transactions) {
      if (row.deletedAt || row.occurredAt.slice(0, 7) !== mutation.value.month || !["income", "expense", "refund"].includes(row.kind)) continue;
      if (!Number.isSafeInteger(row.amount) || row.amount <= 0 || row.amount > MAX_MONEY) throw new Error("Dữ liệu tiền tháng không hợp lệ.");
      if (row.kind === "income") income += BigInt(row.amount);
      else expense += row.kind === "expense" ? BigInt(row.amount) : -BigInt(row.amount);
    }
    const incomeTotal = Number(income), expenseTotal = Number(expense);
    if (!Number.isSafeInteger(incomeTotal) || !Number.isSafeInteger(expenseTotal)) throw new Error("Tổng tiền tháng vượt giới hạn tính toán chính xác.");
    const planningPeriods = { ...state.planningPeriods };
    if (mutation.value.rollover) for (const budget of state.budgets.filter((item) => item.active && !item.deletedAt)) {
      const currentKey = `${mutation.value.month}:${budget.id}`;
      const nextKey = `${nextMonth}:${budget.id}`;
      const limit = planningPeriods[currentKey] ?? budget.defaultLimit;
      const spent = guestBudgetSpent(state, budget, mutation.value.month);
      const carried = Math.max(0, limit - spent);
      const nextLimit = (planningPeriods[nextKey] ?? budget.defaultLimit) + carried;
      if (!Number.isSafeInteger(nextLimit) || nextLimit > MAX_MONEY) throw new Error("Hạn mức chuyển dư vượt giới hạn.");
      planningPeriods[nextKey] = nextLimit;
    }
    return { ...state, planningPeriods, planningCloses: { ...state.planningCloses, [mutation.value.month]: { ...mutation.value, income: incomeTotal, expense: expenseTotal } } };
  }
  if (mutation.type === "reconcile.apply") {
    const {accountId,statementDate,statementBalance,selectedTransactionIds,reason}=mutation;
    const payload=JSON.stringify({accountId,statementDate,statementBalance,selectedTransactionIds:[...selectedTransactionIds].sort(),reason});
    if(!mutation.id||mutation.id.length>200||reason.length>1000||selectedTransactionIds.length>10000||!decodeReconciliationRequest(payload)||!Number.isFinite(Date.parse(mutation.occurredAt)))throw new Error("Invalid reconciliation request");
    validateReconciliationReceipts(state.reconciliationReceipts);
    const receipts=state.reconciliationReceipts??[];
    const previous=receipts.find(row=>row.id===mutation.id);
    if(previous){if(previous.payload!==payload)throw new Error("Reconciliation request conflict");return state;}
    // An older adjustment alone cannot prove the original request's exact payload.
    if(state.transactions.some(item=>item.id===mutation.id))throw new Error("Legacy reconciliation requires review");
    if(receipts.length>=50_000)throw new Error("Reconciliation history capacity reached");
    if (state.planningCloses[mutation.statementDate.slice(0, 7)]) throw new Error("Không thể đối soát tháng đã chốt.");
    const account = state.accounts.find((item) => item.id === mutation.accountId && !item.archived && !item.deletedAt);
    if (!account || !Number.isSafeInteger(mutation.statementBalance) || Math.abs(mutation.statementBalance) > 9_000_000_000_000) throw new Error("Số dư sao kê không hợp lệ.");
    const selected = new Set(mutation.selectedTransactionIds);
    const end = new Date(`${mutation.statementDate}T23:59:59.999`).getTime();
    if (Number.isNaN(end)) throw new Error("Ngày sao kê không hợp lệ.");
    const eligible = state.transactions.filter((item) => !item.deletedAt && (item.accountId === account.id || item.destinationAccountId === account.id) && new Date(item.occurredAt).getTime() <= end);
    if (selected.size !== mutation.selectedTransactionIds.length || [...selected].some((id) => !eligible.some((item) => item.id === id))) throw new Error("Giao dịch đối soát không hợp lệ.");
    const effect = (item: Transaction) => item.accountId === account.id ? (item.kind === "income" || item.kind === "refund" ? item.amount : -item.amount) : item.kind === "transfer" && item.destinationAccountId === account.id ? item.amount : 0;
    const cleared = account.openingBalance + eligible.filter((item) => selected.has(item.id)).reduce((sum, item) => sum + effect(item), 0);
    const difference = mutation.statementBalance - cleared;
    if(!Number.isSafeInteger(cleared)||!Number.isSafeInteger(difference)||Math.abs(difference)>MAX_MONEY)throw new Error("Invalid reconciliation adjustment");
    if (difference && !mutation.reason.trim()) throw new Error("Cần lý do điều chỉnh.");
    const eligibleIds = new Set(eligible.map((item) => item.id));
    const transactions = state.transactions.map((item) => {
      if (!eligibleIds.has(item.id)) return item;
      const ids = new Set(item.reconciledAccountIds ?? []);
      if (selected.has(item.id)) ids.add(account.id); else ids.delete(account.id);
      return { ...item, reconciledAccountIds: [...ids], version: item.version + 1, updatedAt: mutation.occurredAt };
    });
    if (difference) transactions.push({ id: mutation.id, title: "Điều chỉnh đối soát", amount: Math.abs(difference), kind: difference > 0 ? "income" : "expense", accountId: account.id, destinationAccountId: null, categoryId: null, occurredAt: mutation.occurredAt, note: mutation.reason.trim(), refundOfTransactionId: null, reconciledAccountIds: [account.id], version: 1, createdAt: mutation.occurredAt, updatedAt: mutation.occurredAt, deletedAt: null });
    return { ...state, transactions,reconciliationReceipts:[...receipts,{id:mutation.id,payload,difference}] };
  }
  if (mutation.type === "split.replace") return {
    ...state,
    splits: { ...state.splits, [mutation.transactionId]: mutation.values },
    transactions: state.transactions.map((item) => item.id === mutation.transactionId
      ? { ...item, version: item.version + 1, updatedAt: new Date().toISOString() }
      : item),
  };
  const [resource, action] = mutation.type.split(".");
  const keys: Record<string, GuestCollection> = { account: "accounts", category: "categories", transaction: "transactions", budget: "budgets", bill: "bills", subscription: "subscriptions" };
  const key = keys[resource];
  if (!key) throw new Error("Unsupported guest resource.");
  if (action === "archive") {
    const id = (mutation as { id: string }).id;
    return { ...state, [key]: (state[key] as { id: string }[]).filter((item) => item.id !== id) };
  }
  const value = (mutation as { value: { id: string } }).value;
  return { ...state, [key]: upsert(state[key] as { id: string }[], value) };
}
