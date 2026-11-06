import type { Bill, Budget, FinanceSubscription, Transaction, TransactionSplit } from "@picket/domain";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";

import type { Keepsake } from "@/features/keepsakes/keepsake-store";
import { budgetWarnings } from "./budget-warnings";
import { createBudgetNoticeDelivery, scheduleOwnedReminder } from "./budget-notice-delivery";
import type { AppLanguage } from "@/core/i18n/formatters";
import { privateReminderCopy,reminderLabel } from "./notification-copy";
import { withLocalOwnerAccess, isOfflineCacheOwnerRetired } from "@/core/sync/offline-cache";
import { ownerPreferenceKeys, isOwnerReminder, purgeOwnerPreferences } from "@/core/storage/owner-preferences";

Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }) });

export interface ReminderItem {
  id: string;
  label: string;
  dueAt: string;
  notifyAt: Date | null;
}

const settingsKey = (userId: string) => ownerPreferenceKeys(userId).reminders;
const readKey = (userId: string) => ownerPreferenceKeys(userId).reminderRead;
const prefix = (userId: string) => `picket-${userId}-`;
const deliveredKey = (userId: string) => ownerPreferenceKeys(userId).budgetDelivered;
const budgetNoticeDelivery = createBudgetNoticeDelivery<AppLanguage>({
  read: async userId => {
    const raw = await SecureStore.getItemAsync(deliveredKey(userId));
    const value: unknown = JSON.parse(raw ?? "[]");
    if (!Array.isArray(value) || value.some(id => typeof id !== "string")) throw new Error("Invalid budget delivery ledger.");
    return value;
  },
  save: (userId, ids) => SecureStore.setItemAsync(deliveredKey(userId), JSON.stringify(ids)),
  show: async (userId, id, isCurrent, language="vi") => {
    const identifier = `${prefix(userId)}${id}`;
    await Notifications.scheduleNotificationAsync({ identifier,
      content: { title:privateReminderCopy("budget",language).title, body:privateReminderCopy("budget",language).body },
      trigger: { channelId: "picket-reminders" },
    });
    if (!isCurrent()) await Notifications.dismissNotificationAsync(identifier);
  },
});

async function storedRemindersEnabled(userId: string) {
  return (await SecureStore.getItemAsync(settingsKey(userId))) === "enabled";
}
export function remindersEnabled(userId:string){return withLocalOwnerAccess(userId,()=>storedRemindersEnabled(userId));}
export async function setRemindersEnabled(userId: string, enabled: boolean,language:AppLanguage="vi") {
  return withLocalOwnerAccess(userId,async()=>{
  if (enabled) {
    await Notifications.setNotificationChannelAsync("picket-reminders", {
      name: privateReminderCopy("reminder",language).channel, importance: Notifications.AndroidImportance.DEFAULT,
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
  });
}
async function storedReminderIds(userId: string): Promise<string[]> {
  const raw = await SecureStore.getItemAsync(readKey(userId));
  try { const value = JSON.parse(raw ?? "[]"); return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; }
  catch { return []; }
}
export function readReminderIds(userId:string){return withLocalOwnerAccess(userId,()=>storedReminderIds(userId));}
export async function markReminderRead(userId: string, id: string) {
  return withLocalOwnerAccess(userId,async()=>{
  const ids = new Set(await storedReminderIds(userId));
  ids.add(id);
  await SecureStore.setItemAsync(readKey(userId), JSON.stringify([...ids].slice(-500)));
  });
}

function reminderDate(iso: string): Date {
  return new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T12:00:00` : iso);
}
function notifyDate(iso: string, daysBefore: number): Date | null {
  const due = reminderDate(iso);
  if (Number.isNaN(due.getTime())) return null;
  const date = new Date(due.getFullYear(), due.getMonth(), due.getDate() - daysBefore, 9);
  return date > new Date() ? date : null;
}

export function collectReminders(input: { bills: Bill[]; subscriptions: FinanceSubscription[]; keepsakes: Keepsake[]; budgets: Budget[]; transactions: Transaction[]; periodLimits?: Record<string, number>; splits?: TransactionSplit[] },language:AppLanguage="vi",at=new Date()): ReminderItem[] {
  const notices: ReminderItem[] = [];
  const now = at.getTime();
  for (const bill of input.bills) {
    if (bill.deletedAt || bill.status === "paid" || bill.status === "cancelled" || bill.paidTransactionId) continue;
    const due = reminderDate(bill.dueAt).getTime();
    if (Number.isFinite(due) && due >= now - 86400000) notices.push({ id:`bill:${bill.id}:${bill.dueAt}`, label:reminderLabel("bill",bill.title,bill.dueAt,language), dueAt:bill.dueAt, notifyAt:notifyDate(bill.dueAt, 1) });
  }
  for (const plan of input.subscriptions) {
    if (!plan.active || plan.deletedAt) continue;
    const due = reminderDate(plan.nextDueAt).getTime();
    if (Number.isFinite(due) && due >= now - 86400000) notices.push({ id:`sub:${plan.id}:${plan.nextDueAt}`, label:reminderLabel("subscription",plan.title,plan.nextDueAt,language), dueAt:plan.nextDueAt, notifyAt:notifyDate(plan.nextDueAt, plan.alertDays) });
  }
  for (const item of input.keepsakes) {
    for (const [kind, iso] of [["return", item.returnUntil], ["warranty", item.warrantyUntil]] as const) {
      if (!iso) continue;
      const due = new Date(`${iso}T12:00:00`).getTime();
      if (Number.isFinite(due) && due >= now) notices.push({ id:`${kind}:${item.id}:${iso}`, label:reminderLabel(kind,item.title,iso,language), dueAt:iso, notifyAt:notifyDate(`${iso}T12:00:00`, kind === "return" ? 1 : 7) });
    }
  }
  const month = String(at.getFullYear()) + "-" + String(at.getMonth() + 1).padStart(2, "0");
  for (const budget of budgetWarnings({ ...input, month })) {
    notices.push({ id:`budget:${budget.id}:${month}`, label:reminderLabel("budget",budget.name,at.toISOString(),language), dueAt:at.toISOString(), notifyAt:null });
  }
  return notices;
}

export async function cancelUserReminders(userId: string, dismissPresented = false) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const item of scheduled) if (isOwnerReminder(item.identifier,userId)) await Notifications.cancelScheduledNotificationAsync(item.identifier);
  if (dismissPresented) {
    for (const item of await Notifications.getPresentedNotificationsAsync()) {
      if (isOwnerReminder(item.request.identifier,userId)) await Notifications.dismissNotificationAsync(item.request.identifier);
    }
  }
}

let scheduling: Promise<void> = Promise.resolve();
export function scheduleUserReminders(userId: string, items: ReminderItem[], isCurrent = () => true,language:AppLanguage="vi") {
  const previous=scheduling;
  const operation = withLocalOwnerAccess(userId,()=>previous.catch(() => undefined).then(() => scheduleNow(userId, items, isCurrent,language)));
  scheduling = operation;
  return operation;
}
async function scheduleNow(userId: string, items: ReminderItem[], isCurrent: () => boolean,language:AppLanguage) {
  if (!isCurrent()) return;
  await cancelUserReminders(userId);
  if (!(await storedRemindersEnabled(userId)) || !isCurrent()) return;
  await Notifications.setNotificationChannelAsync("picket-reminders", {
    name: privateReminderCopy("reminder",language).channel, importance: Notifications.AndroidImportance.DEFAULT,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
  });
  const upcoming = items.filter((entry) => entry.notifyAt !== null && entry.notifyAt > new Date())
    .sort((a, b) => a.notifyAt!.getTime() - b.notifyAt!.getTime()).slice(0, 50);
  for (const item of upcoming) {
    if (!isCurrent()) return;
    const scheduled = await scheduleOwnedReminder(`${prefix(userId)}${item.id}`, isCurrent, {
      schedule: async identifier => {
        await Notifications.scheduleNotificationAsync({ identifier,
          content: { title:privateReminderCopy("reminder",language).title, body:privateReminderCopy("reminder",language).body },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: item.notifyAt!, channelId: "picket-reminders" },
        });
      },
      cancel: identifier => Notifications.cancelScheduledNotificationAsync(identifier),
    });
    if (!scheduled) return;
  }
  await budgetNoticeDelivery.deliver(userId, items.map(item => item.id), isCurrent,language);
}

export async function purgeRetiredOwnerPreferences(owner:string){
  await purgeOwnerPreferences(owner,{
    isRetired:isOfflineCacheOwnerRetired,
    scheduled:async()=>(await Notifications.getAllScheduledNotificationsAsync()).map(item=>item.identifier),
    presented:async()=>(await Notifications.getPresentedNotificationsAsync()).map(item=>item.request.identifier),
    cancel:id=>Notifications.cancelScheduledNotificationAsync(id),
    dismiss:id=>Notifications.dismissNotificationAsync(id),
    removeKey:key=>SecureStore.deleteItemAsync(key),
    forgetBudget:id=>budgetNoticeDelivery.forgetOwner(id),
  });
}
