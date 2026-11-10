import { WorkspaceShell } from "@/core/ui/workspace-shell";
import { requireApiSession } from "@/core/auth/require-api-session";
import { canViewAdminSection } from "@/features/admin/admin-permissions";
import type { AdminNotice } from "@/features/admin/components/admin-notification-menu";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { api, accessToken, role, permissions, claims, mfaVerified } = await requireApiSession("admin");
  const claimValues = claims as unknown as Record<string, unknown>;
  const email = typeof claimValues.email === "string" ? claimValues.email : null;
  const metadataValue = claimValues.user_metadata;
  const metadata = metadataValue && typeof metadataValue === "object" ? metadataValue as Record<string, unknown> : {};
  const avatarUrl = [claimValues.picture, claimValues.avatar_url, metadata.picture, metadata.avatar_url].find((value): value is string => typeof value === "string" && /^https?:\/\//i.test(value)) ?? null;
  let notices: AdminNotice[] = [];
  if (canViewAdminSection(role, "incidents", permissions)) {
    try {
      const data = await api.adminPortal<{ rows?: { id?: unknown; title?: unknown; status?: unknown; updated_at?: unknown }[] }>(accessToken, "incidents", { days: 90, page: 0 });
      notices = (data.rows ?? []).slice(0, 25).flatMap((row) => typeof row.id === "string" ? [{ id: row.id, title: String(row.title ?? "Sự cố hệ thống"), status: String(row.status ?? "Cập nhật"), updatedAt: String(row.updated_at ?? "") }] : []);
    } catch { /* The admin workspace should still load if incident data is unavailable. */ }
  }
  return <WorkspaceShell admin adminRole={role} adminPermissions={permissions} adminEmail={email} adminAvatar={avatarUrl} adminNotices={notices} adminMfaVerified={mfaVerified}>{children}</WorkspaceShell>;
}
