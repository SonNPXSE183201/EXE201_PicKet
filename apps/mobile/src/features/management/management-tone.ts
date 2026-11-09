import type { IconName } from "@/core/ui/app-icon";

/** Pick a stroke icon for a bill / subscription from its title (Figma tiles use stroke icons, no art). */
export function titleIcon(title: string): IconName {
  const text = title.toLowerCase();
  if (/điện|dien|electric/.test(text)) return "lightning-bolt-outline";
  if (/nước|nuoc|water/.test(text)) return "water-outline";
  if (/nhà|nha |rent|home/.test(text)) return "home-outline";
  if (/internet|wifi|mạng|mang/.test(text)) return "wifi";
  if (/điện thoại|phone|data|4g|5g/.test(text)) return "cellphone";
  if (/netflix|youtube|spotify|music|phim|video/.test(text)) return "play-circle-outline";
  if (/gym|fitness|yoga/.test(text)) return "dumbbell";
  if (/cloud|icloud|drive|storage/.test(text)) return "cloud-outline";
  return "receipt-text-outline";
}

export function toneAt<T>(list: readonly T[], index: number): T { return list[index % list.length]; }

/** Whole days from now to the due date (negative when overdue). */
export function daysUntil(iso: string, now = Date.now()): number {
  return Math.ceil((new Date(iso).getTime() - now) / 86_400_000);
}
