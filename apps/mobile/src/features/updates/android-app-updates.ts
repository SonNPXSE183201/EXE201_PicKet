import { requireOptionalNativeModule } from "expo";
import { Directory, File, Paths } from "expo-file-system";
import { Linking, Platform } from "react-native";
import { APP_RELEASE_URL, resolveAppUpdate, type AppRelease, type InstalledApp } from "./app-update-policy";
import type { ApkInstallOutcome, DeviceConditions, PlayUpdateBindings } from "./update-types";

type NativeUpdates = {
  getInstalledAppInfo(): InstalledApp; canInstallUpdates(): boolean;
  openInstallPermissionSettings(): Promise<void>;
  verifyDownloadedApk(uri: string, bytes: number, hash: string, code: number, version: string): Promise<void>;
  openInstaller(uri: string, bytes: number, hash: string, code: number, version: string): Promise<void>;
  // Added in 1.3.0; older native builds lack them, so callers must feature-check.
  installWithSession?(uri: string, bytes: number, hash: string, code: number, version: string): Promise<string>;
  getDeviceConditions?(): DeviceConditions;
};
const native = Platform.OS === "android" ? requireOptionalNativeModule<NativeUpdates>("PicketAppUpdates") : null;
export function getInstalledAppInfo(): InstalledApp | null {
  try { return native?.getInstalledAppInfo() ?? null; } catch { return null; }
}
const verify = (file: File, release: AppRelease) => {
  if (!native) throw new Error("Updates unavailable");
  return native.verifyDownloadedApk(file.uri, release.bytes, release.sha256, release.versionCode, release.version);
};
let downloading = false;
// Failures another installer cannot fix: the APK itself was rejected or install permission is missing.
// Errors the system installer would hit the same way, or where a committed session may still be live.
const NO_INSTALLER_FALLBACK = new Set(["ERR_UPDATE_VERIFICATION", "ERR_INSTALL_PERMISSION", "ERR_INSTALL_TIMEOUT", "ERR_INSTALL_ABORTED", "ERR_INSTALL_CONFLICT", "ERR_INSTALL_INCOMPATIBLE"]);
const errorCode = (error: unknown) =>
  typeof error === "object" && error !== null && "code" in error ? String((error as { code: unknown }).code) : "";
export const androidAppUpdates = {
  async check() {
    const installed = getInstalledAppInfo();
    if (!installed) throw new Error("Updates unavailable");
    if (installed.playStore) return { kind: "play-store" as const };
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(APP_RELEASE_URL, { signal: controller.signal, credentials: "omit", redirect: "error", headers: { Accept: "application/json", "Cache-Control": "no-cache" } });
      if (!response.ok || (response.url && response.url !== APP_RELEASE_URL)) throw new Error("Release unavailable");
      const text = await response.text();
      if (text.length > 32_768) throw new Error("Invalid metadata size");
      return resolveAppUpdate(JSON.parse(text), installed);
    } finally { clearTimeout(timer); }
  },
  async download(release: AppRelease, signal: AbortSignal, progress: (value: number) => void) {
    if (downloading || signal.aborted) throw new Error("Download unavailable");
    downloading = true;
    const controller = new AbortController(), cancel = () => controller.abort();
    signal.addEventListener("abort", cancel);
    const timer = setTimeout(cancel, 10 * 60_000);
    let file: File | undefined;
    try {
      const directory = new Directory(Paths.cache, "picket-updates");
      directory.create({ intermediates: true, idempotent: true });
      file = new File(directory, `picket-update-${release.sha256}.apk`);
      // Only our own cache entries, never backup/photos or user documents.
      for (const old of directory.list()) if (old instanceof File && old.uri !== file.uri && /^picket-update-[a-f0-9]{64}\.apk$/.test(old.name)) {
        try { old.delete(); } catch { /* A stale cache entry can be reclaimed later. */ }
      }
      if (file.exists) {
        try { await verify(file, release); if (controller.signal.aborted) throw new Error("Cancelled"); return file.uri; }
        catch { if (file.exists) file.delete(); }
      }
      if (controller.signal.aborted) throw new Error("Cancelled");
      await File.downloadFileAsync(release.downloadUrl, file, { signal: controller.signal,
        onProgress: ({ bytesWritten }) => {
          if (bytesWritten > release.bytes) controller.abort();
          progress(Math.min(99, bytesWritten / release.bytes * 100));
        } });
      if (controller.signal.aborted) throw new Error("Cancelled");
      await verify(file, release);
      if (controller.signal.aborted) throw new Error("Cancelled");
      return file.uri;
    } catch (error) {
      try { if (file?.exists) file.delete(); } catch { /* Never install an unverified partial file. */ }
      throw error;
    } finally { clearTimeout(timer); signal.removeEventListener("abort", cancel); downloading = false; }
  },
  canInstall: () => { try { return native?.canInstallUpdates() ?? false; } catch { return false; } },
  async openSettings() { if (!native) throw new Error("Updates unavailable"); await native.openInstallPermissionSettings(); },
  async openInstaller(file: string, release: AppRelease) {
    if (!native) throw new Error("Updates unavailable");
    // Revalidate size, digest, archive identity and signing before every intent.
    await native.openInstaller(file, release.bytes, release.sha256, release.versionCode, release.version);
  },
  async openStore() { await Linking.openURL("https://play.google.com/store/apps/details?id=com.picket.mobile"); },
  /** Google Play In-App Updates exist only in the Play build (android-app-updates.play.ts). */
  play: null as PlayUpdateBindings | null,
  deviceConditions(): DeviceConditions | null {
    try { return native?.getDeviceConditions?.() ?? null; } catch { return null; }
  },
  /**
   * Installs a downloaded, verified APK through a PackageInstaller session (silent on Android 12+
   * once PicKet is the installer of record). Falls back to the system installer screen when the
   * session API is missing or fails for a reason other than verification.
   */
  async install(file: string, release: AppRelease): Promise<ApkInstallOutcome> {
    if (!native) throw new Error("Updates unavailable");
    if (typeof native.installWithSession === "function") {
      try {
        const outcome = await native.installWithSession(file, release.bytes, release.sha256, release.versionCode, release.version);
        return outcome === "started" ? "started" : "pending-user-action";
      } catch (error) {
        if (NO_INSTALLER_FALLBACK.has(errorCode(error))) throw error;
      }
    }
    await native.openInstaller(file, release.bytes, release.sha256, release.versionCode, release.version);
    return "pending-user-action";
  },
};
