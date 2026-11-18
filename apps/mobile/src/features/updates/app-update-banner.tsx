import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { figmaType } from "@picket/design-tokens";
import { PicketText as Text } from "@/core/ui/picket-text";
import { FigmaButton, figmaShadow } from "@/core/ui/figma-ui";
import { useAppTheme } from "@/features/settings/appearance-provider";
import { showBanner } from "./update-schedule";
import { useAppUpdate } from "./use-app-update";

/** Small Home card for optional updates: downloading, downloaded, needs a tap, or failed. */
export function AppUpdateBanner() {
  const { t } = useTranslation("updates");
  const { colors } = useAppTheme();
  const update = useAppUpdate();
  const { state } = update;
  if (!showBanner(state, update.required)) return null;
  let title = "", body = "", action: { label: string; onPress(): void } | null = null;
  let progress: number | null = null;
  if (state.kind === "available") {
    title = t("bannerAvailableTitle"); body = update.isPlayChannel ? t("bannerAvailablePlay") : t("bannerAvailable");
    action = { label: update.isPlayChannel ? t("gateUpdate") : t("bannerDownloadAction"), onPress: update.download };
  } else if (state.kind === "downloading") {
    title = t("bannerDownloadingTitle"); body = t("bannerDownloading", { progress: state.progress }); progress = state.progress;
  } else if (state.kind === "downloaded") {
    title = t("bannerDownloadedTitle");
    body = t("bannerDownloaded");
    action = update.isPlayChannel ? { label: t("bannerRestart"), onPress: update.restart } : { label: t("bannerRestart"), onPress: update.install };
  } else if (state.kind === "needs-user-action") {
    title = t("bannerInstallTitle");
    body = state.action === "openSettings" ? t("bannerPermission") : t("bannerInstall");
    action = state.action === "openSettings"
      ? { label: t("bannerPermissionAction"), onPress: update.openSettings }
      : { label: t("bannerInstallAction"), onPress: update.install };
  } else if (state.kind === "failed") {
    title = t("bannerFailedTitle"); body = t("bannerFailed"); action = { label: t("bannerRetry"), onPress: update.retry };
  }
  return (
    <View accessibilityLiveRegion="polite" style={[styles.card, { backgroundColor: colors.surface, borderLeftColor: state.kind === "failed" ? colors.expense : colors.link }, figmaShadow("paper")]}>
      <Text accessibilityRole="header" style={[figmaType.bodyStrong, { color: colors.text }]}>{title}</Text>
      <Text style={[figmaType.bodySmall, { color: colors.muted }]}>{body}</Text>
      {progress !== null && (
        <View accessibilityRole="progressbar" accessibilityLabel={t("progress")} accessibilityValue={{ min: 0, max: 100, now: progress }} style={[styles.track, { backgroundColor: colors.border }]}>
          <View style={[styles.fill, { backgroundColor: colors.link, width: `${progress}%` }]} />
        </View>
      )}
      {action && <View style={styles.actions}><FigmaButton size="medium" label={action.label} onPress={action.onPress} /></View>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderLeftWidth: 4, padding: 16, gap: 6, marginBottom: 12 },
  actions: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 4 },
  track: { height: 6, borderRadius: 3, overflow: "hidden", marginTop: 4 },
  fill: { height: 6, borderRadius: 3 },
});
