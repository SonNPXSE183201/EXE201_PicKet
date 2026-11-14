import { connection } from "next/server";
import { loadSignupChannels } from "@/core/auth/verification";
import { firebaseWebConfig } from "@/core/firebase/config";
import { turnstileSiteKey } from "@/core/security/turnstile";
import { ForgotPasswordForm } from "./forgot-password-form";
import { PaperAuthShell } from "@/features/auth/components/paper-auth-shell";

export default async function ForgotPasswordPage() {
  await connection();
  // SMS recovery is offered only when admins enabled SMS and the Firebase web config is present.
  const channels = await loadSignupChannels();
  const firebase = channels.sms ? firebaseWebConfig() : undefined;
  return (
    <PaperAuthShell story="forgot">
      <ForgotPasswordForm siteKey={turnstileSiteKey()} firebase={firebase} />
    </PaperAuthShell>
  );
}
