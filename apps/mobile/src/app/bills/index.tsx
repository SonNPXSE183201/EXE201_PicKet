import { useMgmtCopy } from "@/features/management/management-copy";
import { PicketText as Text } from "@/core/ui/picket-text";
import { useTranslation } from "react-i18next";
import { figmaType } from "@picket/design-tokens";
import { formatMoney, normalizeLanguage } from "@/core/i18n/formatters";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { Redirect, router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { routes } from "@/core/navigation/routes";
import { ConnectionNotice, IconButton, PicketScreen, TopAppBar } from "@/core/ui/picket-ui";
import { AppIcon } from "@/core/ui/app-icon";
import { Chip, FigmaButton, ReceiptDivider, ReceiptEdge, Skeleton, figmaShadow } from "@/core/ui/figma-ui";
import { FieldOverline, ManagementEmpty } from "@/features/management/management-ui";
import { daysUntil, titleIcon, toneAt } from "@/features/management/management-tone";
import { useAuth } from "@/features/auth/auth-context";
import { useBills } from "@/features/bills/bills-context";

const monthCloseScene = require("../../../assets/management/month-close-scene.png");

export default function BillsScreen() {
  const { t, i18n } = useTranslation("bills");
  const { colors, styles } = useMobileStyles(createStyles);
  const { session, localMode } = useAuth();
  const { bills, error, loading, refresh } = useBills();
  const language = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language);
  const m = useMgmtCopy();
  const [renderedAt] = useState(() => Date.now());

  if (!session && !localMode) return <Redirect href={routes.login} />;

  const activeBills = bills.filter((bill) => bill.status !== "cancelled");
  const isUnpaid = (bill: (typeof bills)[number]) => bill.status === "pending" || bill.status === "overdue";
  const unpaid = activeBills.filter(isUnpaid).sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  const paid = activeBills.filter((bill) => !isUnpaid(bill));
  const unpaidTotal = unpaid.reduce((sum, bill) => sum + bill.amount, 0);
  const paidTotal = paid.reduce((sum, bill) => sum + bill.amount, 0);
  const month = new Date(renderedAt).getMonth() + 1;
  const tones = [colors.pocketCoral, colors.pocketBlue, colors.pocketMint, colors.pocketLilac];
  const short = (iso: string) => { const d = new Date(iso); return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`; };
  const money = (value: number) => formatMoney(value, language, "VND");
  const add = () => router.push(routes.newBill);

  const header = <TopAppBar title={m.billsTitle} action={<IconButton icon="plus" label={m.addBill} variant="surface" onPress={add} />} />;

  if (loading && !activeBills.length) return <PicketScreen>{header}<View accessibilityLabel={t("loading")} style={styles.block}><Skeleton height={44} radius={12} /><Skeleton height={120} radius={18} style={{ marginTop: 14 }} /><Skeleton height={120} radius={18} style={{ marginTop: 14 }} /></View></PicketScreen>;

  if (!loading && activeBills.length === 0) return <PicketScreen>{header}
    {error ? <ConnectionNotice hasData={false} onRetry={() => void refresh()} /> : null}
    <ManagementEmpty art={monthCloseScene} title={t("emptyTitle")} body={t("emptyDescription")} action={<FigmaButton variant="outline" size="medium" label={t("emptyAction")} onPress={add} />} />
  </PicketScreen>;

  return (
    <PicketScreen>
      {header}
      {error ? <ConnectionNotice hasData={bills.length > 0} onRetry={() => void refresh()} /> : null}
      <View style={[styles.summary, styles.block]}>
        <View style={{ gap: 2 }}>
          <Text style={[figmaType.bodySmall, { color: colors.muted }]}>{m.remaining(month)}</Text>
          <Text style={[figmaType.titleSection, styles.large]}>{money(unpaidTotal)}</Text>
        </View>
        <View style={{ gap: 2, alignItems: "flex-end" }}>
          <Text style={[figmaType.bodySmall, { color: colors.muted }]}>{m.paid}</Text>
          <Text style={[figmaType.bodyStrong, { color: colors.income }]}>{money(paidTotal)}</Text>
        </View>
      </View>

      {unpaid.length > 0 && <View style={styles.block}>
        <FieldOverline>{m.upcoming}</FieldOverline>
        <View style={{ gap: 14, marginTop: 8 }}>
          {unpaid.map((bill, index) => {
            const days = daysUntil(bill.dueAt, renderedAt);
            const late = bill.status === "overdue" || days < 0;
            const soon = late || days <= 3;
            const due = late ? m.late(short(bill.dueAt)) : m.due(short(bill.dueAt), days);
            return <View key={bill.id} style={figmaShadow("paper")}>
              <View style={styles.paper}>
                <View style={styles.line}>
                  <View style={[styles.tile, { backgroundColor: toneAt(tones, index) }]}><AppIcon name={titleIcon(bill.title)} size={20} color={colors.text} /></View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text numberOfLines={1} style={[figmaType.bodyStrong, { color: colors.text }]}>{bill.title}</Text>
                    <Text style={[figmaType.bodySmall, { color: soon ? colors.warning : colors.muted }]}>{due}</Text>
                  </View>
                  <Text style={[figmaType.amountRow, { color: colors.text }]}>{money(bill.amount)}</Text>
                </View>
                <ReceiptDivider />
                <View style={[styles.line, { justifyContent: "space-between" }]}>
                  <Text style={[figmaType.micro, { color: colors.muted, flex: 1 }]}>{m.billHint}</Text>
                  <FigmaButton variant="outline" size="medium" label={m.paid} onPress={() => router.push(routes.bill(bill.id))} />
                </View>
              </View>
              <ReceiptEdge direction="bottom" />
            </View>;
          })}
        </View>
      </View>}

      {paid.length > 0 && <View style={styles.block}>
        <FieldOverline>{m.paidSection}</FieldOverline>
        <View style={{ gap: 14, marginTop: 8 }}>
          {paid.map((bill, index) => <View key={bill.id} style={[figmaShadow("paper"), { opacity: 0.6 }]}>
            <View style={styles.paper}>
              <View style={styles.line}>
                <View style={[styles.tile, { backgroundColor: toneAt(tones, index + 2) }]}><AppIcon name={titleIcon(bill.title)} size={20} color={colors.text} /></View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text numberOfLines={1} style={[figmaType.bodyStrong, { color: colors.text }]}>{bill.title}</Text>
                  <Text style={[figmaType.bodySmall, { color: colors.muted }]}>{m.paidOn(short(bill.dueAt))}</Text>
                </View>
                <Text style={[figmaType.amountRow, { color: colors.text }]}>{money(bill.amount)}</Text>
                <Chip tone="success" label={m.paid} />
              </View>
            </View>
            <ReceiptEdge direction="bottom" />
          </View>)}
        </View>
      </View>}
    </PicketScreen>
  );
}

const createStyles = (colors: MobileThemeColors) =>
  StyleSheet.create({
    block: { marginTop: 20 },
    summary: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
    large: { fontSize: 20, lineHeight: 26, letterSpacing: -0.3, color: colors.text },
    paper: { backgroundColor: colors.paper, borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingTop: 14, paddingBottom: 10, paddingHorizontal: 16, gap: 8 },
    line: { flexDirection: "row", alignItems: "center", gap: 12 },
    tile: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  });
