import { WorkspaceShell } from "@/core/ui/workspace-shell";
import { requireApiSession } from "@/core/auth/require-api-session";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { role, permissions, claims, mfaVerified } = await requireApiSession("admin");
  const email = typeof claims.email === "string" ? claims.email : null;
  return <WorkspaceShell admin adminRole={role} adminPermissions={permissions} adminEmail={email} adminMfaVerified={mfaVerified}>{children}</WorkspaceShell>;
}
