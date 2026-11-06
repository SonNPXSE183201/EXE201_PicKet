import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import type { AppLanguage } from "./formatters";
import { languages, languageCodes } from "./languages";
export function createAppI18n(language: AppLanguage) {
  const instance = createInstance();
  const resources = Object.fromEntries(languageCodes.map(code => {
    const { name, locale, direction, ...namespaces } = languages[code];
    void name; void locale; void direction;
    return [code,namespaces];
  }));
  void instance.use(initReactI18next).init({ resources, lng: language, fallbackLng: "vi", supportedLngs: languageCodes,
    initAsync: false, keySeparator: false, interpolation: { escapeValue: false }, react: { useSuspense: false } });
  return instance;
}
