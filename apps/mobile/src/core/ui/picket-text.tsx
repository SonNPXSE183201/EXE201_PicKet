import { createContext, forwardRef, useContext } from "react";
import { StyleSheet, Text as NativeText, type TextProps } from "react-native";
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
    paperTextStyle(resolved, isLoaded("PicketDisplay"), nested),
  ]}><NestedText.Provider value>{children}</NestedText.Provider></NativeText>;
});
