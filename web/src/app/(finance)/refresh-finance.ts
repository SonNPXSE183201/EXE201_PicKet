"use server";

import { refresh } from "next/cache";

import { requireApiSession } from "@/core/auth/require-api-session";
import { invalidateFinanceCache } from "@/core/finance/finance-cache";

/** Invalidate only the signed-in session and return its fresh RSC payload. */
export async function refreshFinance() {
  const { accessToken } = await requireApiSession();
  invalidateFinanceCache(accessToken);
  refresh();
}
