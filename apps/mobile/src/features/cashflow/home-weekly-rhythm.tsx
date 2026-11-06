import { useEffect, useMemo, useState } from "react";
import { AppState, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { PicketText as Text } from "@/core/ui/picket-text";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { AppIcon } from "@/core/ui/app-icon";
import { ChoiceChip } from "@/core/ui/picket-ui";
import { formatCalendarDate, formatMoney } from "@/core/i18n/formatters";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { useAccounts } from "@/features/accounts/accounts-context";
import { useTransactions } from "@/features/transactions/transactions-context";
import { useProfile } from "@/features/profile/profile-context";
import { useAppTheme } from "@/features/settings/appearance-provider";
import { WeeklyRhythmPlot } from "./weekly-rhythm-plot";
import { buildWeeklyRhythm } from "./weekly-rhythm";

export function HomeWeeklyRhythm() {
  const { accounts, loading: accountsLoading } = useAccounts();
  const { transactions, loading } = useTransactions();
  const { profile } = useProfile();
  const { language } = useAppTheme();
  const { colors: c, styles } = useMobileStyles(createStyles);
  const { t } = useTranslation("overview");
  const [now, setNow] = useState(() => new Date());
  const [currencyChoice, setCurrency] = useState("");
  const [selectedDay, setDay] = useState("");
  const currencies = [...new Set(accounts.filter(a => !a.deletedAt).map(a => a.currencyCode))];
  const currency = currencies.includes(currencyChoice) ? currencyChoice : currencies.includes(profile?.currencyCode ?? "VND") ? profile?.currencyCode ?? "VND" : currencies[0] ?? "VND";
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    const listener = AppState.addEventListener("change", state => { if (state === "active") setNow(new Date()); });
    return () => { clearInterval(timer); listener.remove(); };
  }, []);
  const result = useMemo(() => {
    try { return buildWeeklyRhythm({ accounts, transactions, currency, timeZone: profile?.timezone ?? "Asia/Ho_Chi_Minh", now }); }
    catch { return null; }
  }, [accounts, transactions, currency, profile?.timezone, now]);
  const initialLoading = (loading || accountsLoading) && accounts.length === 0 && transactions.length === 0;
  const selected = result?.days.find(day => day.day === selectedDay && day.expense !== null) ?? result?.days.find(day => day.day === result.today);
  const money = (amount: number) => formatMoney(amount, language, currency);
  const viewDay = () => { if (selected) router.push({ pathname: "/transactions", params: { day: selected.day, kind: "expense", currency } }); };
  const transferReady = accounts.filter(a => !a.archived && !a.deletedAt && a.currencyCode === currency).length >= 2;
  const save = () => router.push(transferReady ? { pathname: "/transactions/transfer", params: { currency } } : "/accounts/new");
  const difference = selected?.previousExpense === null || selected?.previousExpense === undefined ? null : selected.expense! - selected.previousExpense;
  return <View style={styles.section}>
    <Text style={styles.overline}>{t("rhythmLabel")}</Text>
    <View style={styles.heading}><Pressable disabled={!selected} onPress={viewDay} style={{ flex: 1 }}><Text accessibilityRole="header" style={styles.title}>{t("rhythmTitle")}</Text>{selected && <Text style={styles.caption}>{formatCalendarDate(selected.day, language)} · {money(selected.expense ?? 0)}</Text>}</Pressable></View>
    {currencies.length > 1 && <View style={styles.currencies}>{currencies.map(code => <ChoiceChip key={code} checked={currency === code} label={code} onPress={() => setCurrency(code)} />)}</View>}
    {initialLoading ? <Text style={styles.caption}>{t("rhythmLoading")}</Text> : !result || !selected ? <Text accessibilityRole="alert" style={styles.caption}>{t("rhythmUnavailable")}</Text> : result.recordCount === 0 ? <View style={styles.empty}><Text style={styles.name}>{t("rhythmEmpty")}</Text><Pressable onPress={() => router.push("/transactions/new")}><Text style={styles.link}>{t("rhythmAdd")}</Text></Pressable></View> : <>
      <WeeklyRhythmPlot days={result.days} selected={selected.day} onSelect={setDay} label={day => t("rhythmDay", { day: formatCalendarDate(day.day, language), amount: day.expense === null ? "—" : money(day.expense) })} />
      {!!selected.refunds && <Text style={styles.caption}>{t("rhythmRefund", { amount: money(selected.refunds) })}</Text>}
    </>}
    <View style={styles.insight}><View style={styles.spark}><AppIcon name="creation" size={23} color={c.link} /></View><View style={{ flex: 1 }}><Text style={styles.name}>{difference !== null ? t(difference < 0 ? "rhythmLower" : difference > 0 ? "rhythmHigher" : "rhythmEqual", { amount: money(Math.abs(difference)) }) : t("rhythmSave")}</Text><Text style={styles.caption}>{t(transferReady ? "rhythmSaveBody" : "rhythmSaveSetup")}</Text></View><Pressable onPress={save} style={styles.save}><Text style={styles.saveText}>{t("rhythmSave")}</Text></Pressable></View>
    {difference !== null && <Text style={styles.caption}>{t("rhythmComparisonNote")}</Text>}
  </View>;
}

const createStyles = (c: MobileThemeColors) => StyleSheet.create({
  section: { marginTop: 20, gap: 6 }, overline: { fontSize: 11, letterSpacing: 1.1, fontWeight: "700", color: c.link },
  heading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }, title: { fontSize: 20, fontWeight: "700", color: c.text, flex: 1 },
  currencies: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, caption: { color: c.muted, fontSize: 12, lineHeight: 18 }, name: { color: c.text, fontSize: 14, fontWeight: "700" },
  amount: { color: c.text, fontSize: 24, fontWeight: "800", fontVariant: ["tabular-nums"] }, selected: { flexDirection: "row", alignItems: "center", paddingVertical: 8, gap: 12 },
  insight: { borderWidth: 1, borderStyle: "dashed", borderColor: c.controlBorder, borderRadius: 24, padding: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  spark: { width: 40, height: 40, backgroundColor: c.pocketCoral, borderRadius: 14, alignItems: "center", justifyContent: "center" }, save: { backgroundColor: c.primary, borderRadius: 26, justifyContent: "center", paddingHorizontal: 16 }, saveText: { color: c.onPrimary, fontSize: 13, fontWeight: "700" },
  empty: { minHeight: 64, gap: 8, paddingVertical: 12 }, link: { color: c.link, fontWeight: "700" },
});
