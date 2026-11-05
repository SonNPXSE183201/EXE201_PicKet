import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, useWindowDimensions, type ScrollViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePathname } from "expo-router";
import { screenBottomPadding } from "./navigation-layout";
import { paperSpace } from "../theme/paper-foundations";
import { useKeyboardAvoidingScroll } from "./keyboard-avoiding-scroll";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";

type Props = ScrollViewProps & { /** Pull-to-refresh: pass the screen's existing reload function. */ onRefresh?: () => void | Promise<unknown>; refreshing?: boolean };

/** Shared vertical page layout; horizontal filters retain their intrinsic sizing. Keeps focused fields above the keyboard. */
export const PicketScrollView = forwardRef<ScrollView, Props>(function PicketScrollView({ contentContainerStyle, horizontal, onRefresh, refreshing, onScroll, onTouchEnd, ...props }, ref) {
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const pathname = usePathname();
  const { colors } = useMobileStyles(() => ({}));
  const inner = useRef<ScrollView>(null);
  useImperativeHandle(ref, () => inner.current as ScrollView);
  const keyboard = useKeyboardAvoidingScroll(inner);
  const existing = StyleSheet.flatten(contentContainerStyle);
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => { setBusy(true); try { await onRefresh?.(); } finally { setBusy(false); } }, [onRefresh]);
  return <ScrollView ref={inner} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} scrollEventThrottle={16} {...props} horizontal={horizontal}
    onScroll={(event) => { keyboard.onScroll(event); onScroll?.(event); }}
    onTouchEnd={(event) => { onTouchEnd?.(event); setTimeout(keyboard.reveal, 250); }}
    refreshControl={!horizontal && onRefresh ? <RefreshControl refreshing={refreshing ?? busy} onRefresh={refresh} tintColor={colors.primary} colors={[colors.primary]} progressBackgroundColor={colors.paper} /> : props.refreshControl}
    contentContainerStyle={horizontal ? contentContainerStyle : [
    { padding: paperSpace.screen, width: "100%", maxWidth: 720, alignSelf: "center" },
    contentContainerStyle,
    { paddingBottom: Math.max(typeof existing?.paddingBottom === "number" ? existing.paddingBottom : 0, screenBottomPadding(pathname, insets.bottom, fontScale)) + keyboard.inset },
  ]} />;
});
