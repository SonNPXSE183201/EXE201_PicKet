import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { figmaType } from "@picket/design-tokens";
import { PicketText as Text } from "@/core/ui/picket-text";
import { Chip, FigmaButton, figmaShadow } from "@/core/ui/figma-ui";
import { useAppTheme } from "@/features/settings/appearance-provider";
import { showGate } from "./update-schedule";
import { useAppUpdate } from "./use-app-update";

/** Full-screen blocker that overlays the whole app while a required update is pending. */
export function AppUpdateGate() {
  const { t } = useTranslation("updates");
  const { colors } = useAppTheme();
  const update = useAppUpdate();
  const { state } = update;
  if (!showGate(state, update.required)) return null;
  const downloading = state.kind === "downloading";
  const permission = state.kind === "needs-user-action" && state.action === "openSettings";
  const confirm = state.kind === "needs-user-action" && state.action === "install";
  const status = downloading ? t("gateDownloading", { progress: state.progress }) : permission ? t("gatePermission") : state.kind === "failed" ? t("gateFailed") : null;
  const primary = permission
    ? { label: t("gateOpenSettings"), onPress: update.openSettings }
    : confirm || state.kind === "downloaded"
      ? { label: t("gateInstall"), onPress: update.install }
      : state.kind === "failed"
        ? { label: t("gateRetry"), onPress: update.startRequired }
        : { label: t("gateUpdate"), onPress: update.startRequired };
  return (
    <View style={[StyleSheet.absoluteFill, styles.gate, { backgroundColor: colors.canvas }]} accessibilityViewIsModal importantForAccessibility="yes">
      <View style={[styles.card, { backgroundColor: colors.surface }, figmaShadow("paper")]}>
        <Chip size="small" tone="warning" label={t("gateTitle")} style={styles.chip} />
        <Text accessibilityRole="header" style={[figmaType.titleSection, { color: colors.text }]}>{t("gateTitle")}</Text>
        <Text style={[figmaType.bodySmall, { color: colors.muted }]}>{t("gateBody")}</Text>
        {status && <Text accessibilityLiveRegion="polite" accessibilityRole={state.kind === "failed" ? "alert" : undefined} style={[figmaType.bodySmall, { color: colors.text }]}>{status}</Text>}
        {downloading && (
          <View accessibilityRole="progressbar" accessibilityLabel={t("progress")} accessibilityValue={{ min: 0, max: 100, now: state.progress }} style={[styles.track, { backgroundColor: colors.border }]}>
            <View style={[styles.fill, { backgroundColor: colors.link, width: `${state.progress}%` }]} />
          </View>
        )}
        {!downloading && <FigmaButton fullWidth label={primary.label} onPress={primary.onPress} />}
        {update.isPlayChannel && !downloading && <FigmaButton fullWidth variant="outline" label={t("gateStore")} onPress={update.openStore} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  gate: { justifyContent: "center", padding: 20, zIndex: 1000, elevation: 1000 },
  card: { borderRadius: 22, borderBottomLeftRadius: 10, padding: 20, gap: 12 },
  chip: { alignSelf: "flex-start" },
  track: { height: 8, borderRadius: 4, overflow: "hidden" },
  fill: { height: 8, borderRadius: 4 },
});
