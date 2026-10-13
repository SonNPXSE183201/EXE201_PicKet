import { redirect } from "next/navigation";

import { VerifyEmailForm } from "./verify-email-form";

interface VerifyEmailPageProps {
  searchParams: Promise<{ email?: string }>;
}

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const { email } = await searchParams;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) redirect("/register");
  return <main className="auth-page"><VerifyEmailForm email={email} /></main>;
}
