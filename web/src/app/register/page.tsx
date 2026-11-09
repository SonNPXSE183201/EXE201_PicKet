import { redirect } from "next/navigation";

import { createClient } from "@/core/supabase/server";
import { PaperAuthShell } from "@/features/auth/components/paper-auth-shell";
import { RegisterForm } from "./register-form";

export default async function RegisterPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims) redirect("/dashboard");
  return (
    <PaperAuthShell>
      <RegisterForm />
    </PaperAuthShell>
  );
}
