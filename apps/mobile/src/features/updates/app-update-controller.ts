import type { AppRelease, AppUpdateResult } from "./app-update-policy";
export type UpdatePhase = "idle" | "checking" | "available" | "current" | "unsupported" | "play-store" | "downloading" | "ready" | "permission" | "opening-installer" | "installer-opened" | "error";
export type UpdateSnapshot = { phase: UpdatePhase; progress: number; release?: AppRelease; file?: string };
type Dependencies = {
  check(): Promise<AppUpdateResult>;
  download(release: AppRelease, signal: AbortSignal, progress: (value: number) => void): Promise<string>;
  canInstall(): boolean; openSettings(): Promise<void>;
  openInstaller(file: string, release: AppRelease): Promise<void>; openStore(): Promise<void>;
};
export function createAppUpdateController(deps: Dependencies, changed: (state: UpdateSnapshot) => void) {
  let state: UpdateSnapshot = { phase: "idle", progress: 0 };
  let active = true, generation = 0;
  let abort: AbortController | null = null;
  const publish = (next: UpdateSnapshot) => { if (active) { state = next; changed(next); } };
  const busy = () => ["checking", "downloading", "opening-installer"].includes(state.phase);
  return {
    snapshot: () => state,
    activate() {
      if (active) return;
      active = true;
      // Disposal invalidates the in-flight operation. Never retain a busy
      // phase that can no longer settle after effect setup runs again.
      if (state.phase === "checking") publish({ phase: "idle", progress: 0 });
      else if (state.phase === "downloading") publish({ phase: "available", release: state.release, progress: 0 });
      else if (state.phase === "opening-installer") publish({ ...state, phase: "ready" });
    },
    async check() {
      if (!active || busy()) return;
      const current = ++generation;
      publish({ phase: "checking", progress: 0 });
      try {
        const result = await deps.check();
        if (active && generation === current) publish({ phase: result.kind, progress: 0, ...("release" in result ? { release: result.release } : {}) });
      } catch { if (active && generation === current) publish({ phase: "error", progress: 0 }); }
    },
    async download() {
      if (!active || state.phase !== "available" || !state.release) return;
      const release = state.release, current = ++generation;
      const request = new AbortController(); abort = request;
      publish({ phase: "downloading", progress: 0, release });
      try {
        const file = await deps.download(release, request.signal, progress => {
          if (generation === current && !request.signal.aborted) publish({ phase: "downloading", release, progress: Math.max(0, Math.min(100, Math.floor(progress))) });
        });
        if (active && generation === current && !request.signal.aborted) publish({ phase: "ready", release, file, progress: 100 });
      } catch { if (active && generation === current) publish({ phase: "error", release, progress: 0 }); }
      finally { if (abort === request) abort = null; }
    },
    cancel() { generation++; abort?.abort(); abort = null; if (active && state.phase === "downloading") publish({ phase: "available", release: state.release, progress: 0 }); },
    async install() {
      if (!active || !["ready", "permission", "installer-opened"].includes(state.phase) || !state.file || !state.release) return;
      if (!deps.canInstall()) { publish({ ...state, phase: "permission" }); return; }
      const current = ++generation;
      const file = state.file, release = state.release;
      publish({ ...state, phase: "opening-installer" });
      try { await deps.openInstaller(file, release); if (active && generation === current) publish({ ...state, phase: "installer-opened" }); }
      catch { if (active && generation === current) publish({ ...state, phase: "error" }); }
    },
    async openSettings() { if (!active || state.phase !== "permission") return; try { await deps.openSettings(); } catch { publish({ ...state, phase: "error" }); } },
    refreshPermission() { if (active && state.phase === "permission" && deps.canInstall()) publish({ ...state, phase: "ready" }); },
    async openStore() { if (!active || state.phase !== "play-store") return; try { await deps.openStore(); } catch { publish({ ...state, phase: "error" }); } },
    dispose() { active = false; generation++; abort?.abort(); abort = null; },
  };
}
