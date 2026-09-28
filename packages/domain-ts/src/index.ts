export type JsonPrimitive = string | number | boolean | null;

export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

export type JsonObject = { [key: string]: JsonValue };

export interface FinancePayload {
  version: 1 | 2;
  name: string;
  onboarded: boolean;
  hideBalance: boolean;
  wallets: JsonObject[];
  entries: JsonObject[];
  budgets: JsonObject[];
  bills: JsonObject[];
  keepsakes: JsonObject[];
  subscriptions: JsonObject[];
  closedMonths: JsonObject[];
  customCategories: string[];
  preferences: JsonObject;
}

export interface FinanceSnapshotEnvelope {
  payload: FinancePayload | null;
  updatedAt: string | null;
  revision: number | null;
}

export interface SaveFinanceSnapshotRequest {
  payload: FinancePayload;
  expectedRevision: number;
}

export interface SaveFinanceSnapshotResult {
  revision: number;
}

export interface ApiHealth {
  status: "ok";
  service: string;
  version: string;
}

export const MAX_MONEY = 9_000_000_000_000;

export function formatVnd(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

export function isFinancePayload(value: unknown): value is FinancePayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<FinancePayload>;
  return (
    (payload.version === 1 || payload.version === 2) &&
    typeof payload.name === "string" &&
    typeof payload.onboarded === "boolean" &&
    typeof payload.hideBalance === "boolean" &&
    Array.isArray(payload.wallets) &&
    Array.isArray(payload.entries) &&
    Array.isArray(payload.budgets) &&
    Array.isArray(payload.bills) &&
    Array.isArray(payload.keepsakes) &&
    Array.isArray(payload.subscriptions) &&
    Array.isArray(payload.closedMonths) &&
    Array.isArray(payload.customCategories) &&
    !!payload.preferences &&
    typeof payload.preferences === "object" &&
    !Array.isArray(payload.preferences)
  );
}
