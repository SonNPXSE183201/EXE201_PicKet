"use server";

import { PicketApiClient } from "@picket/api-client";
import type { CompleteOnboardingRequest } from "@picket/domain";
import { redirect } from "next/navigation";

import { createClient } from "@/core/supabase/server";
import { requireApiSession } from '@/core/auth/require-api-session';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
const allowedCurrencies = new Set(["VND", "USD"]);

export async function completeOnboarding(request: CompleteOnboardingRequest) {
  await requireApiSession();
  const valid =
    request.displayName.trim().length > 0 && request.displayName.trim().length <= 120 &&
    request.persona.trim().length > 0 && request.persona.trim().length <= 80 &&
    request.goal.trim().length > 0 && request.goal.trim().length <= 120 &&
    request.walletName.trim().length > 0 && request.walletName.trim().length <= 80 &&
    allowedCurrencies.has(request.currencyCode) &&
    Number.isSafeInteger(request.openingBalance) &&
    Math.abs(request.openingBalance) <= 9_000_000_000_000;
  if (!valid) throw new Error("Thông tin onboarding chưa hợp lệ.");

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) redirect("/login");
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) redirect("/login");

  const api = new PicketApiClient(apiBaseUrl);
  await api.completeOnboarding(token, {
    ...request,
    displayName: request.displayName.trim(),
    walletName: request.walletName.trim(),
  });
  redirect("/dashboard");
}
