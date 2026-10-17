import { colors } from "@picket/design-tokens";
import * as Notifications from "expo-notifications";
import { Redirect, router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";

import { routes } from "@/core/navigation/routes";
import { guestOwnerId } from "@/core/local/guest-finance";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { TopAppBar, EmptyState, PicketScreen, Surface } from "@/core/ui/picket-ui";
import { useAuth } from "@/features/auth/auth-context";
import { useBills } from "@/features/bills/bills-context";
import { useBudgets } from "@/features/budgets/budgets-context";
import { loadKeepsakeCollection } from "@/features/keepsakes/cloud-keepsakes";
import { listKeepsakes, type Keepsake } from "@/features/keepsakes/keepsake-store";
import { loadReminderKeepsakes } from "@/features/notifications/keepsake-source";
import { collectReminders, markReminderRead, readReminderIds, remindersEnabled, scheduleUserReminders, setRemindersEnabled } from "@/features/notifications/reminders";
import { useSubscriptions } from "@/features/subscriptions/subscriptions-context";
import { useTransactions } from "@/features/transactions/transactions-context";

Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner:true, shouldShowList:true, shouldPlaySound:false, shouldSetBadge:false }) });

export default function NotificationsScreen() {
  const { session, localMode } = useAuth();
  const ownerId = session?.user.id ?? (localMode ? guestOwnerId : null);
  const { bills } = useBills();
  const { budgets } = useBudgets();
  const { subscriptions } = useSubscriptions();
  const { transactions } = useTransactions();
  const [keepsakes, setKeepsakes] = useState<Keepsake[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [read, setRead] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const reminders = useMemo(() => collectReminders({ bills, subscriptions, keepsakes, budgets, transactions }), [bills, subscriptions, keepsakes, budgets, transactions]);
  const dueSoon = reminders.filter((item) => item.notifyAt === null || new Date(item.dueAt).getTime() <= now + 7 * 86400000);
  useFocusEffect(useCallback(() => {
    if (!ownerId) return;
    setNow(Date.now());
    let active = true;
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
      .then(([items, setting, ids]) => { if (active) { setKeepsakes(items); setEnabled(setting); setRead(ids); } })
      .catch(() => { if (active) setMessage("Không tải được cài đặt thông báo trên thiết bị."); });
    return () => { active = false; };
  }, [localMode, ownerId, session?.access_token]));
  if (!ownerId) return <Redirect href={routes.login} />;
  async function toggle(value: boolean) {
    setBusy(true); setMessage(null);
    try {
      const saved = await setRemindersEnabled(ownerId!, value);
      if (!saved) { setMessage("Quyền thông báo chưa được cấp trong cài đặt Android."); return; }
      setEnabled(value);
      if (value) await scheduleUserReminders(ownerId!, reminders);
    } catch { setMessage("Không cập nhật được lịch nhắc. Hãy thử lại."); }
    finally { setBusy(false); }
  }
  async function markRead(id: string) {
    try { await markReminderRead(ownerId!, id); setRead((current) => [...new Set([...current, id])]); }
    catch { setMessage("Không đánh dấu đã đọc được."); }
  }
  async function reschedule() {
    setBusy(true); setMessage(null);
    try { await scheduleUserReminders(ownerId!, reminders); setMessage("Đã cập nhật lịch nhắc trên thiết bị."); }
    catch { setMessage("Không cập nhật được lịch nhắc."); }
    finally { setBusy(false); }
  }
  return <PicketScreen>
    <TopAppBar title="Thông báo" />
    <Text style={styles.subtitle}>Các hạn thanh toán, món đồ và ngân sách cần chú ý.</Text>
    <Surface><View style={styles.setting}><View style={styles.copy}><Text style={styles.title}>Nhắc trên điện thoại</Text><Text style={styles.hint}>Thông báo không hiển thị chi tiết tài chính khi màn hình khóa.</Text></View><Switch accessibilityLabel="Nhắc trên điện thoại" disabled={busy} hitSlop={12} onValueChange={(value) => void toggle(value)} value={enabled} /></View></Surface>
    {enabled && <Pressable accessibilityRole="button" disabled={busy} onPress={() => void reschedule()} style={styles.linkButton}><Text style={styles.link}>Cập nhật lịch nhắc</Text></Pressable>}
    {message && <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text>}
    {dueSoon.length === 0 ? <EmptyState title="Chưa có thông báo mới" description="Picket sẽ nhắc khi có hạn thanh toán hoặc ngân sách cần chú ý." /> :
      <View style={styles.list}>{dueSoon.map((item) => <Pressable accessibilityRole="button" accessibilityLabel={`${item.label}, ${read.includes(item.id) ? "đã đọc" : "chưa đọc"}`} key={item.id} onPress={() => void markRead(item.id)}><Surface><Text style={styles.title}>{read.includes(item.id) ? "○" : "●"} {item.label}</Text><Text style={styles.hint}>{read.includes(item.id) ? "Đã đọc" : "Chạm để đánh dấu đã đọc"}</Text></Surface></Pressable>)}</View>}
  </PicketScreen>;
}

const styles = StyleSheet.create({ back:{color:colors.mauve,fontSize:15,fontWeight:"800",marginBottom:18},heading:{color:colors.ink,fontSize:29,fontWeight:"800"},subtitle:{color:colors.muted,fontSize:15,lineHeight:22,marginBottom:20,marginTop:7},setting:{alignItems:"center",flexDirection:"row",gap:12},copy:{flex:1},title:{color:colors.ink,fontSize:15,fontWeight:"800"},hint:{color:colors.muted,fontSize:12,lineHeight:18,marginTop:5},linkButton:{alignSelf:"flex-start",marginVertical:15},link:{color:colors.mauve,fontWeight:"800"},message:{color:colors.expense,fontSize:13,marginBottom:12},list:{gap:10,marginTop:18} });
