import { redirect } from "next/navigation";

import { PaperAuthShell } from "@/features/auth/components/paper-auth-shell";
import { VerifyEmailForm } from "./verify-email-form";

interface VerifyEmailPageProps {
  searchParams: Promise<{ email?: string }>;
}

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const { email } = await searchParams;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) redirect("/register");
  return (
    <PaperAuthShell>
      <VerifyEmailForm email={email} />
    </PaperAuthShell>
  );
}
