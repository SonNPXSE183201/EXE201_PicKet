import type { AppTheme } from "./themes";
/** Compatibility roles while individual screens migrate to semantic names. */
export function mobileThemeColors(theme: AppTheme) {
  return { ...theme, cream: theme.canvas, white: theme.surface, onPrimary: theme.onPrimary, peach: theme.elevated,
    coral: theme.elevated, mauve: theme.primary, ink: theme.text, muted: theme.muted,
    line: theme.border, expense: theme.expense, income: theme.income,
    successSurface: theme.successSurface, dangerSurface: theme.dangerSurface };
}
export type MobileThemeColors = ReturnType<typeof mobileThemeColors>;
