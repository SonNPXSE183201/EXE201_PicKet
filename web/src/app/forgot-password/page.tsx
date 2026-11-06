import { ForgotPasswordForm } from "./forgot-password-form";
import { AuthShell } from "@/features/auth/components/auth-shell";

export default function ForgotPasswordPage() {
  return (
    <AuthShell variant="recovery">
      <ForgotPasswordForm />
    </AuthShell>
  );
}
