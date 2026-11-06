import { createContext, type PropsWithChildren, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState, useColorScheme } from "react-native";
import * as Localization from "expo-localization";
import * as SecureStore from "expo-secure-store";
import * as SplashScreen from "expo-splash-screen";
import * as SystemUI from "expo-system-ui";
import { I18nextProvider } from "react-i18next";
import { createAppI18n } from "@/core/i18n/instance";
import { colorSchemes } from "@/core/theme/color-schemes";
import { createSettingsStore, resolveAppearance, resolveSettingsScheme, type AppearanceDefaults, type DeviceSettings } from "./device-settings";
import { isExistingInstall } from "./installation-history";

const settingsKey = "picket_device_appearance_v1";
const store = createSettingsStore({ read: () => SecureStore.getItemAsync(settingsKey), write: value => SecureStore.setItemAsync(settingsKey, value), isExistingInstall });
function useAppearanceState() {
  const scheme = useColorScheme();
  const [locale, setLocale] = useState(() => Localization.getLocales()[0]?.languageTag ?? "vi");
  const [settings, setSettings] = useState<DeviceSettings>({ version: 1 });
  const [accountDefaults, setAccountDefaults] = useState<AppearanceDefaults>({});
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [saving, setSaving] = useState(false);
  const [i18n] = useState(() => createAppI18n("vi"));
  const latest = useRef(settings);
  const pending = useRef<Promise<void>>(Promise.resolve());
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    let active = true;
    void store.load().then(value => { if (active) { latest.current = value; setSettings(value); setError(false); } })
      .catch(() => { if (active) setError(true); }).finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, [revision]);
  useEffect(() => {
    const listener = AppState.addEventListener("change", state => { if (state === "active") setLocale(Localization.getLocales()[0]?.languageTag ?? "vi"); });
    return () => listener.remove();
  }, []);
  const appearance = resolveAppearance(settings, accountDefaults, { theme: scheme === "dark" ? "dark" : "light", locale });
  const colorSchemeId = resolveSettingsScheme(settings, accountDefaults);
  const themeMode = settings.themeMode ?? accountDefaults.themeMode ?? accountDefaults.theme ?? "system";
  const colors = colorSchemes[colorSchemeId][appearance.theme];
  useEffect(() => {
    void i18n.changeLanguage(appearance.language);
  }, [appearance.language, i18n]);
  useEffect(() => { if (ready) void SplashScreen.hideAsync(); }, [ready]);
  useEffect(() => { if (ready) void SystemUI.setBackgroundColorAsync(colors.canvas).catch(() => undefined); }, [colors.canvas, ready]);
  async function update(patch: Omit<Partial<DeviceSettings>, "version">) {
    if (!ready || error) throw new Error("Settings are unavailable");
    setSaving(true);
    const operation = pending.current.catch(() => undefined).then(async () => {
      const next = { ...latest.current, ...patch };
      await store.save(next);
      latest.current = next;
      if (alive.current) setSettings(next);
    });
    pending.current = operation;
    try { await operation; } finally { if (alive.current && pending.current === operation) setSaving(false); }
  }
  return { settings, ready, error, saving, update, setAccountDefaults, colorSchemeId, themeMode,
    retry: () => setRevision(value => value + 1), ...appearance, colors, i18n };
}
type AppearanceValue = ReturnType<typeof useAppearanceState>;
const Context = createContext<AppearanceValue | null>(null);
export function AppAppearanceProvider({ children }: PropsWithChildren) {
  const value = useAppearanceState();
  return <Context.Provider value={value}><I18nextProvider i18n={value.i18n}>{value.ready ? children : null}</I18nextProvider></Context.Provider>;
}
export function useAppTheme() {
  const value = useContext(Context);
  if (!value) throw new Error("AppAppearanceProvider is missing");
  return value;
}
export function useThemedStyles<T>(factory: (colors: AppearanceValue["colors"]) => T): T {
  const { colors } = useAppTheme();
  return useMemo(() => factory(colors), [colors, factory]);
}
