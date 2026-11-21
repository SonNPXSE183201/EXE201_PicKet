import { Redirect, Stack } from "expo-router";
import { useEffect } from "react";

import { useAuth } from "@/features/auth/auth-context";
import { routes } from "@/core/navigation/routes";
import { prefetchSignupMethods } from "@/features/auth/signup-verification-store";

export default function AuthLayout() {
  const { loading, passwordSetupRequired, recovery, session } = useAuth();
  // Login (or any auth screen) is up: load the sign-up channels before "Đăng ký" is tapped.
  useEffect(() => {
    prefetchSignupMethods();
  }, []);
  // passwordSetupRequired sessions are held by the root gate before this layout mounts.
  if (!loading && session && !recovery && !passwordSetupRequired) return <Redirect href={routes.home} />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
