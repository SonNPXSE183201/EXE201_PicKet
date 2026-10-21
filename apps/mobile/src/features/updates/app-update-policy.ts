export const APP_RELEASE_ORIGIN = "https://picket.51-79-207-154.sslip.io";
export const APP_RELEASE_URL = `${APP_RELEASE_ORIGIN}/release.json`;
export type InstalledApp = { version: string; versionCode: number; packageName: string; sdk: number; abis: string[]; playStore: boolean };
export type AppRelease = { version: string; versionCode: number; publishedAt: string; filename: string; abi: string; minSdk: number; packageName: string; bytes: number; sha256: string; downloadUrl: string };
export type AppUpdateResult = { kind: "available"; release: AppRelease } | { kind: "current" | "unsupported" | "play-store" };

export function resolveAppUpdate(input: unknown, installed: InstalledApp): AppUpdateResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid release metadata");
  const value = input as Record<string, unknown>;
  const integer = (name: string, min: number, max: number) => typeof value[name] === "number" && Number.isSafeInteger(value[name]) && value[name] >= min && value[name] <= max;
  if (typeof value.version !== "string" || !/^\d+\.\d+\.\d+$/.test(value.version)
    || !integer("versionCode", 1, 2_100_000_000) || !integer("bytes", 1, 500 * 1024 * 1024)
    || !integer("minSdk", 24, 100) || value.packageName !== "com.picket.mobile" || value.abi !== "arm64-v8a"
    || typeof value.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(value.sha256)
    || typeof value.filename !== "string" || !/^[a-z0-9][a-z0-9.-]*\.apk$/.test(value.filename) || value.filename.includes("..")
    || typeof value.publishedAt !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value.publishedAt)
    || !Number.isFinite(Date.parse(value.publishedAt)) || new Date(value.publishedAt).toISOString().slice(0, 10) !== value.publishedAt) {
    throw new Error("Invalid release metadata");
  }
  if (installed.playStore) return { kind: "play-store" };
  if (installed.packageName !== value.packageName || !installed.abis.includes("arm64-v8a") || installed.sdk < (value.minSdk as number)
    || !Number.isSafeInteger(installed.versionCode) || installed.versionCode < 1) return { kind: "unsupported" };
  if ((value.versionCode as number) <= installed.versionCode) return { kind: "current" };
  return { kind: "available", release: { version: value.version, versionCode: value.versionCode as number,
    publishedAt: value.publishedAt, filename: value.filename, abi: value.abi, minSdk: value.minSdk as number,
    packageName: value.packageName, bytes: value.bytes as number, sha256: value.sha256,
    downloadUrl: `${APP_RELEASE_ORIGIN}/downloads/${value.filename}` } };
}

export function installedVersionLabel(app: Pick<InstalledApp, "version" | "versionCode"> | null): string {
  return app ? `Phiên bản ${app.version} (${app.versionCode})` : "Chưa xác định phiên bản đã cài";
}
