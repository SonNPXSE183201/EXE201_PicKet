import { PicketText as Text } from "@/core/ui/picket-text";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import { useAppTheme } from "@/features/settings/appearance-provider";
import { useTranslation } from "react-i18next";
import { localeFor } from "@/core/i18n/formatters";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, AppState, StyleSheet, View } from "react-native";
import { AppIcon } from "@/core/ui/app-icon";
import { FigmaButton, figmaShadow } from "@/core/ui/figma-ui";
import { figmaType } from "@picket/design-tokens";
import { GroupLabel } from "@/features/settings/settings-figma";
import { androidAppUpdates, getInstalledAppInfo } from "./android-app-updates";
import { createAppUpdateController, type UpdateSnapshot } from "./app-update-controller";
import { installedVersionLabel } from "./app-update-policy";
import { showUpdateCheck } from "./update-action-policy";

export function InstalledVersion() {
  const {language}=useAppTheme();
  const { styles } = useMobileStyles(createStyles);
  const [installed] = useState(getInstalledAppInfo);
  return <Text selectable style={styles.footer}>{installedVersionLabel(installed,language)}</Text>;
}
export function AppUpdateSection() {
  const {t}=useTranslation("updates");
  const {language}=useAppTheme();
  const { colors, styles } = useMobileStyles(createStyles);
  const [state, setState] = useState<UpdateSnapshot>({ phase: "idle", progress: 0 });
  const [controller] = useState(() => createAppUpdateController(androidAppUpdates, setState));
  useEffect(() => {
    controller.activate();
    const listener = AppState.addEventListener("change", next => { if (next === "active") controller.refreshPermission(); });
    return () => { listener.remove(); controller.dispose(); };
  }, [controller]);
  const busy = state.phase === "checking" || state.phase === "downloading" || state.phase === "opening-installer";
  const description=t(state.phase,{version:state.release?.version??"",size:new Intl.NumberFormat(localeFor(language),{minimumFractionDigits:1,maximumFractionDigits:1}).format((state.release?.bytes??0)/1_000_000)});
  const permissions = () => Alert.alert(t("permissionTitle"),t("permissionBody"), [
    { text: t("later"), style: "cancel" }, { text: t("settings"), onPress: () => void controller.openSettings() },
  ]);
  return <>
    <View style={styles.group}><GroupLabel>{t("section")}</GroupLabel></View>
    <View style={[styles.card, figmaShadow("paper")]}>
      <View style={styles.heading}><AppIcon name="cellphone-arrow-down" /><Text accessibilityRole="header" style={styles.title}>{t("title")}</Text></View>
      <Text accessibilityLiveRegion="polite" style={styles.description}>{description}</Text>
      {busy && <ActivityIndicator color={colors.link} accessibilityLabel={t(state.phase === "checking" ? "checkingLabel" : state.phase === "opening-installer" ? "installerLabel" : "downloadingLabel")} />}
      {state.phase === "downloading" && <View accessibilityRole="progressbar" accessibilityLabel={t("progress")} accessibilityValue={{ min: 0, max: 100, now: state.progress }}><Text style={styles.percent}>{state.progress}%</Text></View>}
      {state.phase === "available" && state.release?.required && <Text accessibilityRole="alert" style={styles.description}>{t("required")}</Text>}
      {state.phase === "available" && <Action label={t("download")} onPress={() => void controller.download()} />}
      {state.phase === "downloading" && <Action label={t("cancel")} secondary onPress={() => controller.cancel()} />}
      {state.phase === "permission" && <Action label={t("allow")} onPress={permissions} />}
      {["ready", "installer-opened"].includes(state.phase) && <Action label={t(state.phase === "ready" ? "install" : "reopen")} onPress={() => void controller.install()} />}
      {state.phase === "play-store" && <Action label={t("store")} onPress={() => void controller.openStore()} />}
      {showUpdateCheck(state.phase) && <Action label={t(state.phase === "idle" ? "check" : "recheck")} secondary onPress={() => void controller.check()} />}
    </View>
  </>;
}
function Action({ label, onPress, secondary = false, disabled = false }: { label: string; onPress(): void; secondary?: boolean; disabled?: boolean }) {
  return <FigmaButton fullWidth variant={secondary ? "outline" : "primary"} size="medium" disabled={disabled} label={label} onPress={onPress} style={{ marginTop: 8 }} />;
}
const createStyles = (colors: MobileThemeColors) => StyleSheet.create({
  group: { marginTop: 24, marginBottom: 8 },
  card: { backgroundColor: colors.paper, borderRadius: 18, padding: 16 },
  heading: { flexDirection: "row", alignItems: "center", gap: 10 }, title: { ...figmaType.bodyStrong, flex: 1, color: colors.ink },
  description: { ...figmaType.bodySmall, color: colors.muted, marginVertical: 12 }, percent: { ...figmaType.captionStrong, textAlign: "center", color: colors.link, marginBottom: 8 },
  footer: { ...figmaType.captionStrong, color: colors.muted, textAlign: "center", paddingVertical: 20, paddingHorizontal: 16 },
});
