import { File, Paths } from "expo-file-system";
import * as SecureStore from "expo-secure-store";

/** Read existence only; never open a finance database or inspect receipt contents. */
export async function isExistingInstall(): Promise<boolean> {
  if (await SecureStore.getItemAsync("picket_local_mode_v1") !== null) return true;
  return ["picket-offline.db", "picket-sync.db", "picket-capture.db", "picket-guest-receipts.db", "picket-keepsakes.db"].some(name =>
    new File(Paths.document, "SQLite", name).exists);
}
