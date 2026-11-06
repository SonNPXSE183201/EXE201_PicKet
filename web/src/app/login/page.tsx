import { redirect } from "next/navigation";

import { createClient } from "@/core/supabase/server";

import { LoginForm } from "./login-form";
import { AuthShell } from "@/features/auth/components/auth-shell";

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims) redirect("/session");

  const params = await searchParams;
  const initialError = params.error
    ? "Đăng nhập không hoàn tất. Vui lòng thử lại."
    : undefined;

  return (
    <AuthShell variant="login">
      <LoginForm initialError={initialError} />
    </AuthShell>
  );
}
