import { useEffect, useState, type PropsWithChildren } from "react";
import { Animated, PanResponder, StyleSheet, View } from "react-native";
import { figmaType } from "@picket/design-tokens";
import { PicketText as Text } from "@/core/ui/picket-text";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";

const actionWidth = 76;
const openRow: { close: (() => void) | null } = { close: null };

function createController(setOpen: (open: boolean) => void) {
  const x = new Animated.Value(0);
  let base = 0;
  const snap = (to: number) => {
    base = to;
    setOpen(to !== 0);
    Animated.spring(x, { toValue: to, useNativeDriver: true, bounciness: 0, speed: 20 }).start();
  };
  const closeNow = () => snap(0);
  const responder = PanResponder.create({
    onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
    onPanResponderGrant: () => { if (openRow.close && openRow.close !== closeNow) openRow.close(); openRow.close = closeNow; },
    onPanResponderMove: (_e, g) => { x.setValue(Math.max(-actionWidth - 24, Math.min(0, base + g.dx))); },
    onPanResponderRelease: (_e, g) => { snap(base + g.dx < -actionWidth / 2 || g.vx < -0.6 ? -actionWidth : 0); },
    onPanResponderTerminate: () => snap(base),
    onPanResponderTerminationRequest: () => false,
  });
  return { x, closeNow, responder };
}

/** Swipe left to reveal a rounded red action (default "Xoá"). Core PanResponder + Animated only; vertical scrolling is never blocked. */
export function SwipeableRow({ children, actionLabel = "Xoá", onAction, disabled = false }: PropsWithChildren<{ actionLabel?: string; onAction(): void; disabled?: boolean }>) {
  const { styles } = useMobileStyles(createStyles);
  const [open, setOpen] = useState(false);
  const [controller] = useState(() => createController(setOpen));
  useEffect(() => () => { if (openRow.close === controller.closeNow) openRow.close = null; }, [controller]);

  if (disabled) return <>{children}</>;
  return <View style={styles.wrap}>
    <View style={styles.actionSlot} pointerEvents={open ? "auto" : "none"}>
      <Pressable accessibilityRole="button" accessibilityLabel={actionLabel} onPress={() => { controller.closeNow(); onAction(); }} style={styles.action}><Text style={styles.actionText}>{actionLabel}</Text></Pressable>
    </View>
    <Animated.View {...controller.responder.panHandlers} accessible={false} accessibilityActions={[{ name: "delete", label: actionLabel }]} onAccessibilityAction={(event) => { if (event.nativeEvent.actionName === "delete") onAction(); }} style={[styles.front, { transform: [{ translateX: controller.x }] }]}>
      {children}
      {open ? <Pressable accessibilityLabel="Đóng" onPress={controller.closeNow} style={StyleSheet.absoluteFill} hitSlop={0} /> : null}
    </Animated.View>
  </View>;
}

const createStyles = (colors: MobileThemeColors) => StyleSheet.create({
  wrap: { alignSelf: "stretch", overflow: "hidden", borderRadius: 14 },
  front: { backgroundColor: colors.paper },
  actionSlot: { position: "absolute", top: 2, bottom: 2, right: 0, width: actionWidth, justifyContent: "center", alignItems: "flex-end" },
  action: { width: actionWidth - 4, height: "100%", minHeight: 40, borderRadius: 14, backgroundColor: colors.expense, alignItems: "center", justifyContent: "center" },
  actionText: { ...figmaType.button, color: "#FFFFFF" },
});
