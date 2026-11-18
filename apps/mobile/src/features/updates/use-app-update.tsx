import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react";
import { AppState } from "react-native";
import * as SecureStore from "expo-secure-store";
import { readPublicConfig } from "@/core/config/public-config";
import { androidAppUpdates, getInstalledAppInfo } from "./android-app-updates";
import type { AppRelease, InstalledApp } from "./app-update-policy";
import { fetchReleasePolicy } from "./release-policy";
import { canApplyNow, canAutoDownload, choosePlayMode, isRequired, opensApplyWindow, shouldCheck, type UpdateState } from "./update-schedule";
import type { InstallProgress, PlayUpdateInfo } from "./update-types";

const LAST_CHECKED_KEY = "picket_update_last_checked_v1";

type AppUpdateValue = {
  state: UpdateState;
  /** True when the installed build is below the minimum supported version. */
  required: boolean;
  installed: InstalledApp | null;
  /** Direct-APK builds can use the download flow; Play builds use Play. */
  isPlayChannel: boolean;
  /** Re-run the check now (ignores the 6 hour spacing). */
  retry(): void;
  /** Required gate action: Play immediate flow, or APK download and install. */
  startRequired(): void;
  /** Flexible update downloaded: restart into the new version. */
  restart(): void;
  /** Optional APK update that was not auto-downloaded (metered network or low battery). */
  download(): void;
  /** Re-open the Android installer for an APK that is already downloaded and verified. */
  install(): void;
  openSettings(): void;
  openStore(): void;
};

const noop = () => undefined;
const Context = createContext<AppUpdateValue>({
  state: { kind: "none" }, required: false, installed: null, isPlayChannel: false,
  retry: noop, download: noop, startRequired: noop, restart: noop, install: noop, openSettings: noop, openStore: noop,
});

export const useAppUpdate = () => useContext(Context);

async function readLastChecked(): Promise<number | null> {
  try {
    const raw = await SecureStore.getItemAsync(LAST_CHECKED_KEY);
    const value = raw ? Number(raw) : NaN;
    return Number.isFinite(value) ? value : null;
  } catch { return null; }
}
const writeLastChecked = (value: number) => { void SecureStore.setItemAsync(LAST_CHECKED_KEY, String(value)).catch(() => undefined); };
/** Set while a Play immediate flow runs, so a process killed inside the Play screen resumes it. */
const IMMEDIATE_KEY = "picket_update_immediate_v1";
const readImmediate = async () => { try { return (await SecureStore.getItemAsync(IMMEDIATE_KEY)) === "1"; } catch { return false; } };
const writeImmediate = (on: boolean) => {
  void (on ? SecureStore.setItemAsync(IMMEDIATE_KEY, "1") : SecureStore.deleteItemAsync(IMMEDIATE_KEY)).catch(() => undefined);
};


/** Automatic update flow for both channels. Mount inside the ready session tree. */
export function AppUpdateProvider({ children }: PropsWithChildren) {
  const [state, setStateValue] = useState<UpdateState>({ kind: "none" });
  const [required, setRequiredValue] = useState(false);
  const [installed] = useState(getInstalledAppInfo);
  const stateRef = useRef<UpdateState>(state);
  const requiredRef = useRef(false);
  const busy = useRef(false);
  const release = useRef<AppRelease | null>(null);
  const file = useRef<string | null>(null);
  const mounted = useRef(true);
  const installing = useRef(false);
  const playInfo = useRef<PlayUpdateInfo | null>(null);
  // Cold start opens the first apply window; long background stays open later ones.
  const windowOpenedAt = useRef<number | null>(null);
  const backgroundSince = useRef<number | null>(null);
  const applyAllowed = () => canApplyNow({ required: requiredRef.current, windowOpenedAt: windowOpenedAt.current, now: Date.now() });

  const setState = useCallback((next: UpdateState) => {
    stateRef.current = next;
    if (mounted.current) setStateValue(next);
  }, []);
  const setRequired = useCallback((next: boolean) => {
    requiredRef.current = next;
    if (mounted.current) setRequiredValue(next);
  }, []);

  const isPlay = Boolean(installed?.playStore && androidAppUpdates.play);

  const installApk = useCallback(async (path: string, target: AppRelease) => {
    // One installer at a time: a second session would abandon the first one mid-write.
    if (installing.current) return;
    if (!androidAppUpdates.canInstall()) { setState({ kind: "needs-user-action", action: "openSettings" }); return; }
    installing.current = true;
    try {
      const outcome = await androidAppUpdates.install(path, target);
      setState(outcome === "pending-user-action" ? { kind: "needs-user-action", action: "install" } : { kind: "downloaded" });
    } catch { setState({ kind: "failed" }); }
    finally { installing.current = false; }
  }, [setState]);

  const downloadApk = useCallback(async (target: AppRelease) => {
    if (busy.current && stateRef.current.kind === "downloading") return;
    setState({ kind: "downloading", progress: 0 });
    try {
      const path = await androidAppUpdates.download(target, new AbortController().signal, value => {
        setState({ kind: "downloading", progress: Math.max(0, Math.min(100, Math.floor(value))) });
      });
      file.current = path;
      // Installing restarts the app: do it now only right after opening, otherwise on the next open.
      if (canApplyNow({ required: requiredRef.current, windowOpenedAt: windowOpenedAt.current, now: Date.now() })) await installApk(path, target);
      else setState({ kind: "downloaded" });
    } catch { setState({ kind: "failed" }); }
  }, [installApk, setState]);

  const checkPlay = useCallback(async () => {
    const play = androidAppUpdates.play;
    if (!play || !installed) return;
    const config = readPublicConfig();
    const policy = config ? await fetchReleasePolicy(config.apiUrl, "play", installed.versionCode) : null;
    const minSupported = policy?.minSupportedVersionCode ?? null;
    const info = await play.check();
    playInfo.current = info;
    if (!info) { writeImmediate(false); setState({ kind: "none" }); return; }
    const mustUpdate = isRequired({ installedCode: installed.versionCode, minSupported }) && (info.available || info.downloaded);
    setRequired(mustUpdate);
    const immediate = async () => {
      writeImmediate(true);
      let accepted = false;
      try { accepted = await play.start("immediate"); } catch { accepted = false; }
      // Declining or failing the Play screen leaves the PicKet gate in front of the app.
      if (!accepted) { writeImmediate(false); setState({ kind: "required" }); }
    };
    // A finished flexible download always wins: offer the restart (banner or gate).
    if (info.downloaded) {
      writeImmediate(false);
      setState({ kind: "downloaded" });
      if (canApplyNow({ required: mustUpdate, windowOpenedAt: windowOpenedAt.current, now: Date.now() })) await play.complete().catch(() => undefined);
      return;
    }
    if (info.inProgress) {
      // Play reports "in progress" for flexible downloads too; resume the blocking flow only if we started one.
      if (await readImmediate()) { setRequired(true); setState({ kind: "required" }); await immediate(); }
      else setState({ kind: "downloading", progress: 0 });
      return;
    }
    writeImmediate(false);
    const mode = choosePlayMode({ info, installedCode: installed.versionCode, minSupported });
    if (mode === "none") { setState(mustUpdate ? { kind: "required" } : { kind: "none" }); return; }
    if (mode === "immediate") { setRequired(true); setState({ kind: "required" }); await immediate(); return; }
    setState(mustUpdate ? { kind: "required" } : { kind: "available" });
    // Every new release downloads in the background without waiting for a tap.
    let accepted = false;
    try { accepted = await play.start("flexible"); } catch { accepted = false; }
    if (!accepted) { setState(mustUpdate ? { kind: "required" } : { kind: "none" }); return; }
    const now = stateRef.current as UpdateState;
    if (now.kind === "available" || now.kind === "required") setState({ kind: "downloading", progress: 0 });
  }, [installed, setRequired, setState]);

  const checkApk = useCallback(async () => {
    if (!installed) return;
    const result = await androidAppUpdates.check();
    if (result.kind !== "available") { setState({ kind: "none" }); setRequired(false); return; }
    const config = readPublicConfig();
    const policy = config ? await fetchReleasePolicy(config.apiUrl, "apk", installed.versionCode) : null;
    const mustUpdate = isRequired({ installedCode: installed.versionCode, minSupported: policy?.minSupportedVersionCode ?? null, releaseRequired: result.release.required });
    release.current = result.release;
    setRequired(mustUpdate);
    setState(mustUpdate ? { kind: "required" } : { kind: "available" });
    if (canAutoDownload({ conditions: androidAppUpdates.deviceConditions(), required: mustUpdate })) await downloadApk(result.release);
  }, [downloadApk, installed, setRequired, setState]);

  const run = useCallback(async (force: boolean) => {
    if (busy.current || !installed) return;
    // A pending Play download or installer confirmation is not interrupted by a re-check.
    // A running download, or a wait for the Android settings permission, is not interrupted.
    // A dismissed installer prompt (needs-user-action/install) re-checks normally.
    const current = stateRef.current;
    if (current.kind === "downloading" || (current.kind === "needs-user-action" && current.action === "openSettings")) return;
    busy.current = true;
    try {
      const last = await readLastChecked();
      // Resume an immediate Play update or retry a required gate even inside the spacing window.
      const resume = isPlay && await readImmediate();
      const waiting = stateRef.current.kind === "available";
      if (!shouldCheck(last, Date.now(), { force: force || resume || waiting || requiredRef.current })) return;
      writeLastChecked(Date.now());
      await (isPlay ? checkPlay() : checkApk());
    } catch {
      // A failed check never blocks the user; keep a visible retry only for known updates.
      const after = stateRef.current as UpdateState;
      if (after.kind === "available" || after.kind === "downloading") setState({ kind: "failed" });
    } finally { busy.current = false; }
  }, [checkApk, checkPlay, installed, isPlay, setState]);

  useEffect(() => {
    mounted.current = true;
    windowOpenedAt.current = Date.now();
    void run(false);
    const subscription = AppState.addEventListener("change", next => {
      if (next !== "active") { backgroundSince.current ??= Date.now(); return; }
      if (opensApplyWindow(backgroundSince.current, Date.now())) windowOpenedAt.current = Date.now();
      backgroundSince.current = null;
      if (next === "active") {
        // Back after a long break with a finished download: apply it now (the app restarts).
        if (stateRef.current.kind === "downloaded" && applyAllowed()) {
          if (isPlay) void androidAppUpdates.play?.complete().catch(() => undefined);
          else if (file.current && release.current) void installApk(file.current, release.current);
          return;
        }
        // Returning from Android settings: continue an APK that was waiting for the permission.
        const waiting = stateRef.current;
        if (waiting.kind === "needs-user-action" && waiting.action === "openSettings" && file.current && release.current && androidAppUpdates.canInstall()) {
          void installApk(file.current, release.current);
          return;
        }
        void run(false);
      }
      // Never apply while leaving the app: "background" also fires for pickers, the purchase
      // sheet and sign-in, and restarting then would lose what the user was doing.
    });
    return () => { mounted.current = false; subscription.remove(); };
  }, [installApk, isPlay, run]);

  useEffect(() => {
    const play = androidAppUpdates.play;
    if (!play) return;
    return play.subscribe((progress: InstallProgress) => {
      if (progress.status === "downloading" || progress.status === "pending") {
        setState({ kind: "downloading", progress: progress.total > 0 ? Math.max(0, Math.min(100, Math.floor(progress.bytes / progress.total * 100))) : 0 });
      } else if (progress.status === "downloaded") {
        setState({ kind: "downloaded" });
        if (applyAllowed()) void play.complete().catch(() => undefined);
      }
      else if (progress.status === "failed") setState({ kind: requiredRef.current ? "required" : "failed" });
      else if (progress.status === "canceled") setState({ kind: requiredRef.current ? "required" : "none" });
    });
  }, [setState]);

  const startRequired = useCallback(() => {
    if (isPlay) {
      const play = androidAppUpdates.play;
      if (!play) return;
      if (stateRef.current.kind === "downloaded") { void play.complete().catch(() => setState({ kind: "required" })); return; }
      // Play may refuse the immediate type; fall back to a flexible download plus restart.
      const type = playInfo.current && !playInfo.current.immediateAllowed && playInfo.current.flexibleAllowed ? "flexible" : "immediate";
      if (type === "immediate") writeImmediate(true);
      void play.start(type).then(accepted => {
        if (!accepted) { writeImmediate(false); setState({ kind: "required" }); }
        else if (type === "flexible") setState({ kind: "downloading", progress: 0 });
      }).catch(() => { writeImmediate(false); setState({ kind: "required" }); });
    } else if (file.current && release.current && stateRef.current.kind !== "failed") void installApk(file.current, release.current);
    else if (release.current) void downloadApk(release.current);
    else void run(true);
  }, [downloadApk, installApk, isPlay, run, setState]);

  const value = useMemo<AppUpdateValue>(() => ({
    state, required, installed, isPlayChannel: isPlay,
    retry: () => void run(true),
    startRequired,
    download: () => {
      if (isPlay) {
        void androidAppUpdates.play?.start("flexible").then(accepted => { if (accepted) setState({ kind: "downloading", progress: 0 }); }).catch(() => setState({ kind: "failed" }));
      } else if (release.current) void downloadApk(release.current);
    },
    restart: () => { void androidAppUpdates.play?.complete().catch(() => setState({ kind: "failed" })); },
    install: () => {
      if (isPlay) { void androidAppUpdates.play?.complete().catch(() => setState({ kind: "failed" })); return; }
      if (file.current && release.current) void installApk(file.current, release.current);
    },
    openSettings: () => { void androidAppUpdates.openSettings().catch(() => undefined); },
    openStore: () => { void androidAppUpdates.openStore().catch(() => undefined); },
  }), [downloadApk, installApk, installed, isPlay, required, run, setState, startRequired, state]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}
