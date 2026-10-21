/** Web navigation policy only. API/RLS authorization remains independently enforced. */
export function workspaceRedirect(
  staff: boolean,
  pathname: string,
): string | null {
  if (
    [
      "/login",
      "/forgot-password",
      "/reset-password",
      "/auth/callback",
    ].includes(pathname)
  )
    return null;
  const admin = pathname === "/admin" || pathname.startsWith("/admin/");
  if (staff) return admin ? null : "/admin";
  if (admin || pathname === "/session") return "/dashboard";
  return null;
}
