import { Redirect, Stack } from "expo-router";

import { useAuth } from "@/features/auth/auth-context";
import { routes } from "@/core/navigation/routes";

export default function AuthLayout() {
  const { loading, recovery, session } = useAuth();
  if (!loading && session && !recovery) return <Redirect href={routes.home} />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
