import { useCallback } from "react";
import { useSync } from "./sync-context";

/** Pull-to-refresh handler: pushes queued edits, then reloads every finance slice from the server (no-op offline/guest). */
export function usePullRefresh() {
  const { flush, refreshRemote } = useSync();
  return useCallback(async () => { await flush(); await refreshRemote(); }, [flush, refreshRemote]);
}
