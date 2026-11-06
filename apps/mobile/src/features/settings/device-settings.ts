import { normalizeLanguage } from "../../core/i18n/formatters";
import type { AppLanguage } from "../../core/i18n/languages";
import { resolveColorScheme } from "../../core/theme/color-schemes";
export type ThemeMode = "system" | "light" | "dark";
export type LanguageMode = "system" | AppLanguage;
export type DeviceSettings = { version: 1; themeMode?: ThemeMode; languageMode?: string; colorSchemeId?: string };
export type AppearanceDefaults = { theme?: "light" | "dark"; locale?: string | null; themeMode?: ThemeMode | null; languageMode?: string | null; colorSchemeId?: string | null };
export function parseDeviceSettings(raw: string | null): DeviceSettings {
  if (raw === null) return { version: 1 };
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid device settings");
  const data = value as Record<string, unknown>;
  if (data.version !== 1 || (data.themeMode !== undefined && !["system", "light", "dark"].includes(String(data.themeMode))) ||
    (data.languageMode !== undefined && (typeof data.languageMode!=="string" || (data.languageMode!=="system" && !/^[a-z]{2,3}(-[A-Z]{2})?$/.test(data.languageMode))))) throw new Error("Unsupported device settings");
  if (data.colorSchemeId !== undefined && (typeof data.colorSchemeId !== "string" || !/^[a-z][a-z0-9_-]{0,63}$/.test(data.colorSchemeId))) throw new Error("Invalid color scheme");
  return { version: 1, ...(data.themeMode === undefined ? {} : { themeMode: data.themeMode as ThemeMode }), ...(data.languageMode === undefined ? {} : { languageMode: data.languageMode as string }), ...(data.colorSchemeId === undefined ? {} : { colorSchemeId: data.colorSchemeId as string }) };
}
export function resolveAppearance(device: DeviceSettings, account: AppearanceDefaults, system: AppearanceDefaults) {
  const themeMode = device.themeMode ?? account.themeMode ?? account.theme;
  const languageMode = device.languageMode ?? account.languageMode;
  return {
    theme: themeMode === "system" ? system.theme ?? "light" : themeMode ?? system.theme ?? "light",
    language: languageMode === "system" ? normalizeLanguage(system.locale) : normalizeLanguage(languageMode ?? account.locale ?? system.locale),
  };
}
export function resolveSettingsScheme(device: DeviceSettings, account: AppearanceDefaults) {
  return resolveColorScheme(device.colorSchemeId ?? account.colorSchemeId ?? "paper");
}
export function createSettingsStore(storage: { read(): Promise<string | null>; write(value: string): Promise<void>; isExistingInstall?(): Promise<boolean> }) {
  let pending: Promise<void> = Promise.resolve();
  return {
    async load() {
      await pending.catch(() => undefined);
      const raw = await storage.read();
      if (raw !== null || !storage.isExistingInstall) return parseDeviceSettings(raw);
      const value: DeviceSettings = await storage.isExistingInstall()
        ? { version: 1 } : { version: 1, colorSchemeId: "paper", themeMode: "system" };
      await storage.write(JSON.stringify(value));
      return value;
    },
    save(value: DeviceSettings) {
      const serialized = JSON.stringify(parseDeviceSettings(JSON.stringify(value)));
      const operation = pending.catch(() => undefined).then(() => storage.write(serialized));
      pending = operation;
      return operation;
    },
  };
}
