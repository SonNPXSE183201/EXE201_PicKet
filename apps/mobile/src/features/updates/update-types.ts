// Shared contract between the native update bindings (android-app-updates*.ts)
// and the automatic update flow (use-app-update, banner, gate).

/** Result of Google Play In-App Updates `getAppUpdateInfo()`; null when the app was not installed by Play. */
export type PlayUpdateInfo = {
  available: boolean;
  availableVersionCode: number;
  /** 0-5, set per release via the Play Developer API (inAppUpdatePriority). */
  priority: number;
  stalenessDays: number | null;
  flexibleAllowed: boolean;
  immediateAllowed: boolean;
  /** A flexible update finished downloading and waits for completeUpdate(). */
  downloaded: boolean;
  /** An immediate update is already running (resume it on foreground). */
  inProgress: boolean;
};

export type InstallProgress = {
  status: "pending" | "downloading" | "downloaded" | "installing" | "installed" | "failed" | "canceled";
  bytes: number;
  total: number;
};

export type PlayUpdateBindings = {
  check(): Promise<PlayUpdateInfo | null>;
  /** Resolves true when the user accepted the Play flow, false when cancelled. */
  start(type: "flexible" | "immediate"): Promise<boolean>;
  complete(): Promise<void>;
  subscribe(listener: (progress: InstallProgress) => void): () => void;
};

/** Conditions for background APK downloads (direct build only). */
export type DeviceConditions = { unmetered: boolean; batteryPercent: number; charging: boolean };

/** Server-side policy from GET /v1/releases/policy. */
export type ReleasePolicy = {
  channel: "play" | "apk";
  latestVersionCode: number | null;
  minSupportedVersionCode: number | null;
};

/** APK install outcome: Android either installs silently or asks the user to confirm. */
export type ApkInstallOutcome = "started" | "pending-user-action";
