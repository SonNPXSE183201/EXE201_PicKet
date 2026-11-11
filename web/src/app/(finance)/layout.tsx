import { WorkspaceShell } from "@/core/ui/workspace-shell";
import { Suspense } from "react";

import { requireApiSession } from "@/core/auth/require-api-session";
import { userFinanceScreens } from "@/core/finance/user-screens";

import { FinanceRealtime } from "./finance-realtime";
import { AnnouncementBanner } from "@/features/announcements/announcement-banner";

export default async function FinanceLayout({ children }: LayoutProps<"/">) {
  const { api, accessToken, claims } = await requireApiSession();
  const { profile } = await api.currentProfile(accessToken);
  const userId = typeof claims.sub === "string" ? claims.sub : null;
  const userEmail = typeof claims.email === "string" ? claims.email : null;
  const claimValues = claims as unknown as Record<string, unknown>;
  const metadataValue = claimValues.user_metadata;
  const metadata = metadataValue && typeof metadataValue === "object"
    ? metadataValue as Record<string, unknown>
    : {};
  const userAvatar = [claimValues.picture, claimValues.avatar_url, metadata.picture, metadata.avatar_url]
    .find((value): value is string => typeof value === "string" && /^https?:\/\//i.test(value)) ?? null;
  return (
    <WorkspaceShell userName={profile?.displayName} userEmail={userEmail} userAvatar={userAvatar}>
      <main className="finance-shell shell" id="main-content">
        <a className="skip-link" href="#finance-content">
          Bỏ qua điều hướng
        </a>
        <header className="finance-header">
          {userId ? <FinanceRealtime userId={userId} screens={userFinanceScreens} /> : null}
        </header>
        <Suspense fallback={null}>
          <AnnouncementBanner api={api} accessToken={accessToken} />
        </Suspense>
        <div id="finance-content" tabIndex={-1}>
          {children}
        </div>
      </main>
    </WorkspaceShell>
  );
}
