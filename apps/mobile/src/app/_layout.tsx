import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

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
        <DeviceLockProvider>
          <SessionProviders>
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false }} />
            <NavigationShell />
          </SessionProviders>
        </DeviceLockProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
