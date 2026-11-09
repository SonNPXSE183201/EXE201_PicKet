import type { ReactNode } from "react";
import { Linking, StyleSheet, View } from "react-native";
import { router, type Href } from "expo-router";
import { useTranslation } from "react-i18next";
import { safeAnnouncementTarget, type Announcement } from "@picket/domain";
import { PicketText as Text } from "@/core/ui/picket-text";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { Chip, FigmaButton, figmaShadow } from "@/core/ui/figma-ui";
import { figmaType } from "@picket/design-tokens";
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
    <View style={[styles.card, { backgroundColor: colors.surface, borderLeftColor: accent }, figmaShadow("paper")]}>
      {item.severity !== "info" && (
        <Chip size="small" tone={item.severity === "critical" ? "warning" : "neutral"} label={t(item.severity === "critical" ? "Quan trọng" : "Lưu ý")} style={styles.chip} />
      )}
      <Text accessibilityRole="header" style={[figmaType.bodyStrong, { color: colors.text }]}>{item.title}</Text>
      {!!item.body && <Text style={[figmaType.bodySmall, { color: colors.muted }]}>{item.body}</Text>}
      {(target || item.dismissible) && (
        <View style={styles.actions}>
          {target && <FigmaButton size="medium" label={item.cta_label || t("Xem chi tiết")} onPress={() => openTarget(item)} />}
          {item.dismissible && (
            <Pressable accessibilityRole="button" accessibilityLabel={t("Ẩn thông báo {{title}}", { title: item.title })} onPress={() => dismiss(item)} style={styles.dismiss}>
              <Text style={[figmaType.button, { color: colors.muted }]}>{t("Ẩn")}</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
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
  const { colors } = useAppTheme();
  const { items } = useAnnouncements();
  if (!items.length) return null;
  return (
    <View style={styles.inbox}>
      <Text accessibilityRole="header" style={[figmaType.overline, styles.inboxTitle, { color: colors.muted }]}>{t("Thông báo từ Picket").toUpperCase()}</Text>
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
      <View style={[styles.gateCard, { backgroundColor: colors.surface }, figmaShadow("paper")]}>
        <Chip size="small" tone="warning" label={t("Bảo trì")} style={styles.chip} />
        <Text accessibilityRole="header" style={[figmaType.titleSection, { color: colors.text }]}>{gate.title || t("Picket đang bảo trì")}</Text>
        {!!gate.body && <Text style={[figmaType.bodySmall, { color: colors.text }]}>{gate.body}</Text>}
        {gate.endsAt && (
          <Text style={[figmaType.bodySmall, { color: colors.muted }]}>
            {t("Dự kiến xong lúc {{time}}", { time: new Date(gate.endsAt).toLocaleString() })}
          </Text>
        )}
        <Text style={[figmaType.bodySmall, { color: colors.muted }]}>{t("Dữ liệu trên điện thoại của bạn vẫn được giữ nguyên.")}</Text>
        <FigmaButton fullWidth label={t("Thử lại")} onPress={refresh} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderLeftWidth: 4, padding: 16, gap: 6, marginBottom: 12 },
  chip: { alignSelf: "flex-start" },
  actions: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 4 },
  dismiss: { minHeight: 44, minWidth: 44, justifyContent: "center", paddingHorizontal: 8 },
  inbox: { marginBottom: 16 },
  inboxTitle: { marginBottom: 8 },
  gate: { flex: 1, justifyContent: "center", padding: 20 },
  gateCard: { borderRadius: 22, borderBottomLeftRadius: 10, padding: 20, gap: 12 },
});
