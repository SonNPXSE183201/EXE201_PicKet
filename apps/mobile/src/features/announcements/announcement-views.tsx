import type { ReactNode } from "react";
import { Linking, StyleSheet, View } from "react-native";
import { router, type Href } from "expo-router";
import { useTranslation } from "react-i18next";
import { safeAnnouncementTarget, type Announcement } from "@picket/domain";
import { PicketText as Text } from "@/core/ui/picket-text";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { PrimaryAction, Surface } from "@/core/ui/picket-ui";
import { useAppTheme } from "@/features/settings/appearance-provider";
import { useAnnouncements } from "./announcements-context";

function openTarget(item: Announcement) {
  const target = safeAnnouncementTarget(item);
  if (!target) return;
  if (target.kind === "route") router.push(target.value as Href);
  else void Linking.openURL(target.value).catch(() => undefined);
}

export function AnnouncementCard({ item }: { item: Announcement }) {
  const { t } = useTranslation("common");
  const { colors } = useAppTheme();
  const { dismiss } = useAnnouncements();
  const accent = item.severity === "critical" ? colors.expense : item.severity === "warning" ? colors.primary : colors.link;
  const target = safeAnnouncementTarget(item);
  return (
    <Surface style={StyleSheet.flatten([styles.card, { borderLeftColor: accent }])}>
      <Text accessibilityRole="header" style={styles.title}>{item.title}</Text>
      {!!item.body && <Text style={styles.body}>{item.body}</Text>}
      <View style={styles.actions}>
        {target && (
          <Pressable accessibilityRole="button" onPress={() => openTarget(item)} style={styles.action}>
            <Text style={[styles.actionText, { color: colors.link }]}>{item.cta_label || t("Xem chi tiết")}</Text>
          </Pressable>
        )}
        {item.dismissible && (
          <Pressable accessibilityRole="button" accessibilityLabel={t("Ẩn thông báo {{title}}", { title: item.title })} onPress={() => dismiss(item)} style={styles.action}>
            <Text style={styles.actionText}>{t("Ẩn")}</Text>
          </Pressable>
        )}
      </View>
    </Surface>
  );
}

/** Highest-priority notice on Home (feed is already ordered by the server). */
export function AnnouncementBanner() {
  const { items } = useAnnouncements();
  const first = items[0];
  return first ? <AnnouncementCard item={first} /> : null;
}

export function AnnouncementInbox() {
  const { t } = useTranslation("common");
  const { items } = useAnnouncements();
  if (!items.length) return null;
  return (
    <View style={styles.inbox}>
      <Text accessibilityRole="header" style={styles.inboxTitle}>{t("Thông báo từ Picket")}</Text>
      {items.map((item) => <AnnouncementCard key={item.id} item={item} />)}
    </View>
  );
}

/** Blocks the app while a maintenance window is active; local data stays on the device. */
export function MaintenanceGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation("common");
  const { colors } = useAppTheme();
  const { gate, refresh } = useAnnouncements();
  if (!gate) return <>{children}</>;
  return (
    <View style={[styles.gate, { backgroundColor: colors.canvas }]} accessibilityViewIsModal>
      <Text accessibilityRole="header" style={styles.gateTitle}>{gate.title || t("Picket đang bảo trì")}</Text>
      {!!gate.body && <Text style={styles.body}>{gate.body}</Text>}
      {gate.endsAt && (
        <Text style={styles.body}>
          {t("Dự kiến xong lúc {{time}}", { time: new Date(gate.endsAt).toLocaleString() })}
        </Text>
      )}
      <Text style={styles.body}>{t("Dữ liệu trên điện thoại của bạn vẫn được giữ nguyên.")}</Text>
      <PrimaryAction label={t("Thử lại")} onPress={refresh} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderLeftWidth: 4, gap: 6, marginBottom: 12 },
  title: { fontSize: 16, fontWeight: "700" },
  body: { fontSize: 14, lineHeight: 20 },
  actions: { flexDirection: "row", gap: 16, flexWrap: "wrap" },
  action: { minHeight: 44, justifyContent: "center" },
  actionText: { fontSize: 14, fontWeight: "600" },
  inbox: { marginBottom: 16 },
  inboxTitle: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
  gate: { flex: 1, justifyContent: "center", padding: 24, gap: 12 },
  gateTitle: { fontSize: 22, fontWeight: "700" },
});
