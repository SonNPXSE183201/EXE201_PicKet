import { turnstileSiteKey } from "@/core/security/turnstile";
import { googleWebClientId } from "@/core/auth/google";
import { loadSignupChannels } from "@/core/auth/verification";
import { firebaseWebConfig } from "@/core/firebase/config";
import { redirect } from "next/navigation";

import { createClient } from "@/core/supabase/server";
import { PaperAuthShell } from "@/features/auth/components/paper-auth-shell";
import { RegisterForm } from "./register-form";

interface RegisterPageProps {
  searchParams: Promise<{ channel?: string }>;
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims) redirect("/dashboard");
  const [{ channel }, channels] = await Promise.all([searchParams, loadSignupChannels()]);
  const firebase = channels.sms ? firebaseWebConfig() : undefined;
  const smsReady = channels.sms && !!firebase;
  const phone = smsReady && (channel === "phone" || !channels.email);
  return (
    <PaperAuthShell story={phone ? "phone" : "register"} fixedViewport>
      <RegisterForm emailEnabled={channels.email} smsEnabled={smsReady} firebase={firebase}
        initialMode={phone ? "phone" : "email"} googleClientId={googleWebClientId()} siteKey={turnstileSiteKey()} />
    </PaperAuthShell>
  );
}
