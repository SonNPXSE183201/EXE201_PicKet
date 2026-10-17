import { colors } from "@picket/design-tokens";
import { useState } from "react";
import { StyleSheet, TextInput, type TextInputProps } from "react-native";
import { formatMoneyInput, normalizeMoneyInput } from "./money-input";

/** Shared focus, selection and disabled styling; screen-specific amount layouts stay intact. */
export function PicketTextInput({ style, onFocus, onBlur, editable, money = false, ...props }: TextInputProps & { money?: boolean }) {
  const [focused, setFocused] = useState(false);
  return <TextInput {...props} value={money && props.value !== undefined ? formatMoneyInput(props.value) : props.value} onChangeText={money ? (value) => props.onChangeText?.(normalizeMoneyInput(value)) : props.onChangeText} accessibilityLabel={props.accessibilityLabel} editable={editable} placeholderTextColor={props.placeholderTextColor ?? colors.muted} selectionColor={colors.mauve} onFocus={(event) => { setFocused(true); onFocus?.(event); }} onBlur={(event) => { setFocused(false); onBlur?.(event); }} style={[styles.input, style, focused && styles.focused, editable === false && styles.disabled]} />;
}

const styles = StyleSheet.create({ input: { minHeight: 56, paddingHorizontal: 16, paddingVertical: 12, color: colors.ink, fontSize: 16, borderRadius: 12 }, focused: { borderColor: colors.mauve, borderWidth: 2 }, disabled: { opacity: 0.6 } });
