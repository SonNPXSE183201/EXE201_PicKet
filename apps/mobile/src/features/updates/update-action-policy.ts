import type { UpdatePhase } from "./app-update-controller";

/** Keep one next step; a recheck must not compete with an actionable release. */
export function showUpdateCheck(phase: UpdatePhase) {
  return phase === "idle" || phase === "current" || phase === "error";
}
