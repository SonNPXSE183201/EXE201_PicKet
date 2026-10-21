import { WorkspaceShell } from '@/core/ui/workspace-shell';
import { requireApiSession } from '@/core/auth/require-api-session';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireApiSession('admin');
  return <WorkspaceShell admin>{children}</WorkspaceShell>;
}
