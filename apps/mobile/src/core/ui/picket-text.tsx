import { createContext, forwardRef, useContext } from "react";
import { PixelRatio, StyleSheet, Text as NativeText, type TextProps } from "react-native";
import { isLoaded } from "expo-font";
import { useAppTheme } from "@/features/settings/appearance-provider";
import { paperTextStyle } from "../theme/paper-text-style";

const NestedText = createContext(false);

/** One typography baseline, including inline feature content and native font fallback. */
export const PicketText = forwardRef<NativeText, TextProps>(function PicketText({ style, children, ...props }, ref) {
  const { colors } = useAppTheme();
  const nested = useContext(NestedText);
  const resolved = StyleSheet.flatten(style) ?? {};
  return <NativeText ref={ref} {...props} style={[
    !nested && { color: colors.text, fontWeight: "400" },
    style,
    minimumScaleStyle(paperTextStyle(resolved, isLoaded("PicketDisplay"), nested)),
  ]}><NestedText.Provider value>{children}</NestedText.Provider></NativeText>;
});

/** Never render below the Figma size: a reduced system font scale (<1) is undone, larger accessibility scales still apply. */
function minimumScaleStyle<T extends { fontSize?: number; lineHeight?: number }>(style: T): T {
  const scale = PixelRatio.getFontScale();
  if (!(scale > 0 && scale < 1) || style.fontSize == null) return style;
  return { ...style, fontSize: style.fontSize / scale, lineHeight: style.lineHeight == null ? undefined : style.lineHeight / scale };
}
