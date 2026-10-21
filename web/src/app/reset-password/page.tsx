import { redirect } from "next/navigation";

import { createClient } from "@/core/supabase/server";

import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/forgot-password");
  return (
    <main className="auth-page">
      <ResetPasswordForm />
    </main>
  );
}
