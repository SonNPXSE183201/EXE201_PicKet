import { Stack } from "expo-router";
import { useEffect } from "react";
import { bootstrapIntentGate } from "@/core/navigation/bootstrap-intent";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ActivityIndicator, View } from "react-native";
import { colors } from "@picket/design-tokens";
import { canMountSessionRoutes } from "@/features/auth/session-route-policy";

import { AuthProvider, useAuth } from "@/features/auth/auth-context";
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

function ProviderTree({ children }: { children: React.ReactNode }) {
  return (
    <ProfileProvider>
      <AccountsProvider>
        <TransactionsProvider><BudgetsProvider><BillsProvider><SubscriptionsProvider><SyncProvider><ReminderCoordinator />{children}</SyncProvider></SubscriptionsProvider></BillsProvider></BudgetsProvider></TransactionsProvider>
      </AccountsProvider>
    </ProfileProvider>
  );
}

function SessionProviders({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const { localMode } = useAuth();
  return <GuestFinanceProvider key={session?.user.id ?? (localMode ? "device-guest" : "anonymous")}><ProviderTree key={session?.user.id ?? (localMode ? "device-guest" : "anonymous")}>{children}</ProviderTree></GuestFinanceProvider>;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SessionReadyTree />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function SessionReadyTree() {
  const { loading } = useAuth();
  // Effects run after the ready render commits its Stack. Do not signal from
  // auth recovery itself, where a nested navigator may not exist yet.
  useEffect(() => { if (!loading) bootstrapIntentGate.ready(); }, [loading]);
  if (!canMountSessionRoutes(loading)) return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.cream }}>
    <ActivityIndicator accessibilityLabel="Đang khôi phục phiên Picket" color={colors.mauve} />
  </View>;
  return (
        <DeviceLockProvider>
          <SessionProviders>
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false }} />
            <NavigationShell />
          </SessionProviders>
        </DeviceLockProvider>
  );
}
