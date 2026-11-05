import { usePullRefresh } from "@/features/sync/use-pull-refresh";
import { useMgmtCopy } from "@/features/management/management-copy";
import { PicketText as Text } from "@/core/ui/picket-text";
import { formatMoney, localeFor, normalizeLanguage } from "@/core/i18n/formatters";
import { useTranslation } from "react-i18next";
import { figmaType } from "@picket/design-tokens";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { Redirect, router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { routes } from "@/core/navigation/routes";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { ConnectionNotice, IconButton, PicketScreen, TopAppBar } from "@/core/ui/picket-ui";
import { AppIcon } from "@/core/ui/app-icon";
import { FigmaButton, ReceiptDivider, ReceiptEdge, Skeleton, figmaShadow } from "@/core/ui/figma-ui";
import { FieldOverline, ManagementEmpty, PaperCard } from "@/features/management/management-ui";
import { titleIcon, toneAt } from "@/features/management/management-tone";
import { useAccounts } from "@/features/accounts/accounts-context";
import { useAuth } from "@/features/auth/auth-context";
import { useSubscriptions } from "@/features/subscriptions/subscriptions-context";
import { partitionSubscriptions } from "@/features/subscriptions/subscription-list";

export default function SubscriptionsScreen() {
  const pullRefresh = usePullRefresh();
  const { t, i18n } = useTranslation("subscriptions");
  const language = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language);
  const m = useMgmtCopy();
  const { colors, styles } = useMobileStyles(createStyles);
  const { session, localMode } = useAuth();
  const { accounts } = useAccounts();
  const { subscriptions, loading, error, refresh } = useSubscriptions();

  if (!session && !localMode) return <Redirect href={routes.login} />;

  const { active, paused } = partitionSubscriptions(subscriptions);
  const monthly = (item: (typeof subscriptions)[number]) => item.cadence === "yearly" ? Math.round(item.amount / 12) : item.cadence === "weekly" ? item.amount * 4 : item.amount;
  const monthlyTotal = active.reduce((sum, item) => sum + monthly(item), 0);
  const money = (value: number) => formatMoney(value, language, "VND");
  const tones = [colors.pocketCoral, colors.pocketMint, colors.pocketLilac, colors.pocketBlue];
  const pad = (value: number) => String(value).padStart(2, "0");
  const short = (iso: string) => { const d = new Date(iso); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`; };
  const add = () => router.push(routes.newSubscription);
  const header = <TopAppBar title={m.subsTitle} action={<IconButton icon="plus" label={m.addSub} variant="surface" onPress={add} />} />;

  if (loading && subscriptions.length === 0) return <PicketScreen onRefresh={pullRefresh}>{header}<View accessibilityLabel={t("loading")} style={styles.block}><Skeleton height={120} radius={18} /><Skeleton height={150} radius={18} style={{ marginTop: 20 }} /></View></PicketScreen>;
  if (!loading && active.length === 0 && paused.length === 0) return <PicketScreen onRefresh={pullRefresh}>{header}
    {error ? <ConnectionNotice hasData={false} onRetry={() => void refresh()} /> : null}
    <ManagementEmpty art="receipt" title={t("emptyTitle")} body={t("emptyDescription")} action={<FigmaButton variant="outline" size="medium" label={t("emptyAction")} onPress={add} />} />
  </PicketScreen>;

  const walletName = (id: string | null | undefined) => accounts.find((account) => account.id === id)?.name;
  const next = [...active].sort((a, b) => a.nextDueAt.localeCompare(b.nextDueAt))[0];
  const share = active.length ? active.slice(0, 2).map((item, index) => ({ flex: Math.max(monthly(item), 1), color: toneAt(tones, index) })) : [];
  if (active.length > 2) share.push({ flex: Math.max(active.slice(2).reduce((sum, item) => sum + monthly(item), 0), 1), color: tones[2] });

  const row = (item: (typeof subscriptions)[number], index: number, isPaused: boolean) => (
    <View key={item.id} style={isPaused ? { opacity: 0.6 } : undefined}>
      {index > 0 && <ReceiptDivider />}
      <Pressable accessibilityRole="button" onPress={() => router.push(routes.subscription(item.id))} style={styles.row}>
        <View style={[styles.tile, { backgroundColor: toneAt(tones, index + (isPaused ? 3 : 0)) }]}><AppIcon name={titleIcon(item.title)} size={18} color={colors.text} /></View>
        <View style={{ flex: 1, gap: 1 }}>
          <Text numberOfLines={1} style={[figmaType.bodyStrong, { color: colors.text }]}>{item.title}</Text>
          <Text numberOfLines={1} style={[figmaType.bodySmall, { color: colors.muted }]}>
            {isPaused ? m.stoppedSince(short(item.nextDueAt)) : [m.everyMonth(new Date(item.nextDueAt).getDate()), walletName(item.walletId)].filter(Boolean).join(" · ")}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 2 }}>
          <Text style={[figmaType.amountRow, { color: colors.text }]}>{money(item.amount)}</Text>
          {isPaused ? <Text style={[figmaType.micro, { color: colors.warning }]}>{m.pausedShort}</Text> : null}
        </View>
      </Pressable>
    </View>
  );

  return (
    <PicketScreen onRefresh={pullRefresh}>
      {header}
      {error ? <ConnectionNotice hasData={subscriptions.length > 0} onRetry={() => void refresh()} /> : null}
      <View style={[styles.block, figmaShadow("paper")]}>
        <View style={styles.summaryPaper}>
          <View style={styles.summaryTop}>
            <View style={{ gap: 2 }}>
              <FieldOverline>{m.perMonth}</FieldOverline>
              <Text style={[figmaType.titleSection, styles.large]}>{money(monthlyTotal)}</Text>
            </View>
            <Text style={[figmaType.bodySmall, { color: colors.muted }]}>{m.perYear(new Intl.NumberFormat(localeFor(language), { maximumFractionDigits: 1 }).format((monthlyTotal * 12) / 1_000_000))}</Text>
          </View>
          {share.length > 0 && <View style={styles.split}>{share.map((part, index) => <View key={index} style={{ flex: part.flex, height: 8, borderRadius: 4, backgroundColor: part.color }} />)}</View>}
        </View>
        <ReceiptEdge direction="bottom" />
      </View>
      {active.length > 0 && <View style={styles.block}><FieldOverline>{m.running}</FieldOverline><PaperCard>{active.map((item, index) => row(item, index, false))}</PaperCard></View>}
      {paused.length > 0 && <View style={styles.block}><FieldOverline>{m.paused}</FieldOverline><PaperCard>{paused.map((item, index) => row(item, index, true))}</PaperCard></View>}
      {next ? <View style={styles.next}><AppIcon name="calendar-blank-outline" size={16} color={colors.muted} /><Text style={[figmaType.bodySmall, { color: colors.muted, flex: 1 }]}>{m.nextUp(next.title, short(next.nextDueAt))}</Text></View> : null}
    </PicketScreen>
  );
}

const createStyles = (colors: MobileThemeColors) =>
  StyleSheet.create({
    block: { marginTop: 20, gap: 8 },
    large: { fontSize: 20, lineHeight: 26, letterSpacing: -0.3, color: colors.text },
    summaryPaper: { backgroundColor: colors.paper, borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingTop: 18, paddingBottom: 12, paddingHorizontal: 16, gap: 8 },
    summaryTop: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
    split: { flexDirection: "row", gap: 3 },
    row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 8, paddingVertical: 10 },
    tile: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    next: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 20 },
  });
