/** Safety check for "Bắt buộc cập nhật nếu thấp hơn code" (min_supported_code). */
export type MinSupportedRisk = "none" | "above_previous" | "above_live";

type ReleaseRow = { channel: string; version_code: number; status: string };

/**
 * A floor above the previous live build forces every user still on it to update;
 * a floor above the live build itself would lock out every user of the channel.
 * Both need an explicit second confirmation.
 */
export function minSupportedRisk(
  channel: string,
  minSupported: number | null,
  releases: ReleaseRow[],
): MinSupportedRisk {
  if (minSupported === null || !Number.isFinite(minSupported)) return "none";
  const inChannel = releases.filter((r) => r.channel === channel);
  const live = inChannel.filter((r) => r.status === "live").reduce((m, r) => Math.max(m, r.version_code), 0);
  if (!live) return "none";
  if (minSupported > live) return "above_live";
  const previous = inChannel.filter((r) => r.version_code < live).reduce((m, r) => Math.max(m, r.version_code), 0);
  return minSupported > previous ? "above_previous" : "none";
}

export const MIN_SUPPORTED_WARNINGS: Record<Exclude<MinSupportedRisk, "none">, string> = {
  above_live: "Mã bắt buộc cao hơn bản đang phát hành của kênh này: toàn bộ người dùng sẽ bị khóa cho tới khi có bản mới.",
  above_previous: "Mã bắt buộc cao hơn bản phát hành trước: mọi người dùng đang ở bản cũ sẽ bị buộc cập nhật ngay.",
};
