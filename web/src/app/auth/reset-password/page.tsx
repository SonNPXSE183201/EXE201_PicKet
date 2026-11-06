import type { Metadata } from "next";
import { RecoveryReceiver } from "@/features/auth/components/recovery-receiver";
export const metadata: Metadata = {
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <main className="auth-page">
      <RecoveryReceiver />
    </main>
  );
}
