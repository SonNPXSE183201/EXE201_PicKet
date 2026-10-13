import { Redirect } from "expo-router";
import { ActivityIndicator } from "react-native";

import { useAuth } from "@/features/auth/auth-context";
import { routes } from "@/core/navigation/routes";

export default function AuthCallbackScreen() {
  const { loading, recovery, session } = useAuth();
  if (loading) return <ActivityIndicator />;
  if (recovery) return <Redirect href={routes.resetPassword} />;
  return <Redirect href={session ? routes.home : routes.login} />;
}
