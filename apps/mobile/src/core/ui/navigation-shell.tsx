import { dockVisibleOn } from "./navigation-layout";
import { PicketText as Text } from "@/core/ui/picket-text";
import { useAppTheme } from "@/features/settings/appearance-provider";
import { useProfile } from "@/features/profile/profile-context";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { router, usePathname, type Href } from "expo-router";
import { Keyboard, StyleSheet, View } from "react-native";
import { useEffect, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/features/auth/auth-context";
import { AccessiblePressable as Pressable } from "./accessible-pressable";
import { AppIcon, type IconName } from "./app-icon";

const dockLayout = { inset: 16, height: 68, bottom: 14 } as const;

const destinations: { path: "/" | "/transactions" | "/capture" | "/planning" | "/profile"; label: string; english: string; icon: IconName }[] = [
  { path: "/", label: "Nhà", english: "Home", icon: "home-outline" },
  { path: "/transactions", label: "Chi tiêu", english: "Spending", icon: "wallet-outline" },
  { path: "/capture", label: "Chụp", english: "Capture", icon: "camera-outline" },
  { path: "/planning", label: "Dự định", english: "Plans", icon: "bullseye-arrow" },
  { path: "/profile", label: "Picket", english: "Picket", icon: "account-outline" },
];

/** Keep existing deep links and providers intact while sharing destination navigation. */
export function NavigationShell() {
  const { language } = useAppTheme();
  const { profile } = useProfile();
  const { colors, styles } = useMobileStyles(createStyles);
  const pathname = usePathname().replace(/\/$/, "") || "/";
  const { session, localMode } = useAuth();
  function navigate(path: Href) { router.navigate(path); }
  const insets = useSafeAreaInsets();
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setKeyboardVisible(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  if (keyboardVisible || (!session && !localMode) || !dockVisibleOn(pathname)) return null;
  return <View accessibilityRole="tablist" style={[styles.bar, { bottom: Math.max(dockLayout.bottom, insets.bottom) }]}>
    {destinations.map((item) => {
      const camera = item.path === "/capture";
      const profileTab = item.path === "/profile";
      const active = pathname === item.path || (item.path === "/planning" && pathname === "/budgets");
      const label = language === "vi" ? (profileTab ? profile?.displayName?.trim().split(/\s+/).pop() || item.label : item.label) : item.english;
      const initial = (profile?.displayName?.trim().split(/\s+/).pop() || label).charAt(0).toUpperCase();
      return <Pressable clipFeedback={!camera} key={item.path} accessibilityRole={camera ? "button" : "tab"} accessibilityLabel={label} accessibilityState={camera ? undefined : { selected: active }} android_ripple={camera ? undefined : { color: colors.selectedSurface + "55", borderless: false }} onPress={() => { if (!active) void navigate(item.path as Href); }} hitSlop={camera ? { top: 22 } : 0} style={camera ? styles.cameraDestination : styles.destination}>
        {camera ? <View style={styles.camera}><AppIcon name={item.icon} size={24} color={colors.camera} /></View>
          : <View style={[styles.indicator, active && styles.indicatorActive]}>{profileTab ? <View style={styles.avatar}><Text style={styles.avatarText}>{initial}</Text></View> : <AppIcon name={item.icon} size={20} color={active ? colors.onPrimary : colors.muted} />}</View>}
        <Text style={[styles.label, active && styles.activeLabel, camera && styles.cameraLabel]}>{label}</Text>
      </Pressable>;
    })}
  </View>;
}


const createStyles = (colors: MobileThemeColors) => StyleSheet.create({
  bar: { position: "absolute", left: dockLayout.inset, right: dockLayout.inset, height: dockLayout.height, maxWidth: 600, alignSelf: "center", flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 34, boxShadow: [{ offsetX: 0, offsetY: 1, blurRadius: 3, color: colors.text + "0D" }, { offsetX: 0, offsetY: 8, blurRadius: 24, color: colors.camera + "1A" }] },
  destination: { width: 56, height: 58, alignItems: "center", justifyContent: "center", gap: 2, borderRadius: 20 },
  cameraDestination: { width: 64, height: 58, alignItems: "center", justifyContent: "flex-end", minHeight: 58, minWidth: 64, overflow: "visible" },
  indicator: { width: 36, height: 36, borderRadius: 18, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  indicatorActive: { backgroundColor: colors.primary },
  avatar: { width: 26, height: 26, borderRadius: 14, backgroundColor: colors.pocketLilac, alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.primary, fontSize: 12, lineHeight: 18, fontWeight: "700" },
  camera: { position: "absolute", top: -22, width: 52, height: 52, borderRadius: 26, borderWidth: 4, borderColor: colors.surface, backgroundColor: colors.pocketCoral, alignItems: "center", justifyContent: "center", boxShadow: [{ offsetX: 0, offsetY: 3, blurRadius: 8, color: colors.camera + "4D" }] },
  label: { color: colors.muted, fontSize: 10, lineHeight: 16, fontWeight: "600", textAlign: "center" },
  activeLabel: { color: colors.primary, fontWeight: "800" },
  cameraLabel: { color: colors.primary, fontWeight: "800", marginBottom: 1 },
});
