import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider, useAuth } from "@/features/auth/auth-context";
import { AccountsProvider } from "@/features/accounts/accounts-context";
import { ProfileProvider } from "@/features/profile/profile-context";
import { TransactionsProvider } from "@/features/transactions/transactions-context";
import { BudgetsProvider } from "@/features/budgets/budgets-context";
import { SyncProvider } from "@/features/sync/sync-context";

function SessionProviders({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  return (
    <ProfileProvider key={session?.user.id ?? "anonymous"}>
      <AccountsProvider>
        <TransactionsProvider><BudgetsProvider><SyncProvider>{children}</SyncProvider></BudgetsProvider></TransactionsProvider>
      </AccountsProvider>
    </ProfileProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SessionProviders>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }} />
        </SessionProviders>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
