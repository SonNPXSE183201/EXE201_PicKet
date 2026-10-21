import { PicketApiClient } from "@picket/api-client";
import { redirect } from "next/navigation";

import { createClient } from "@/core/supabase/server";
import { requireApiSession } from '@/core/auth/require-api-session';

import { OnboardingFlow } from "./onboarding-flow";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export default async function OnboardingPage() {
  await requireApiSession();
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) redirect("/login");
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) redirect("/login");

  const api = new PicketApiClient(apiBaseUrl);
  const { profile } = await api.currentProfile(token);
  if (profile?.onboardingCompleted) redirect("/dashboard");
  return <main className="auth-page"><OnboardingFlow /></main>;
}
