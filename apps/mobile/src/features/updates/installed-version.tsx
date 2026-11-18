import { StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { figmaType } from "@picket/design-tokens";
import { PicketText as Text } from "@/core/ui/picket-text";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { useAppTheme } from "@/features/settings/appearance-provider";
import { installedVersionLabel } from "./app-update-policy";
import { useAppUpdate } from "./use-app-update";
import type { UpdateState } from "./update-schedule";

export function updateStatusKey(state: UpdateState, required: boolean) {
  if (required && state.kind !== "none") return "statusRequired" as const;
  switch (state.kind) {
    case "available": return "statusAvailable" as const;
    case "required": return "statusRequired" as const;
    case "downloading": return "statusDownloading" as const;
    case "downloaded": return "statusDownloaded" as const;
    case "needs-user-action": return "statusAction" as const;
    case "failed": return "statusFailed" as const;
    default: return "statusCurrent" as const;
  }
}

/** Installed version line plus a short update status, shown at the bottom of Profile. */
export function InstalledVersion() {
  const { language } = useAppTheme();
  const { t } = useTranslation("updates");
  const { styles } = useMobileStyles(createStyles);
  const { installed, state, required } = useAppUpdate();
  const status = installed ? t(updateStatusKey(state, required)) : "";
  return <Text selectable style={styles.footer}>{installedVersionLabel(installed, language)}{status ? `\n${status}` : ""}</Text>;
}

const createStyles = (colors: MobileThemeColors) => StyleSheet.create({
  footer: { ...figmaType.captionStrong, color: colors.muted, textAlign: "center", paddingVertical: 20, paddingHorizontal: 16 },
});
