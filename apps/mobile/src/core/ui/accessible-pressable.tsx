import {
  Pressable,
  StyleSheet,
  type PressableProps,
} from "react-native";

/** Android and WCAG-aligned minimum target used by every interactive surface. */
export const minimumTouchTarget = 48;

export function AccessiblePressable({
  clipFeedback = true,
  accessibilityRole = "button",
  accessibilityState,
  disabled,
  hitSlop = 4,
  style,
  ...props
}: PressableProps & { clipFeedback?: boolean }) {
  const resolvedAccessibilityState =
    disabled == null
      ? accessibilityState
      : { ...accessibilityState, disabled };

  return (
    <Pressable
      {...props}
      android_ripple={props.android_ripple ?? { color: "rgba(121, 50, 104, 0.10)", borderless: false }}
      accessibilityRole={accessibilityRole}
      accessibilityState={resolvedAccessibilityState}
      disabled={disabled}
      hitSlop={hitSlop}
      style={(state) => [
        typeof style === "function" ? style(state) : style,
        styles.minimumTarget,
        { overflow: clipFeedback ? "hidden" : "visible" },
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
