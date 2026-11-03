/** Server policy is independent of optional administrative permissions. */
export function mobileAccessAllowed(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const policy = value as Record<string, unknown>;
  return typeof policy.staff === 'boolean' && policy.mobileAllowed === true;
}

export function cachedMobileAccessAllowed(
  value: unknown,
  owner: string,
  now: number,
): boolean {
  if (!value || typeof value !== "object") return false;
  const cache = value as Record<string, unknown>;
  return (
    cache.owner === owner &&
    cache.allowed === true &&
    typeof cache.checkedAt === "number" &&
    cache.checkedAt <= now &&
    now - cache.checkedAt < 24 * 60 * 60 * 1000
  );
}
