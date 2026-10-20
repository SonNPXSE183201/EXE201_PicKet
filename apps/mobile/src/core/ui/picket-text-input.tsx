import { colors } from "@picket/design-tokens";
import { useLayoutEffect, useRef, useState } from "react";
import { StyleSheet, TextInput, type TextInputProps } from "react-native";
import { formatMoneyInput } from "./money-input";
import { editNativeMoneyInput, shouldReleaseMoneySelection } from "./native-money-input";
import { DateField } from "./date-field";

/** Shared focus, selection and disabled styling; screen-specific amount layouts stay intact. */
export function PicketTextInput({ style, onFocus, onBlur, editable, money = false, date = false, ...props }: TextInputProps & { money?: boolean; date?: boolean }) {
  const [focused, setFocused] = useState(false);
  const previousDisplay = useRef(formatMoneyInput(props.value ?? ""));
  const changeSelection = useRef<unknown>(undefined);
  const [moneySelection, setMoneySelection] = useState<{ start: number; end: number } | undefined>();
  useLayoutEffect(() => { previousDisplay.current = formatMoneyInput(props.value ?? ""); }, [props.value]);
  if (date) return <DateField label={props.accessibilityLabel ?? "Ngày"} value={props.value ?? ""} onChange={value => props.onChangeText?.(value)} style={style} disabled={editable === false} />;
  return <TextInput {...props} selection={props.selection ?? (money ? moneySelection : undefined)} onSelectionChange={event => {
    if (money && shouldReleaseMoneySelection(event.nativeEvent.selection, moneySelection, changeSelection.current)) setMoneySelection(undefined);
    props.onSelectionChange?.(event);
  }} value={money && props.value !== undefined ? formatMoneyInput(props.value) : props.value} onChange={money ? event => {
    // Android includes selection in this event; the installed RN TS declaration
    // omits that optional field, so validate it inside the formatting policy.
    const nativeEvent = event.nativeEvent as typeof event.nativeEvent & { selection?: unknown };
    changeSelection.current = nativeEvent.selection;
    const next = editNativeMoneyInput(previousDisplay.current, event.nativeEvent.text, nativeEvent.selection);
    previousDisplay.current = formatMoneyInput(next.raw);
    setMoneySelection(next.selection);
    props.onChange?.(event);
    props.onChangeText?.(next.raw);
  } : props.onChange} onChangeText={money ? undefined : props.onChangeText} accessibilityLabel={props.accessibilityLabel} editable={editable} placeholderTextColor={props.placeholderTextColor ?? colors.muted} selectionColor={props.selectionColor ?? colors.mauve} onFocus={(event) => { setFocused(true); onFocus?.(event); }} onBlur={(event) => { setFocused(false); onBlur?.(event); }} style={[styles.input, style, focused && styles.focused, editable === false && styles.disabled]} />;
}

const styles = StyleSheet.create({ input: { minHeight: 56, paddingHorizontal: 16, paddingVertical: 12, color: colors.ink, fontSize: 16, borderRadius: 12 }, focused: { borderColor: colors.mauve, borderWidth: 2 }, disabled: { opacity: 0.6 } });
