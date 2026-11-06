export function recoverySession(
  fragment: string,
): { access_token: string; refresh_token: string } | null {
  if (fragment.length > 24000) return null;
  const params = new URLSearchParams(fragment.replace(/^#/, ""));
  const access = params.get("access_token"),
    refresh = params.get("refresh_token");
  if (
    params.get("type") !== "recovery" ||
    params.has("error") ||
    !access ||
    !refresh ||
    access.length > 16000 ||
    refresh.length > 8000 ||
    /[\s\u0000-\u001f]/.test(access + refresh)
  )
    return null;
  return { access_token: access, refresh_token: refresh };
}
