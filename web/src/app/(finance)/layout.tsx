import { WorkspaceShell } from '@/core/ui/workspace-shell';

import { requireApiSession } from "@/core/auth/require-api-session";

import { FinanceRealtime } from "./finance-realtime";

export default async function FinanceLayout({ children }: LayoutProps<"/">) {
  const { claims } = await requireApiSession();
  const userId = typeof claims.sub === "string" ? claims.sub : null;
  return (
    <WorkspaceShell><main className="finance-shell shell" id="main-content">
      <a className="skip-link" href="#finance-content">Bỏ qua điều hướng</a>
      <header className="finance-header">
        {userId ? <FinanceRealtime userId={userId} /> : null}
      </header>
      <div id="finance-content" tabIndex={-1}>{children}</div>
    </main></WorkspaceShell>
  );
}
