/** Keep OAuth's post-login destination on this site, even after URL decoding. */
export function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/")) return "/dashboard";

  try {
    const decoded = decodeURIComponent(value);
    if (
      decoded.startsWith("//") ||
      /[\\\u0000-\u001f\u007f]/.test(decoded)
    ) {
      return "/dashboard";
    }
  } catch {
    return "/dashboard";
  }

  return value;
}
