import { Redirect, Stack } from "expo-router";

import { useAuth } from "@/features/auth/auth-context";
import { routes } from "@/core/navigation/routes";

export default function AuthLayout() {
  const { loading, passwordSetupRequired, recovery, session } = useAuth();
  // passwordSetupRequired sessions are held by the root gate before this layout mounts.
  if (!loading && session && !recovery && !passwordSetupRequired) return <Redirect href={routes.home} />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
