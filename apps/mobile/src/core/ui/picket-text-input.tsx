import { paperControl } from "@/core/theme/paper-foundations";
import { isLoaded } from "expo-font";
import { paperTextStyle } from "@/core/theme/paper-text-style";

import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { createContext, useContext, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { StyleSheet, TextInput, type TextInputProps } from "react-native";
import { formatMoneyInput } from "./money-input";
import { editNativeMoneyInput, shouldReleaseMoneySelection } from "./native-money-input";
import { DateField } from "./date-field";

const FlatFieldContext = createContext(false);
/** Inputs inside a Figma FieldRow sit flat on the paper (label above, bare value, underline on focus). */
export function FlatField({ children }: { children: ReactNode }) {
  return <FlatFieldContext.Provider value>{children}</FlatFieldContext.Provider>;
}

/** Shared focus, selection and disabled styling; screen-specific amount layouts stay intact. */
export function PicketTextInput({
  style,
  onFocus,
  onBlur,
  editable,
  money = false,
  date = false,
  borderless = false,
  ...props
}: TextInputProps & { money?: boolean; date?: boolean; borderless?: boolean }) {
  const { colors, styles, theme } = useMobileStyles(createStyles);
  // Hero amount inputs (>= 24pt) are bare numbers on the paper, like inside a FieldRow.
  const flat = useContext(FlatFieldContext) || ((StyleSheet.flatten(style) as { fontSize?: number } | undefined)?.fontSize ?? 0) >= 24;
  const [focused, setFocused] = useState(false);
  const previousDisplay = useRef(formatMoneyInput(props.value ?? ""));
  const changeSelection = useRef<unknown>(undefined);
  const [moneySelection, setMoneySelection] = useState<{ start: number; end: number } | undefined>();

  useLayoutEffect(() => {
    previousDisplay.current = formatMoneyInput(props.value ?? "");
  }, [props.value]);

  if (date) {
    return (
      <DateField
        label={props.accessibilityLabel ?? "Ngày"}
        value={props.value ?? ""}
        onChange={(value) => props.onChangeText?.(value)}
        style={style}
        disabled={editable === false}
      />
    );
  }

  return (
    <TextInput
      {...props}
      underlineColorAndroid={props.underlineColorAndroid ?? (borderless || flat ? "transparent" : undefined)}
      keyboardAppearance={props.keyboardAppearance ?? theme}
      selection={props.selection ?? (money ? moneySelection : undefined)}
      onSelectionChange={(event) => {
        if (money && shouldReleaseMoneySelection(event.nativeEvent.selection, moneySelection, changeSelection.current)) {
          setMoneySelection(undefined);
        }
        props.onSelectionChange?.(event);
      }}
      value={money && props.value !== undefined ? formatMoneyInput(props.value) : props.value}
      onChange={
        money
          ? (event) => {
              const nativeEvent = event.nativeEvent as typeof event.nativeEvent & { selection?: unknown };
              changeSelection.current = nativeEvent.selection;
              const next = editNativeMoneyInput(previousDisplay.current, event.nativeEvent.text, nativeEvent.selection);
              previousDisplay.current = formatMoneyInput(next.raw);
              setMoneySelection(next.selection);
              props.onChange?.(event);
              props.onChangeText?.(next.raw);
            }
          : props.onChange
      }
      onChangeText={money ? undefined : props.onChangeText}
      accessibilityLabel={props.accessibilityLabel}
      editable={editable}
      placeholderTextColor={props.placeholderTextColor ?? colors.muted}
      selectionColor={props.selectionColor ?? colors.focusRing}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      style={[
        styles.input,
        style,
        flat && styles.flat,
        flat && focused && styles.flatFocused,
        focused && !borderless && !flat && styles.focused,
        borderless && { borderWidth: 0, borderColor: "transparent", backgroundColor: "transparent" },
        editable === false && styles.disabled,
      ]}
    />
  );
}

const createStyles = (colors: MobileThemeColors) =>
  StyleSheet.create({
    input: {
      // Figma field: white paper, 1px border, 14/700 Nunito value, 11-12/600 muted placeholder.
      ...paperTextStyle({ fontSize: 14, fontWeight: "700", lineHeight: 21 }, isLoaded("PicketDisplay")),
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.paper,
      minHeight: paperControl.height,
      paddingHorizontal: 16,
      paddingVertical: 10,
      color: colors.text,
      borderRadius: 16,
    },
    flat: { borderWidth: 0, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: "transparent", minHeight: 24, height: undefined, paddingHorizontal: 0, paddingVertical: 0, borderRadius: 0 },
    flatFocused: { borderBottomColor: colors.primary, borderBottomWidth: 1.5 },
    focused: { borderColor: colors.primary, borderWidth: 1.5, backgroundColor: colors.paper },
    disabled: { backgroundColor: colors.elevated, color: colors.muted },
  });
