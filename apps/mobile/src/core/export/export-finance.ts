import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as Crypto from "expo-crypto";

import { picketApi } from "@/core/api/client";
import { withLocalOwnerAccess } from "@/core/sync/offline-cache";

export async function exportAndShareFinance(accessToken: string,userId:string) {
  if (!picketApi || !FileSystem.cacheDirectory) {
    throw new Error("Export is unavailable.");
  }
  const exported = await picketApi.exportFinance(accessToken);
  const date = exported.exportedAt.slice(0, 10);
  const uri = `${FileSystem.cacheDirectory}picket-export-${date}-${Crypto.randomUUID()}.json`;
  await withLocalOwnerAccess(userId,()=>FileSystem.writeAsStringAsync(uri, JSON.stringify(exported, null, 2), {
    encoding: FileSystem.EncodingType.UTF8,
  }));
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Sharing is unavailable.");
  }
  await Sharing.shareAsync(uri, {
    dialogTitle: "Lưu bản export Picket",
    mimeType: "application/json",
    UTI: "public.json",
  });
}
