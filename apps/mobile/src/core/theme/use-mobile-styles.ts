import { useMemo } from "react";
import { useAppTheme } from "@/features/settings/appearance-provider";
import { mobileThemeColors, type MobileThemeColors } from "./mobile-theme-adapter";
export function useMobileStyles<T>(factory: (colors: MobileThemeColors) => T) {
  const { colors: semantic, theme } = useAppTheme();
  const colors = useMemo(() => mobileThemeColors(semantic), [semantic]);
  const styles = useMemo(() => factory(colors), [colors, factory]);
  return { colors, styles, theme };
}
