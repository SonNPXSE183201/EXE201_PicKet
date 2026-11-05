import { AnnouncementInbox } from "@/features/announcements/announcement-views";
import { PicketText as Text } from "@/core/ui/picket-text";
import { useReminderCalendar } from "@/features/notifications/use-reminder-calendar";
import { useTranslation } from "react-i18next";
import { useAppTheme } from "@/features/settings/appearance-provider";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { Redirect, router, useFocusEffect } from "expo-router";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Switch, View } from "react-native";

import { routes } from "@/core/navigation/routes";
import { guestOwnerId } from "@/core/local/guest-finance";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { EmptyState, PicketScreen } from "@/core/ui/picket-ui";
import { AppIcon } from "@/core/ui/app-icon";
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

  function iconForReminder(item: ReminderItem) {
    const text = item.label.toLowerCase();
    if (text.includes("hóa đơn") || text.includes("bill")) return "lightning-bolt-outline";
    if (text.includes("ngân sách") || text.includes("vượt")) return "alert-circle-outline";
    if (text.includes("quét") || text.includes("camera")) return "camera-outline";
    if (text.includes("báo cáo") || text.includes("report")) return "chart-bar";
    return "bell-outline";
  }

  function formatTimeTag(item: ReminderItem) {
    const itemDate = new Date(item.dueAt);
    const diffHours = (now - itemDate.getTime()) / (1000 * 60 * 60);
    if (diffHours < 24 && diffHours >= 0) {
      return `${String(itemDate.getHours()).padStart(2, "0")}:${String(itemDate.getMinutes()).padStart(2, "0")} · ${tx("Hôm nay")}`;
    }
    if (diffHours >= 24 && diffHours < 48) return tx("Hôm qua");
    return tx("Tuần trước");
  }

  return (
    <PicketScreen>
      <AnnouncementInbox />
      {/* Master Design Screen 17 Header */}
      <View style={styles.headerRow}>
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <AppIcon name="arrow-left" color={colors.ink} size={24} />
        </Pressable>
        <Text accessibilityRole="header" style={styles.headerTitle}>
          {tx("Thông báo & Lịch nhắc")}
        </Text>
      </View>

      {/* Top Setting Card: Lịch nhắc thông minh */}
      <View style={styles.smartReminderCard}>
        <View style={styles.smartReminderCopy}>
          <Text style={styles.smartTitle}>{tx("Lịch nhắc thông minh")}</Text>
          <Text style={styles.smartSub}>
            {tx("Tự động nhắc ghi chép cuối ngày & cảnh báo hóa đơn")}
          </Text>
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

      {message && (
        <Text accessibilityLiveRegion="polite" style={styles.message}>
          {tx(message, { defaultValue: message })}
        </Text>
      )}

      {!hasReminders ? (
        <EmptyState
          title={tx("Chưa có thông báo mới")}
          description={tx("Picket sẽ nhắc khi có hạn thanh toán hoặc ngân sách cần chú ý.")}
        />
      ) : (
        <View style={styles.contentSections}>
          {/* Section: Hôm nay */}
          {todayReminders.length > 0 && (
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>{tx("Hôm nay")}</Text>
              <View style={styles.reminderList}>
                {todayReminders.map((item) => {
                  const isRead = read.includes(item.id);
                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${item.label}, ${isRead ? tx("đã đọc") : tx("chưa đọc")}`}
                      key={item.id}
                      onPress={() => void markRead(item.id)}
                      style={[styles.notificationCard, !isRead && styles.unreadCard]}
                    >
                      <View style={styles.notifIconCircle}>
                        <AppIcon name={iconForReminder(item)} color={colors.mauve} size={20} />
                      </View>
                      <View style={styles.notifBody}>
                        <Text style={styles.notifTitle}>{item.label}</Text>
                        <Text style={styles.notifDesc}>
                          {item.notifyAt ? tx("Nhắc hẹn định kỳ Picket") : tx("Kiểm tra chi tiêu trong ngày của bạn")}
                        </Text>
                        <Text style={styles.notifTime}>{formatTimeTag(item)}</Text>
                      </View>
                      {!isRead && <View style={styles.unreadDot} />}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* Section: Trước đó */}
          {earlierReminders.length > 0 && (
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>{tx("Trước đó")}</Text>
              <View style={styles.reminderList}>
                {earlierReminders.map((item) => {
                  const isRead = read.includes(item.id);
                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${item.label}, ${isRead ? tx("đã đọc") : tx("chưa đọc")}`}
                      key={item.id}
                      onPress={() => void markRead(item.id)}
                      style={[styles.notificationCard, !isRead && styles.unreadCard]}
                    >
                      <View style={styles.notifIconCircle}>
                        <AppIcon name={iconForReminder(item)} color={colors.mauve} size={20} />
                      </View>
                      <View style={styles.notifBody}>
                        <Text style={styles.notifTitle}>{item.label}</Text>
                        <Text style={styles.notifDesc}>
                          {item.notifyAt ? "Đã ghi nhận trong kỳ" : "Kiểm tra chi tiêu trong ngày của bạn"}
                        </Text>
                        <Text style={styles.notifTime}>{formatTimeTag(item)}</Text>
                      </View>
                      {!isRead && <View style={styles.unreadDot} />}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      )}
    </PicketScreen>
  );
}

const createStyles = (colors: MobileThemeColors) =>
  StyleSheet.create({
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 16,
      marginTop: 4,
    },
    backBtn: {
      padding: 4,
    },
    headerTitle: {
      color: colors.ink,
      fontSize: 22,
      fontWeight: "800",
      letterSpacing: -0.3,
    },
    smartReminderCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 16,
      padding: 14,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 18,
    },
    smartReminderCopy: {
      flex: 1,
      paddingRight: 10,
    },
    smartTitle: {
      color: colors.ink,
      fontSize: 15,
      fontWeight: "700",
    },
    smartSub: {
      color: colors.muted,
      fontSize: 12,
      marginTop: 3,
      lineHeight: 18,
    },
    contentSections: {
      gap: 18,
    },
    sectionBlock: {
      gap: 8,
    },
    sectionTitle: {
      color: colors.ink,
      fontSize: 16,
      fontWeight: "800",
      marginBottom: 4,
    },
    reminderList: {
      gap: 10,
    },
    notificationCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 16,
      padding: 14,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      position: "relative",
    },
    unreadCard: {
      borderColor: colors.mauve,
    },
    notifIconCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.pocketLilac,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
    },
    notifBody: {
      flex: 1,
      gap: 4,
    },
    notifTitle: {
      color: colors.ink,
      fontSize: 15,
      fontWeight: "700",
      lineHeight: 20,
    },
    notifDesc: {
      color: colors.muted,
      fontSize: 13,
      lineHeight: 19,
    },
    notifTime: {
      color: colors.mauve,
      fontSize: 12,
      fontWeight: "600",
      marginTop: 4,
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.mauve,
      position: "absolute",
      top: 14,
      right: 14,
    },
    message: {
      color: colors.expense,
      fontSize: 13,
      marginBottom: 12,
    },
  });
