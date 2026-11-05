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

const dockLayout = { inset: 16, height: 68, bottom: 14, cameraSize: 56 } as const;

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
  return <View accessibilityRole="tablist" style={[styles.bar, { bottom: Math.max(dockLayout.bottom, insets.bottom) }]}><View pointerEvents="none" accessible={false} style={styles.tray} />
    {destinations.map((item) => {
      const camera = item.path === "/capture";
      const active = pathname === item.path || (item.path === "/planning" && pathname === "/budgets");
      const label = language === "vi" ? (item.path === "/profile" ? profile?.displayName?.trim().split(/\s+/).pop() || item.label : item.label) : item.english;
      return <Pressable clipFeedback={!camera} key={item.path} accessibilityRole={camera ? "button" : "tab"} accessibilityLabel={label} accessibilityState={camera ? undefined : { selected: active }} android_ripple={camera ? undefined : { color: colors.selectedSurface + "55", borderless: false }} onPress={() => { if (!active) void navigate(item.path as Href); }} hitSlop={0} style={styles.destination}>
        <View style={camera ? styles.camera : [styles.indicator, active && styles.indicatorActive]}><AppIcon name={item.icon} size={camera ? 26 : 22} color={camera ? colors.onCamera : active ? colors.selectedText : colors.muted} /></View>
        <Text style={[styles.label, active && styles.activeLabel]}>{label}</Text>
      </Pressable>;
    })}
  </View>;
}


const createStyles = (colors: MobileThemeColors) => StyleSheet.create({
  bar: { position: "absolute", left: dockLayout.inset, right: dockLayout.inset, height: dockLayout.height, maxWidth: 600, alignSelf: "center", flexDirection: "row", paddingHorizontal: 5, paddingBottom: 4, paddingTop: 20 },
  tray: { position: "absolute", top: 12, left: 0, right: 0, bottom: 0, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderTopLeftRadius: 30, borderTopRightRadius: 30, borderBottomRightRadius: 30, borderBottomLeftRadius: 16, shadowColor: colors.camera, shadowOffset: { width: 0, height: 8 }, shadowOpacity: .16, shadowRadius: 18, boxShadow: [{ offsetX: 0, offsetY: 8, blurRadius: 18, color: colors.camera + "29" }] },
  destination: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", gap: 2, paddingVertical: 2, borderRadius: 20, overflow: "hidden", marginHorizontal: 2 },
  indicator: { width: 56, height: 32, borderRadius: 20, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  indicatorActive: { backgroundColor: colors.selectedSurface, borderRadius: 20, overflow: "hidden" },
  camera: { width: dockLayout.cameraSize, height: dockLayout.cameraSize, marginTop: -28, marginBottom: 1, borderWidth: 5, borderColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderBottomRightRadius: 24, borderBottomLeftRadius: 10, transform: [{ rotate: "-3deg" }], backgroundColor: colors.camera, alignItems: "center", justifyContent: "center", shadowColor: colors.camera, shadowOffset: { width: 0, height: 5 }, shadowOpacity: .25, shadowRadius: 12, elevation: 6 },
  label: { color: colors.muted, fontFamily: "PicketDisplay", fontSize: 11, lineHeight: 16, textAlign: "center" },
  activeLabel: { color: colors.selectedText },
});
