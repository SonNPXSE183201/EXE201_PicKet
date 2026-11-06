import { languages, languageCodes, type AppLanguage } from "./languages";
export type { AppLanguage } from "./languages";
export function normalizeLanguage(locale?: string | null): AppLanguage {
  const base = locale?.toLowerCase().split(/[-_]/)[0];
  return languageCodes.find(code => code === base) ?? "vi";
}
export const localeFor = (language: AppLanguage) => languages[language].locale;
export function localCalendarDay(date: Date = new Date()): string {
  if (!Number.isFinite(date.getTime())) throw new Error("Invalid calendar date");
  return `${String(date.getFullYear()).padStart(4, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function formatMoney(amount: number, language: AppLanguage, currency: string): string {
  if (!Number.isFinite(amount) || !/^[A-Z]{3}$/.test(currency)) throw new Error("Invalid money value");
  return new Intl.NumberFormat(localeFor(language), { style: "currency", currency }).format(amount);
}
export function formatCalendarDate(value: string, language: AppLanguage): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error("Invalid calendar date");
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) throw new Error("Invalid calendar date");
  return new Intl.DateTimeFormat(localeFor(language), { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "UTC" }).format(date);
}
export function formatInstant(value: string, language: AppLanguage, timeZone: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error("Invalid instant");
  return new Intl.DateTimeFormat(localeFor(language), { dateStyle: "medium", timeStyle: "short", timeZone }).format(date);
}
