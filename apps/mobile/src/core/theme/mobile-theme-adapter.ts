import type { AppTheme } from "./themes";
/** Compatibility roles while individual screens migrate to semantic names. */
const isLight = (hex: string) => hex.length === 7 && parseInt(hex.slice(1, 3), 16) > 200;
export function mobileThemeColors(theme: AppTheme) {
  return { ...theme, paper: isLight(theme.canvas) ? "#FFFFFF" : theme.surface, cream: theme.canvas, white: theme.surface, onPrimary: theme.onPrimary, peach: theme.elevated,
    coral: theme.elevated, mauve: theme.primary, ink: theme.text, muted: theme.muted,
    line: theme.border, expense: theme.expense, income: theme.income,
    successSurface: theme.successSurface, dangerSurface: theme.dangerSurface };
}
export type MobileThemeColors = ReturnType<typeof mobileThemeColors>;
