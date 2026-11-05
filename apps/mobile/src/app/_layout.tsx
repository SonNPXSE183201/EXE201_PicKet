import { useFonts } from "expo-font";
import { paperFonts } from "@/core/theme/paper-assets";
import { useTranslation } from "react-i18next";
import "@/core/export/native-backup-key";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { bootstrapIntentGate } from "@/core/navigation/bootstrap-intent";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ActivityIndicator, View } from "react-native";
import { canMountSessionRoutes } from "@/features/auth/session-route-policy";

import { AuthProvider, useAuth } from "@/features/auth/auth-context";
import { MobileAccessBoundary } from "@/features/auth/mobile-access-boundary";
import { OwnerCacheBoundary } from "@/features/auth/owner-cache-boundary";
import { AccountsProvider } from "@/features/accounts/accounts-context";
import { ProfileProvider } from "@/features/profile/profile-context";
import { TransactionsProvider } from "@/features/transactions/transactions-context";
import { BudgetsProvider } from "@/features/budgets/budgets-context";
import { BillsProvider } from "@/features/bills/bills-context";
import { SubscriptionsProvider } from "@/features/subscriptions/subscriptions-context";
import { SyncProvider } from "@/features/sync/sync-context";
import { DeviceLockProvider } from "@/features/security/device-lock";
import { ReminderCoordinator } from "@/features/notifications/reminder-coordinator";
import { GuestFinanceProvider } from "@/core/local/guest-finance-context";
import { NavigationShell } from "@/core/ui/navigation-shell";
import { AppAppearanceProvider, useAppTheme } from "@/features/settings/appearance-provider";
import { AccountAppearance } from "@/features/settings/account-appearance";
import { AnalyticsConsentProvider } from "@/features/settings/analytics-consent";
import { LearningSync } from "@/features/learning/learning-sync";
import { PlayBillingProvider } from "@/features/billing/play-billing-provider";
import { ScheduleSync } from "@/features/cashflow/schedule-sync";
import * as SplashScreen from "expo-splash-screen";
import { AnnouncementsProvider } from "@/features/announcements/announcements-context";
import { MaintenanceGate } from "@/features/announcements/announcement-views";

void SplashScreen.preventAutoHideAsync();

function ProviderTree({ children }: { children: React.ReactNode }) {
  return (
    <ProfileProvider>
      <AccountAppearance />
      <LearningSync />
      <ScheduleSync />
      <PlayBillingProvider><AccountsProvider>
        <TransactionsProvider><BudgetsProvider><BillsProvider><SubscriptionsProvider><SyncProvider><ReminderCoordinator />{children}</SyncProvider></SubscriptionsProvider></BillsProvider></BudgetsProvider></TransactionsProvider>
      </AccountsProvider></PlayBillingProvider>
    </ProfileProvider>
  );
}

function SessionProviders({ children }: { children: React.ReactNode }) {
  return <OwnerCacheBoundary><ReadySessionProviders>{children}</ReadySessionProviders></OwnerCacheBoundary>;
}

function ReadySessionProviders({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const { localMode } = useAuth();
  // This effect runs only after the cache boundary permits the nested Stack.
  useEffect(() => { bootstrapIntentGate.ready(); }, []);
  return <AnalyticsConsentProvider key={session?.user.id??"guest"}><GuestFinanceProvider key={session?.user.id ?? (localMode ? "device-guest" : "anonymous")}><ProviderTree key={session?.user.id ?? (localMode ? "device-guest" : "anonymous")}>{children}</ProviderTree></GuestFinanceProvider></AnalyticsConsentProvider>;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(paperFonts);
  if (!fontsLoaded && !fontError) return null;
  return (
    <SafeAreaProvider>
      <AppAppearanceProvider><AuthProvider><AnnouncementsProvider>
        <SessionReadyTree />
      </AnnouncementsProvider></AuthProvider></AppAppearanceProvider>
    </SafeAreaProvider>
  );
}

function SessionReadyTree() {
  const { theme, colors } = useAppTheme();
  const { t } = useTranslation("common");
  const { loading } = useAuth();
  if (!canMountSessionRoutes(loading)) return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.canvas }}>
    <ActivityIndicator accessibilityLabel={t("Đang khôi phục phiên Picket")} color={colors.link} />
  </View>;
  return (
        <MaintenanceGate><MobileAccessBoundary><DeviceLockProvider>
          <SessionProviders>
            <StatusBar style={theme === "dark" ? "light" : "dark"} />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }} />
            <NavigationShell />
          </SessionProviders>
        </DeviceLockProvider></MobileAccessBoundary></MaintenanceGate>
  );
}
