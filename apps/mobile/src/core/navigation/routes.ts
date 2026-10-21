import type { Href } from "expo-router";

export const routes = {
  home: "/" as Href,
  login: "/(auth)/login" as Href,
  register: "/(auth)/register" as Href,
  verifyEmail: (email: string) =>
    ({ pathname: "/(auth)/verify-email", params: { email } }) as unknown as Href,
  forgotPassword: "/(auth)/forgot-password" as Href,
  authCallback: "/auth/callback" as Href,
  resetPassword: "/auth/reset-password" as Href,
  onboarding: "/onboarding" as Href,
  profile: "/profile" as Href,
  admin: "/admin" as Href,
  insights: "/insights" as Href,
  keepsakes: "/keepsakes" as Href,
  notifications: "/notifications" as Href,
  reviewInbox: "/review-inbox" as Href,
  billing: "/billing" as Href,
  restore: "/restore" as Href,
  deleteAccount: "/delete-account" as Href,
  syncConflicts: "/sync-conflicts" as Href,
  capture: "/capture" as Href,
  captureOnDate: (date: string) => ({ pathname: "/capture", params: { date } }) as Href,
  newAccount: "/accounts/new" as Href,
  accounts: "/accounts" as Href,
  budgets: "/budgets" as Href,
  planning: "/planning" as Href,
  reconcile: "/reconcile" as Href,
  bills: "/bills" as Href,
  newBill: "/bills/new" as Href,
  bill: (id: string) =>
    ({ pathname: "/bills/[id]", params: { id } }) as unknown as Href,
  subscriptions: "/subscriptions" as Href,
  newSubscription: "/subscriptions/new" as Href,
  subscription: (id: string) =>
    ({ pathname: "/subscriptions/[id]", params: { id } }) as unknown as Href,
  account: (id: string) =>
    ({ pathname: "/accounts/[id]", params: { id } }) as unknown as Href,
  transactions: "/transactions" as const,
  bulkTransactions: "/transactions/bulk" as Href,
  newTransaction: "/transactions/new" as Href,
  newTransfer: "/transactions/transfer" as Href,
  transaction: (id: string) =>
    ({ pathname: "/transactions/[id]", params: { id } }) as unknown as Href,
  receipt: (id: string) =>
    ({ pathname: "/receipts/[id]", params: { id } }) as unknown as Href,
  refund: (id: string) =>
    ({ pathname: "/transactions/[id]/refund", params: { id } }) as unknown as Href,
  splits: (id: string) =>
    ({ pathname: "/transactions/[id]/splits", params: { id } }) as unknown as Href,
  categories: "/categories" as Href,
  newCategory: "/categories/new" as Href,
  category: (id: string) =>
    ({ pathname: "/categories/[id]", params: { id } }) as unknown as Href,
} as const;
