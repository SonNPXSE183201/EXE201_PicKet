import { requireOptionalNativeModule } from "expo";
import Constants from "expo-constants";
import { Linking, Platform } from "react-native";
import type { AppRelease, InstalledApp } from "./app-update-policy";
import type { ApkInstallOutcome, DeviceConditions, InstallProgress, PlayUpdateBindings, PlayUpdateInfo } from "./update-types";

const unavailable = async (): Promise<never> => {
  throw new Error("APK updates are unavailable in Google Play builds");
};

type NativePlayUpdates = {
  checkForUpdate(): Promise<PlayUpdateInfo | null>;
  startUpdate(type: "flexible" | "immediate"): Promise<boolean>;
  completeUpdate(): Promise<void>;
  addListener(event: "onInstallState", listener: (progress: InstallProgress) => void): { remove(): void };
};

// Linked only into Play builds (plugins/with-play-store-build.js); null in Expo Go or old binaries.
const nativePlay = Platform.OS === "android" ? requireOptionalNativeModule<NativePlayUpdates>("PicketPlayUpdates") : null;

const play: PlayUpdateBindings | null = nativePlay
  ? {
      check: () => nativePlay.checkForUpdate(),
      start: (type) => nativePlay.startUpdate(type),
      complete: () => nativePlay.completeUpdate(),
      subscribe(listener) {
        const subscription = nativePlay.addListener("onInstallState", listener);
        return () => subscription.remove();
      },
    }
  : null;

export function getInstalledAppInfo(): InstalledApp {
  return {
    version: Constants.expoConfig?.version ?? "1.0.4",
    versionCode: Constants.expoConfig?.android?.versionCode ?? 6,
    packageName: "com.picket.mobile",
    sdk: Platform.Version as number,
    abis: [],
    playStore: true,
  };
}

export const androidAppUpdates = {
  async check() {
    return { kind: "play-store" as const };
  },
  download: unavailable as (
    release: AppRelease,
    signal: AbortSignal,
    progress: (value: number) => void,
  ) => Promise<string>,
  canInstall: () => false,
  openSettings: unavailable,
  openInstaller: unavailable as (
    file: string,
    release: AppRelease,
  ) => Promise<never>,
  async openStore() {
    await Linking.openURL(
      "https://play.google.com/store/apps/details?id=com.picket.mobile",
    );
  },
  play,
  deviceConditions: (): DeviceConditions | null => null,
  install: unavailable as (
    file: string,
    release: AppRelease,
  ) => Promise<ApkInstallOutcome>,
};
