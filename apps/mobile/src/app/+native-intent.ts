import * as Linking from "expo-linking";
import { Platform } from "react-native";
import { bootstrapIntentGate, latestInitialNativeIntent } from "@/core/navigation/bootstrap-intent";

export function redirectSystemPath(intent: { path: string; initial: boolean }) {
  if (intent.initial && Platform.OS === "android") {
    // MainActivity retains its newest Intent through the prebuild plugin.
    // Do not prefer Expo's older process-static URL after configuration changes.
    // This awaits native linking only, never auth or the not-yet-mounted Stack.
    return Linking.getInitialURL().then(activityUrl => latestInitialNativeIntent(intent.path, activityUrl)).catch(() => intent.path);
  }
  return bootstrapIntentGate.redirect(intent);
}
