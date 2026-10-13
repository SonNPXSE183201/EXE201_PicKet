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
  restore: "/restore" as Href,
  deleteAccount: "/delete-account" as Href,
  syncConflicts: "/sync-conflicts" as Href,
  capture: "/capture" as Href,
  newAccount: "/accounts/new" as Href,
  budgets: "/budgets" as Href,
  account: (id: string) =>
    ({ pathname: "/accounts/[id]", params: { id } }) as unknown as Href,
  transactions: "/transactions" as Href,
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
