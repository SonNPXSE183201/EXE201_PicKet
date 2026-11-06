import { ForgotPasswordForm } from "./forgot-password-form";
import { PaperAuthShell } from "@/features/auth/components/paper-auth-shell";

export default function ForgotPasswordPage() {
  return (
    <PaperAuthShell>
      <ForgotPasswordForm />
    </PaperAuthShell>
  );
}
