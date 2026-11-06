export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export interface LegacyWallet {
  id: string;
  name: string;
  openingBalance: number;
  /** Absent in old backups; use their preference currency, then VND. */
  currencyCode?: string;
}

export interface LegacyEntryPart {
  category: string;
  amount: number;
  label: string;
}

export interface LegacyEntry {
  id: string;
  title: string;
  amount: number;
  type: "expense" | "income" | "transfer";
  walletId: string;
  category: string;
  date: string;
  destinationId: string | null;
  note: string;
  receiptPath: string | null;
  refundOf: string | null;
  parts: LegacyEntryPart[];
  reconciled: boolean;
  reconciledWalletIds: string[];
}

export interface LegacyBudget {
  id: string;
  category: string;
  limit: number;
  alertPercent: number;
  monthLimits: Record<string, number>;
}

export interface LegacyBill {
  id: string;
  title: string;
  amount: number;
  dueDate: string;
  paidEntryId: string | null;
}

export interface LegacyKeepsake {
  id: string;
  title: string;
  amount: number;
  date: string;
  note: string;
  photoPath: string | null;
  category: string;
  warrantyUntil: string | null;
  returnUntil: string | null;
}

export interface LegacySubscription {
  id: string;
  name: string;
  amount: number;
  nextDate: string;
  cycleMonths: number;
  active: boolean;
  note: string;
  alertDays: number;
}

export interface LegacyMonthClose {
  month: string;
  income: number;
  expense: number;
  note: string;
  closedAt: string;
}

/** Legacy compatibility contract retained only for controlled snapshot migration. */
export interface FinancePayload {
  version: 1 | 2;
  name: string;
  onboarded: boolean;
  hideBalance: boolean;
  wallets: LegacyWallet[];
  entries: LegacyEntry[];
  budgets: LegacyBudget[];
  bills: LegacyBill[];
  keepsakes: LegacyKeepsake[];
  subscriptions: LegacySubscription[];
  closedMonths: LegacyMonthClose[];
  customCategories: string[];
  preferences: JsonObject;
}

export interface FinanceSnapshotEnvelope {
  payload: FinancePayload | null;
  updatedAt: string | null;
  revision: number;
}

export interface FinanceExportEnvelope {
  format: "picket-export-v1";
  schemaVersion: 1;
  exportedAt: string;
  revision: number;
  data: FinancePayload;
}

export interface FinanceImportSummary {
  valid: true;
  wallets: number;
  entries: number;
  budgets: number;
  bills: number;
  keepsakes: number;
  subscriptions: number;
}

export interface RestoreFinanceRequest {
  expectedRevision: number;
  confirmation: "RESTORE";
  export: FinanceExportEnvelope;
}

export interface RestoreFinanceResult {
  restored: true;
  revision: number;
}

export interface Entitlements {
  tier: "free" | "plus" | "pro";
  ocrFallbackDailyLimit: number;
  ocrFallbackUsed: number;
  ocrFallbackRemaining: number;
}

export interface AdminOverview {
  totalUsers: number;
  totalLedgers: number;
  users: Array<{
    id: string;
    email: string;
    createdAt: string;
    bannedUntil: string | null;
    revision: number | null;
    entryCount: number;
  }>;
  audit: Array<{
    action: string;
    target: string | null;
    createdAt: string;
  }>;
  settings: {
    maintenance: boolean;
    notice: string;
  };
}

export type AdminUserActionRequest =
  | { action: "suspend"; confirmation: "SUSPEND" }
  | { action: "restore"; confirmation: "RESTORE" }
  | { action: "reset_password"; confirmation: "RESET" }
  | {
      action: "grant_plan";
      confirmation: "GRANT";
      tier: "free" | "plus" | "pro";
    };

export interface AdminUserActionResult {
  updated: true;
}

export interface SaveFinanceSnapshotRequest {
  payload: FinancePayload;
  expectedRevision: number;
}

export interface SaveFinanceSnapshotResult {
  revision: number;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isArrayOf<T>(
  value: unknown,
  predicate: (item: unknown) => item is T,
): value is T[] {
  return Array.isArray(value) && value.every(predicate);
}

function hasString(value: Record<string, unknown>, key: string): boolean {
  return typeof value[key] === "string";
}

function hasNumber(value: Record<string, unknown>, key: string): boolean {
  return typeof value[key] === "number" && Number.isSafeInteger(value[key]);
}

function isLegacyWallet(value: unknown): value is LegacyWallet {
  return (
    isObject(value) &&
    hasString(value, "id") &&
    hasString(value, "name") &&
    hasNumber(value, "openingBalance")
  );
}

function isLegacyEntry(value: unknown): value is LegacyEntry {
  if (!isObject(value)) return false;
  return (
    hasString(value, "id") &&
    hasString(value, "title") &&
    hasNumber(value, "amount") &&
    ["expense", "income", "transfer"].includes(String(value.type)) &&
    hasString(value, "walletId") &&
    hasString(value, "category") &&
    hasString(value, "date") &&
    Array.isArray(value.parts) &&
    Array.isArray(value.reconciledWalletIds)
  );
}

function isLegacyEntity(value: unknown): value is Record<string, JsonValue> {
  return isObject(value) && hasString(value, "id");
}

export function isFinancePayload(value: unknown): value is FinancePayload {
  if (!isObject(value)) return false;
  return (
    (value.version === 1 || value.version === 2) &&
    typeof value.name === "string" &&
    typeof value.onboarded === "boolean" &&
    typeof value.hideBalance === "boolean" &&
    isArrayOf(value.wallets, isLegacyWallet) &&
    isArrayOf(value.entries, isLegacyEntry) &&
    isArrayOf(value.budgets, isLegacyEntity) &&
    isArrayOf(value.bills, isLegacyEntity) &&
    isArrayOf(value.keepsakes, isLegacyEntity) &&
    isArrayOf(value.subscriptions, isLegacyEntity) &&
    Array.isArray(value.closedMonths) &&
    isArrayOf(value.customCategories, (item): item is string =>
      typeof item === "string"
    ) &&
    isObject(value.preferences)
  );
}
