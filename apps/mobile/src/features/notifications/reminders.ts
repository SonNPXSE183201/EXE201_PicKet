import type { Bill, Budget, FinanceSubscription, Transaction, TransactionSplit } from "@picket/domain";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";

import type { Keepsake } from "@/features/keepsakes/keepsake-store";
import { budgetWarnings } from "./budget-warnings";
import { createBudgetNoticeDelivery, scheduleOwnedReminder } from "./budget-notice-delivery";

Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }) });

export interface ReminderItem {
  id: string;
  label: string;
  dueAt: string;
  notifyAt: Date | null;
}

const settingsKey = (userId: string) => `picket_reminders_${userId.replace(/[^a-zA-Z0-9]/g, "_")}`;
const readKey = (userId: string) => `picket_reminder_read_${userId.replace(/[^a-zA-Z0-9]/g, "_")}`;
const prefix = (userId: string) => `picket-${userId}-`;
const deliveredKey = (userId: string) => `picket_budget_delivered_${userId.replace(/[^a-zA-Z0-9]/g, "_")}`;
const budgetNoticeDelivery = createBudgetNoticeDelivery({
  read: async userId => {
    const raw = await SecureStore.getItemAsync(deliveredKey(userId));
    const value: unknown = JSON.parse(raw ?? "[]");
    if (!Array.isArray(value) || value.some(id => typeof id !== "string")) throw new Error("Invalid budget delivery ledger.");
    return value;
  },
  save: (userId, ids) => SecureStore.setItemAsync(deliveredKey(userId), JSON.stringify(ids)),
  show: async (userId, id, isCurrent) => {
    const identifier = `${prefix(userId)}${id}`;
    await Notifications.scheduleNotificationAsync({ identifier,
      content: { title: "Picket · Ngân sách", body: "Một ngân sách đã chạm ngưỡng cảnh báo. Mở Picket để kiểm tra." },
      trigger: { channelId: "picket-reminders" },
    });
    if (!isCurrent()) await Notifications.dismissNotificationAsync(identifier);
  },
});

export async function remindersEnabled(userId: string) {
  return (await SecureStore.getItemAsync(settingsKey(userId))) === "enabled";
}
export async function setRemindersEnabled(userId: string, enabled: boolean) {
  if (enabled) {
    await Notifications.setNotificationChannelAsync("picket-reminders", {
      name: "Nhắc việc Picket", importance: Notifications.AndroidImportance.DEFAULT,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
    });
    const permission = await Notifications.requestPermissionsAsync();
    if (!permission.granted) return false;
    await SecureStore.setItemAsync(settingsKey(userId), "enabled");
  } else {
    await SecureStore.deleteItemAsync(settingsKey(userId));
    await cancelUserReminders(userId, true);
  }
  return true;
}
export async function readReminderIds(userId: string): Promise<string[]> {
  const raw = await SecureStore.getItemAsync(readKey(userId));
  try { const value = JSON.parse(raw ?? "[]"); return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; }
  catch { return []; }
}
export async function markReminderRead(userId: string, id: string) {
  const ids = new Set(await readReminderIds(userId));
  ids.add(id);
  await SecureStore.setItemAsync(readKey(userId), JSON.stringify([...ids].slice(-500)));
}

function notifyDate(iso: string, daysBefore: number): Date | null {
  const due = new Date(iso);
  if (Number.isNaN(due.getTime())) return null;
  const date = new Date(due.getFullYear(), due.getMonth(), due.getDate() - daysBefore, 9);
  return date > new Date() ? date : null;
}

export function collectReminders(input: { bills: Bill[]; subscriptions: FinanceSubscription[]; keepsakes: Keepsake[]; budgets: Budget[]; transactions: Transaction[]; periodLimits?: Record<string, number>; splits?: TransactionSplit[] }): ReminderItem[] {
  const notices: ReminderItem[] = [];
  const now = Date.now();
  for (const bill of input.bills) {
    if (bill.status === "paid" || bill.status === "cancelled" || bill.paidTransactionId) continue;
    const due = new Date(bill.dueAt).getTime();
    if (Number.isFinite(due) && due >= now - 86400000) notices.push({ id:`bill:${bill.id}:${bill.dueAt}`, label:`${bill.title} · hạn ${new Date(bill.dueAt).toLocaleDateString("vi-VN")}`, dueAt:bill.dueAt, notifyAt:notifyDate(bill.dueAt, 1) });
  }
  for (const plan of input.subscriptions) {
    if (!plan.active) continue;
    const due = new Date(plan.nextDueAt).getTime();
    if (Number.isFinite(due) && due >= now - 86400000) notices.push({ id:`sub:${plan.id}:${plan.nextDueAt}`, label:`${plan.title} sắp đến kỳ thanh toán`, dueAt:plan.nextDueAt, notifyAt:notifyDate(plan.nextDueAt, plan.alertDays) });
  }
  for (const item of input.keepsakes) {
    for (const [kind, iso] of [["return", item.returnUntil], ["warranty", item.warrantyUntil]] as const) {
      if (!iso) continue;
      const due = new Date(`${iso}T12:00:00`).getTime();
      if (Number.isFinite(due) && due >= now) notices.push({ id:`${kind}:${item.id}:${iso}`, label:`${item.title} sắp hết hạn ${kind === "return" ? "đổi trả" : "bảo hành"}`, dueAt:iso, notifyAt:notifyDate(`${iso}T12:00:00`, kind === "return" ? 1 : 7) });
    }
  }
  const month = new Date().toISOString().slice(0, 7);
  for (const budget of budgetWarnings({ ...input, month })) {
    notices.push({ id:`budget:${budget.id}:${month}`, label:`${budget.name} đã chạm ngưỡng cảnh báo`, dueAt:new Date().toISOString(), notifyAt:null });
  }
  return notices;
}

export async function cancelUserReminders(userId: string, dismissPresented = false) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const item of scheduled) if (item.identifier.startsWith(prefix(userId))) await Notifications.cancelScheduledNotificationAsync(item.identifier);
  if (dismissPresented) {
    for (const item of await Notifications.getPresentedNotificationsAsync()) {
      if (item.request.identifier.startsWith(prefix(userId))) await Notifications.dismissNotificationAsync(item.request.identifier);
    }
  }
}

let scheduling: Promise<void> = Promise.resolve();
export function scheduleUserReminders(userId: string, items: ReminderItem[], isCurrent = () => true) {
  const operation = scheduling.catch(() => undefined).then(() => scheduleNow(userId, items, isCurrent));
  scheduling = operation;
  return operation;
}
async function scheduleNow(userId: string, items: ReminderItem[], isCurrent: () => boolean) {
  if (!isCurrent()) return;
  await cancelUserReminders(userId);
  if (!(await remindersEnabled(userId)) || !isCurrent()) return;
  await Notifications.setNotificationChannelAsync("picket-reminders", {
    name: "Nhắc việc Picket", importance: Notifications.AndroidImportance.DEFAULT,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
  });
  for (const item of items.filter((entry) => entry.notifyAt !== null && entry.notifyAt > new Date()).slice(0, 50)) {
    if (!isCurrent()) return;
    const scheduled = await scheduleOwnedReminder(`${prefix(userId)}${item.id}`, isCurrent, {
      schedule: async identifier => {
        await Notifications.scheduleNotificationAsync({ identifier,
          content: { title: "Picket · Nhắc việc", body: "Bạn có khoản thanh toán hoặc hạn món đồ cần xem. Mở Picket để kiểm tra." },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: item.notifyAt!, channelId: "picket-reminders" },
        });
      },
      cancel: identifier => Notifications.cancelScheduledNotificationAsync(identifier),
    });
    if (!scheduled) return;
  }
  await budgetNoticeDelivery.deliver(userId, items.map(item => item.id), isCurrent);
}
