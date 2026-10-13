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
      accessibilityRole={accessibilityRole}
      accessibilityState={resolvedAccessibilityState}
      disabled={disabled}
      hitSlop={hitSlop}
      style={(state) => [
        styles.minimumTarget,
        typeof style === "function" ? style(state) : style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  minimumTarget: {
    minHeight: minimumTouchTarget,
    minWidth: minimumTouchTarget,
  },
});
