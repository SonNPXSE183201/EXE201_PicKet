import { useState } from "react";
import { View } from "react-native";
import { Redirect, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { PicketScreen, TopAppBar, IconButton } from "@/core/ui/picket-ui";
import { HomeReceiptCalendar } from "@/core/ui/home-receipt-calendar";
import { PicketText as Text } from "@/core/ui/picket-text";
import { useAuth } from "@/features/auth/auth-context";
import { useProfile } from "@/features/profile/profile-context";
import { useTransactions } from "@/features/transactions/transactions-context";
import { useAppTheme } from "@/features/settings/appearance-provider";
import { transactionMonthAt } from "@/features/cashflow/currency-summary";
import { localeFor } from "@/core/i18n/formatters";
import { routes } from "@/core/navigation/routes";

/** The full receipt calendar lives with transaction tools, outside the brief home feed. */
export default function ReceiptCalendarScreen() {
  const { month: requestedMonth } = useLocalSearchParams<{ month?: string }>();
  const { profile } = useProfile();
  const current = transactionMonthAt(new Date().toISOString(), profile?.timezone ?? "Asia/Ho_Chi_Minh");
  return <ReceiptCalendarContent key={requestedMonth ?? current} initialMonth={typeof requestedMonth === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(requestedMonth) ? requestedMonth : current} />;
}
function ReceiptCalendarContent({ initialMonth }: { initialMonth: string }) {
  const { session, localMode } = useAuth();
  const { transactions } = useTransactions();
  const { colors, language } = useAppTheme();
  const { t } = useTranslation("overview");
  const [month, setMonth] = useState(initialMonth);
  if (!session && !localMode) return <Redirect href={routes.login} />;
  const shift = (offset: number) => { const date = new Date(`${month}-01T12:00:00Z`); date.setUTCMonth(date.getUTCMonth() + offset); setMonth(date.toISOString().slice(0, 7)); };
  return <PicketScreen><TopAppBar illustration="receipt" title={t("receiptCalendarTitle")} /><View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}><IconButton icon="chevron-left" label={t("previous")} onPress={() => shift(-1)} /><Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>{new Date(`${month}-01T12:00:00Z`).toLocaleDateString(localeFor(language), { month: "long", year: "numeric", timeZone: "UTC" })}</Text><IconButton icon="chevron-right" label={t("next")} onPress={() => shift(1)} /></View><HomeReceiptCalendar month={month} transactions={transactions} /></PicketScreen>;
}
