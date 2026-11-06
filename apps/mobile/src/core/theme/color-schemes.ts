import { paperLight, paperDark, lightTheme, darkTheme, nomadLight, nomadDark, oceanLight, oceanDark, type AppTheme } from "./themes";
export const colorSchemes = {
  paper: { name: "Picket Paper", light: paperLight, dark: paperDark },
  nomad: { name: "Nomad", light: nomadLight, dark: nomadDark },
  rose: { name: "Rose", light: lightTheme, dark: darkTheme },
  ocean: { name: "Ocean", light: oceanLight, dark: oceanDark },
} satisfies Record<string, { name: string; light: AppTheme; dark: AppTheme }>;
export type ColorSchemeId = keyof typeof colorSchemes;
export const colorSchemeIds = Object.keys(colorSchemes) as ColorSchemeId[];
export function resolveColorScheme(id?: string) { return colorSchemeIds.find(code => code === id) ?? "paper"; }
