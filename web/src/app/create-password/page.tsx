import { redirect } from "next/navigation";

import { canOpenPasswordSetup } from "@/core/auth/password-setup";
import { createClient } from "@/core/supabase/server";
import { PaperAuthShell } from "@/features/auth/components/paper-auth-shell";
import { CreatePasswordPageForm } from "./create-password-page-form";

/* Last step of OTP-first email sign-up. Accounts flagged password_setup_required stay here, as do
   signed-in accounts sent with ?required=1 after the API reported "Password setup required". */
export default async function CreatePasswordPage({ searchParams }: { searchParams: Promise<{ required?: string | string[] }> }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");
  if (!canOpenPasswordSetup(data.claims, (await searchParams).required)) redirect("/dashboard");
  return (
    <PaperAuthShell story="verify">
      <CreatePasswordPageForm />
    </PaperAuthShell>
  );
}
