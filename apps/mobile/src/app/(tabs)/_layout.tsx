import { Tabs } from "expo-router";
import { useAppTheme } from "@/features/settings/appearance-provider";

/**
 * Home, Spending, Plans and Account stay mounted once opened, so switching
 * with the bottom dock is instant instead of rebuilding a Stack screen each
 * time. The dock itself is NavigationShell (rendered by the root layout).
 */
export default function TabsLayout() {
  const { colors } = useAppTheme();
  return (
    <Tabs
      tabBar={() => null}
      screenOptions={{ headerShown: false, lazy: true, freezeOnBlur: true, animation: "none", sceneStyle: { backgroundColor: colors.canvas } }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="transactions" />
      <Tabs.Screen name="planning" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
