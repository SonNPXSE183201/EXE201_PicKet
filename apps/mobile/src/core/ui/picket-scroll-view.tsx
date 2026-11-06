import { forwardRef } from "react";
import { ScrollView, StyleSheet, useWindowDimensions, type ScrollViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePathname } from "expo-router";
import { screenBottomPadding } from "./navigation-layout";
import { paperSpace } from "../theme/paper-foundations";

/** Shared vertical page layout; horizontal filters retain their intrinsic sizing. */
export const PicketScrollView = forwardRef<ScrollView, ScrollViewProps>(function PicketScrollView({ contentContainerStyle, horizontal, ...props }, ref) {
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const pathname = usePathname();
  const existing = StyleSheet.flatten(contentContainerStyle);
  return <ScrollView ref={ref} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} {...props} horizontal={horizontal} contentContainerStyle={horizontal ? contentContainerStyle : [
    { padding: paperSpace.screen, width: "100%", maxWidth: 720, alignSelf: "center" },
    contentContainerStyle,
    { paddingBottom: Math.max(typeof existing?.paddingBottom === "number" ? existing.paddingBottom : 0, screenBottomPadding(pathname, insets.bottom, fontScale)) },
  ]} />;
});
