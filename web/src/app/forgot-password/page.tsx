import { connection } from "next/server";
import { turnstileSiteKey } from "@/core/security/turnstile";
import { ForgotPasswordForm } from "./forgot-password-form";
import { PaperAuthShell } from "@/features/auth/components/paper-auth-shell";

export default async function ForgotPasswordPage() {
  await connection();
  return (
    <PaperAuthShell>
      <ForgotPasswordForm siteKey={turnstileSiteKey()} />
    </PaperAuthShell>
  );
}
