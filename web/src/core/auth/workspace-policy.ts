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
      "/auth/reset-password",
    ].includes(pathname)
  )
    return null;
  const admin = pathname === "/admin" || pathname.startsWith("/admin/");
  if (staff) return pathname === "/session" ? "/admin" : null;
  if (admin || pathname === "/session") return "/dashboard";
  return null;
}
