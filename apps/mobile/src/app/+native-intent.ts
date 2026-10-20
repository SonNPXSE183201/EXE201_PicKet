import * as Linking from "expo-linking";
import { Platform } from "react-native";
import { bootstrapIntentGate, latestInitialNativeIntent } from "@/core/navigation/bootstrap-intent";

export function redirectSystemPath(intent: { path: string; initial: boolean }) {
  if (intent.initial && Platform.OS === "android") {
    // RN's Activity intent can still contain the first VIEW URL, whereas Expo
    // records onNewIntent even before JS listeners exist. This awaits native
    // linking only, never AuthProvider or the navigator it is about to mount.
    return Linking.getInitialURL().then(activityUrl => latestInitialNativeIntent(intent.path, activityUrl, Linking.getLinkingURL())).catch(() => intent.path);
  }
  return bootstrapIntentGate.redirect(intent);
}
