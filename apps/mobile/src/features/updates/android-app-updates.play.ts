import Constants from "expo-constants";
import { Linking, Platform } from "react-native";
import type { AppRelease, InstalledApp } from "./app-update-policy";

const unavailable = async (): Promise<never> => {
  throw new Error("APK updates are unavailable in Google Play builds");
};

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
};
