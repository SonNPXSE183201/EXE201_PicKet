import type { Metadata } from "next";
import { RecoveryReceiver } from "@/features/auth/components/recovery-receiver";
import { PaperAuthShell } from "@/features/auth/components/paper-auth-shell";
export const metadata: Metadata = {
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <PaperAuthShell>
      <RecoveryReceiver />
    </PaperAuthShell>
  );
}
