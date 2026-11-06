import { WorkspaceShell } from "@/core/ui/workspace-shell";
import { requireApiSession } from "@/core/auth/require-api-session";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { role, permissions } = await requireApiSession("admin");
  return <WorkspaceShell admin adminRole={role} adminPermissions={permissions}>{children}</WorkspaceShell>;
}
