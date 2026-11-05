import { PicketText as Text } from "@/core/ui/picket-text";
import { notificationScreenCopy } from "@/features/notifications/notification-screen-copy";
import { useReminderCalendar } from "@/features/notifications/use-reminder-calendar";
import { useTranslation } from "react-i18next";
import { useAppTheme } from "@/features/settings/appearance-provider";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { Redirect, useFocusEffect } from "expo-router";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Switch, View } from "react-native";

import { routes } from "@/core/navigation/routes";
import { guestOwnerId } from "@/core/local/guest-finance";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { PicketScreen, TopAppBar } from "@/core/ui/picket-ui";
import { figmaType } from "@picket/design-tokens";
import { ReceiptDivider, figmaShadow } from "@/core/ui/figma-ui";
import { FieldOverline, ManagementEmpty } from "@/features/management/management-ui";
import { AppIcon, type IconName } from "@/core/ui/app-icon";
import { useAuth } from "@/features/auth/auth-context";
import { useBills } from "@/features/bills/bills-context";
import { useBudgets } from "@/features/budgets/budgets-context";
import { loadKeepsakeCollection } from "@/features/keepsakes/cloud-keepsakes";
import { listKeepsakes, type Keepsake } from "@/features/keepsakes/keepsake-store";
import { loadReminderKeepsakes } from "@/features/notifications/keepsake-source";
import {
  collectReminders,
  markReminderRead,
  readReminderIds,
  remindersEnabled,
  scheduleUserReminders,
  setRemindersEnabled,
  type ReminderItem,
} from "@/features/notifications/reminders";
import { useSubscriptions } from "@/features/subscriptions/subscriptions-context";
import { useTransactionHistory } from "@/features/transactions/use-transaction-history";
import { useSpendingSplits } from "@/features/transactions/use-spending-splits";
import { useReminderPeriods } from "@/features/notifications/use-reminder-periods";

export default function NotificationsScreen() {
  const { t: tx } = useTranslation("notifications");
  const { language } = useAppTheme();
  const { colors, styles } = useMobileStyles(createStyles);
  const { session, localMode } = useAuth();
  const ownerId = session?.user.id ?? (localMode ? guestOwnerId : null);
  const deliveryScope = useRef({ ownerId, language, active: true, busy: false });
  const isCurrentOwner = () =>
    deliveryScope.current.active &&
    deliveryScope.current.ownerId === ownerId &&
    deliveryScope.current.language === language;
  const { bills } = useBills();
  const { budgets } = useBudgets();
  const { subscriptions } = useSubscriptions();
  const { transactions, loading: historyLoading, error: historyError } = useTransactionHistory();
  const calendar = useReminderCalendar();
  const month = calendar.month;
  const { splits, loading: splitLoading, error: splitError } = useSpendingSplits(transactions, month);
  const { periodLimits, periodsReady } = useReminderPeriods(budgets, month);
  const [loadedKeepsakes, setKeepsakes] = useState<{ owner: string; items: Keepsake[] } | null>(null);
  const keepsakes = useMemo(
    () => (loadedKeepsakes?.owner === ownerId ? loadedKeepsakes!.items : []),
    [loadedKeepsakes, ownerId],
  );
  const [enabled, setEnabled] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [read, setRead] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const now = calendar.now;

  useLayoutEffect(() => {
    const scope = { ownerId, language, active: true, busy: false };
    deliveryScope.current = scope;
    return () => {
      scope.active = false;
    };
  }, [ownerId, language]);

  const reminders = useMemo(
    () =>
      collectReminders(
        {
          bills,
          subscriptions,
          keepsakes,
          budgets: historyLoading || historyError || splitLoading || splitError || !periodsReady ? [] : budgets,
          transactions,
          splits,
          periodLimits,
        },
        language,
        new Date(calendar.now),
      ),
    [
      bills,
      subscriptions,
      keepsakes,
      budgets,
      transactions,
      splits,
      periodLimits,
      periodsReady,
      historyLoading,
      historyError,
      splitLoading,
      splitError,
      language,
      calendar.now,
    ],
  );

  const dueSoon = reminders.filter(
    (item) => item.notifyAt === null || new Date(item.dueAt).getTime() <= now + 7 * 86400000,
  );

  useFocusEffect(
    useCallback(() => {
      if (!ownerId) return;
      setSettingsLoading(true);
      let active = true;
      const scope = deliveryScope.current;
      const current = () => active && deliveryScope.current === scope && scope.language === language;
      void Promise.all([
        loadReminderKeepsakes({
          localMode,
          token: session?.access_token ?? null,
          userId: ownerId,
          loadLocal: listKeepsakes,
          loadCloud: loadKeepsakeCollection,
        }),
        remindersEnabled(ownerId),
        readReminderIds(ownerId),
      ])
        .then(([items, setting, ids]) => {
          if (current()) {
            setKeepsakes({ owner: ownerId, items });
            setEnabled(setting);
            setRead(ids);
            setBusy(false);
            setMessage(null);
          }
        })
        .catch(() => {
          if (current()) {
            setBusy(false);
            setMessage("Không tải được cài đặt thông báo trên thiết bị.");
          }
        })
        .finally(() => {
          if (current()) setSettingsLoading(false);
        });
      return () => {
        active = false;
      };
    }, [localMode, ownerId, session?.access_token, language]),
  );

  if (!ownerId) return <Redirect href={routes.login} />;

  async function toggle(value: boolean) {
    if (!isCurrentOwner() || deliveryScope.current.busy || settingsLoading) return;
    const operation = deliveryScope.current;
    operation.busy = true;
    const current = () => isCurrentOwner() && deliveryScope.current === operation;
    setBusy(true);
    setMessage(null);
    try {
      const saved = await setRemindersEnabled(ownerId!, value, language);
      if (!current()) return;
      if (!saved) {
        setMessage("Quyền thông báo chưa được cấp trong cài đặt Android.");
        return;
      }
      setEnabled(value);
      if (value) await scheduleUserReminders(ownerId!, reminders, current, language);
    } catch {
      if (current()) setMessage("Không cập nhật được lịch nhắc. Hãy thử lại.");
    } finally {
      operation.busy = false;
      if (current()) setBusy(false);
    }
  }

  async function markRead(id: string) {
    const operation = deliveryScope.current;
    const current = () => isCurrentOwner() && deliveryScope.current === operation;
    if (!current()) return;
    try {
      await markReminderRead(ownerId!, id);
      if (!current()) return;
      setRead((curr) => [...new Set([...curr, id])]);
    } catch {
      if (current()) setMessage("Không đánh dấu đã đọc được.");
    }
  }

  // Partition into Today vs Earlier for screen_17 visual fidelity
  const todayReminders: ReminderItem[] = [];
  const earlierReminders: ReminderItem[] = [];

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  dueSoon.forEach((item) => {
    const itemTime = new Date(item.dueAt).getTime();
    if (itemTime >= startOfToday.getTime()) {
      todayReminders.push(item);
    } else {
      earlierReminders.push(item);
    }
  });

  // If items only exist in one partition, ensure sensible display
  const hasReminders = dueSoon.length > 0;

  const copy = notificationScreenCopy(language);
  function iconForReminder(item: ReminderItem): { icon: IconName; tone: string } {
    const text = item.label.toLowerCase();
    if (/h[óo]a đơn|bill/.test(text)) return { icon: "lightning-bolt-outline", tone: colors.pocketCoral };
    if (/ngân sách|vượt|túi|budget/.test(text)) return { icon: "target", tone: colors.pocketLilac };
    if (/bảo hành|kỷ vật|warranty|return|đổi trả/.test(text)) return { icon: "heart-outline", tone: colors.pocketMint };
    if (/định kỳ|thuê bao|subscription|due/.test(text)) return { icon: "calendar-blank-outline", tone: colors.pocketBlue };
    return { icon: "bell-outline", tone: colors.pocketBlue };
  }

  function timeOf(item: ReminderItem) {
    const itemDate = new Date(item.dueAt);
    return `${String(itemDate.getHours()).padStart(2, "0")}:${String(itemDate.getMinutes()).padStart(2, "0")}`;
  }

  async function markAllRead() {
    for (const item of dueSoon) if (!read.includes(item.id)) await markRead(item.id);
  }

  const renderGroup = (title: string, list: ReminderItem[]) => (
    <View style={styles.block}>
      <FieldOverline>{title}</FieldOverline>
      <View style={[styles.card, figmaShadow("paper")]}>
        {list.map((item, index) => {
          const isRead = read.includes(item.id);
          const look = iconForReminder(item);
          return (
            <View key={item.id}>
              {index > 0 && <ReceiptDivider />}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${item.label}, ${isRead ? tx("đã đọc") : tx("chưa đọc")}`}
                // eslint-disable-next-line react-hooks/refs
                onPress={() => void markRead(item.id)}
                style={styles.row}
              >
                <View style={[styles.tile, { backgroundColor: look.tone }]}><AppIcon name={look.icon} size={18} color={colors.text} /></View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[figmaType.bodyStrong, { color: colors.text }]}>{item.label}</Text>
                  <Text style={[figmaType.bodySmall, { color: colors.muted }]}>
                    {item.notifyAt ? tx("Nhắc hẹn định kỳ Picket") : tx("Kiểm tra chi tiêu trong ngày của bạn")}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 6 }}>
                  <Text style={[figmaType.micro, { color: colors.muted }]}>{timeOf(item)}</Text>
                  {!isRead && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
                </View>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );

  return (
    <PicketScreen>
      <TopAppBar title={tx("Thông báo")} />

      {message && (
        <Text accessibilityLiveRegion="polite" style={styles.message}>
          {tx(message, { defaultValue: message })}
        </Text>
      )}

      <View style={styles.settingRow}>
        <View style={{ flex: 1 }}>
          <Text style={[figmaType.bodyStrong, { color: colors.text }]}>{tx("Lịch nhắc thông minh")}</Text>
          <Text style={[figmaType.bodySmall, { color: colors.muted }]}>{tx("Tự động nhắc ghi chép cuối ngày & cảnh báo hóa đơn")}</Text>
        </View>
        <Switch
          accessibilityLabel={tx("Lịch nhắc thông minh")}
          disabled={busy || settingsLoading}
          hitSlop={12}
          onValueChange={(value) => void toggle(value)}
          thumbColor={enabled ? colors.onPrimary : colors.muted}
          trackColor={{ false: colors.line, true: colors.mauve }}
          value={enabled}
        />
      </View>

      {!hasReminders ? (
        <ManagementEmpty art="savings" title={copy.emptyTitle} body={copy.emptyBody} />
      ) : (
        <>
          <Pressable accessibilityRole="button" onPress={() => void markAllRead()} style={styles.readAll}>
            <Text style={[figmaType.captionStrong, { color: colors.primary }]}>{copy.readAll}</Text>
          </Pressable>
          {todayReminders.length > 0 && renderGroup(tx("Hôm nay"), todayReminders)}
          {earlierReminders.length > 0 && renderGroup(tx("Trước đó"), earlierReminders)}
        </>
      )}
    </PicketScreen>
  );
}

const createStyles = (colors: MobileThemeColors) =>
  StyleSheet.create({
    block: { marginTop: 16, gap: 8 },
    settingRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 16 },
    readAll: { alignSelf: "flex-end", minHeight: 32, justifyContent: "center", marginTop: 8 },
    card: { backgroundColor: colors.paper, borderRadius: 18, paddingHorizontal: 8, paddingVertical: 6 },
    row: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingHorizontal: 8, paddingVertical: 12 },
    tile: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    unreadDot: { width: 8, height: 8, borderRadius: 4 },
    message: { color: colors.ink, fontSize: 13, marginTop: 12 },
  });
