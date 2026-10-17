import { colors } from "@picket/design-tokens";
import { router, usePathname, type Href } from "expo-router";
import { Keyboard, StyleSheet, Text, View } from "react-native";
import { useEffect, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/features/auth/auth-context";
import { AccessiblePressable as Pressable } from "./accessible-pressable";
import { AppIcon, type IconName } from "./app-icon";

const destinations: { path: "/" | "/transactions" | "/accounts" | "/budgets" | "/profile"; label: string; icon: IconName; activeIcon: IconName }[] = [
  { path: "/", label: "Tổng quan", icon: "home-outline", activeIcon: "home" },
  { path: "/transactions", label: "Giao dịch", icon: "receipt-text-outline", activeIcon: "receipt-text" },
  { path: "/accounts", label: "Ví", icon: "wallet-outline", activeIcon: "wallet" },
  { path: "/budgets", label: "Ngân sách", icon: "chart-donut", activeIcon: "chart-donut" },
  { path: "/profile", label: "Cá nhân", icon: "account-outline", activeIcon: "account" },
];

/** Keep existing deep links and providers intact while sharing destination navigation. */
export function NavigationShell() {
  const pathname = usePathname().replace(/\/$/, "") || "/";
  const { session, localMode } = useAuth();
  const insets = useSafeAreaInsets();
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setKeyboardVisible(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  if (keyboardVisible || (!session && !localMode) || !destinations.some((item) => item.path === pathname)) return null;
  return <View style={[styles.bar, { paddingBottom: Math.max(8, insets.bottom) }]}>
    {destinations.map((item) => {
      const active = pathname === item.path;
      return <Pressable key={item.path} accessibilityRole="tab" accessibilityLabel={item.label} accessibilityState={{ selected: active }} onPress={() => { if (!active) router.navigate(item.path as Href); }} style={styles.destination}>
        <View key={active ? "selected" : "idle"} style={[styles.indicator, active && styles.selected]}><AppIcon name={active ? item.activeIcon : item.icon} color={active ? colors.ink : colors.muted} /></View>
        <Text style={[styles.label, active && styles.activeLabel]}>{item.label}</Text>
      </Pressable>;
    })}
  </View>;
}

const styles = StyleSheet.create({
  bar: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.line, flexDirection: "row", paddingTop: 8, paddingHorizontal: 4 },
  destination: { flex: 1, alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 4 },
  indicator: { width: 56, height: 30, borderRadius: 20, overflow: "hidden", backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  selected: { backgroundColor: colors.peach },
  label: { color: colors.muted, fontSize: 11, lineHeight: 16, fontWeight: "500", textAlign: "center" },
  activeLabel: { color: colors.ink, fontWeight: "700" },
});
