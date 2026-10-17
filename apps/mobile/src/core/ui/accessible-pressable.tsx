import {
  Pressable,
  StyleSheet,
  type PressableProps,
} from "react-native";

/** Android and WCAG-aligned minimum target used by every interactive surface. */
export const minimumTouchTarget = 48;

export function AccessiblePressable({
  accessibilityRole = "button",
  accessibilityState,
  disabled,
  hitSlop = 4,
  style,
  ...props
}: PressableProps) {
  const resolvedAccessibilityState =
    disabled == null
      ? accessibilityState
      : { ...accessibilityState, disabled };

  return (
    <Pressable
      {...props}
      android_ripple={props.android_ripple ?? { color: "rgba(74,44,42,0.12)" }}
      accessibilityRole={accessibilityRole}
      accessibilityState={resolvedAccessibilityState}
      disabled={disabled}
      hitSlop={hitSlop}
      style={(state) => [
        typeof style === "function" ? style(state) : style,
        styles.minimumTarget,
        disabled && styles.disabled,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  minimumTarget: {
    minHeight: minimumTouchTarget,
    minWidth: minimumTouchTarget,
  },
  disabled: { opacity: 0.5 },
});
