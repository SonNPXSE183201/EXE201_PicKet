import { Redirect } from "expo-router";
import { ActivityIndicator } from "react-native";
import { useTranslation } from "react-i18next";

import { useAuth } from "@/features/auth/auth-context";
import { routes } from "@/core/navigation/routes";

export default function AuthCallbackScreen() {
  const {t}=useTranslation("auth");
  const { loading, recovery, session } = useAuth();
  if (loading) return <ActivityIndicator accessibilityLabel={t("Đang xử lý đăng nhập")} />;
  if (recovery) return <Redirect href={routes.resetPassword} />;
  return <Redirect href={session ? routes.home : routes.login} />;
}
