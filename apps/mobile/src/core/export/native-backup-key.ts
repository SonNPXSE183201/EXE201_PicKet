import { requireOptionalNativeModule } from "expo";
import { fromByteArray, toByteArray } from "base64-js";
import { configureNativeBackupKey } from "./backup-key-derivation";
import { Platform } from "react-native";

const native = requireOptionalNativeModule<{ deriveBackupKey(password: string, salt: string): Promise<string> }>("PicketBackupCrypto");
if (native && (Platform.OS !== "android" || Number(Platform.Version) >= 26)) {
  configureNativeBackupKey(async (password, salt) => toByteArray(await native.deriveBackupKey(fromByteArray(new TextEncoder().encode(password)), fromByteArray(salt))));
} else if (!native && Platform.OS === "android") {
  configureNativeBackupKey(async () => { throw new Error("Hãy cài APK Picket mới nhất để dùng sao lưu mã hóa."); });
}
