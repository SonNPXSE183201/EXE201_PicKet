import { redirect } from "next/navigation";

import { createClient } from "@/core/supabase/server";

import { RegisterForm } from "./register-form";

export default async function RegisterPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims) redirect("/dashboard");
  return (
    <main className="auth-page">
      <RegisterForm />
    </main>
  );
}
