/** Strings introduced by the Figma notification redesign (kept beside the feature, not in shared i18n resources). */
const copy = {
  vi: { emptyTitle: "Không có thông báo mới", emptyBody: "Nhắc hạn hoá đơn và túi sắp chạm hạn mức sẽ hiện ở đây.", readAll: "Đánh dấu đã đọc hết" },
  en: { emptyTitle: "No new notifications", emptyBody: "Bill due-date reminders and pockets nearing their limit will show up here.", readAll: "Mark all as read" },
} as const;

export function notificationScreenCopy(language: string) {
  return language === "en" ? copy.en : copy.vi;
}
