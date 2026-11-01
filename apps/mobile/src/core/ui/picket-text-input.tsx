import { paperControl, paperShape } from "@/core/theme/paper-foundations";
import { isLoaded } from "expo-font";

import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { useLayoutEffect, useRef, useState } from "react";
import { StyleSheet, TextInput, type TextInputProps } from "react-native";
import { formatMoneyInput } from "./money-input";
import { editNativeMoneyInput, shouldReleaseMoneySelection } from "./native-money-input";
import { DateField } from "./date-field";

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
      underlineColorAndroid={props.underlineColorAndroid ?? (borderless ? "transparent" : undefined)}
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
        focused && !borderless && styles.focused,
        borderless && { borderWidth: 0, borderColor: "transparent", backgroundColor: "transparent" },
        editable === false && styles.disabled,
      ]}
    />
  );
}

const createStyles = (colors: MobileThemeColors) =>
  StyleSheet.create({
    input: {
      fontWeight: "400",
      fontFamily: isLoaded("PicketDisplay") ? "PicketDisplay" : undefined,
      borderWidth: 1,
      borderColor: colors.controlBorder,
      backgroundColor: colors.surface,
      minHeight: paperControl.height,
      paddingHorizontal: 16,
      paddingVertical: 10,
      color: colors.ink,
      fontSize: 16,
      borderRadius: paperShape.input,
    },
    focused: { borderColor: colors.focusRing, borderWidth: 2 },
    disabled: { backgroundColor: colors.disabledSurface, color: colors.disabledText },
  });
