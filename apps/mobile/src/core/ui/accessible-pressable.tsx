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
      // Android ripples ignore borderRadius and paint a rectangle behind rounded controls; use a shape-safe press fade instead.
      android_ripple={props.android_ripple}
      accessibilityRole={accessibilityRole}
      accessibilityState={resolvedAccessibilityState}
      disabled={disabled}
      hitSlop={hitSlop}
      style={(state) => [
        typeof style === "function" ? style(state) : style,
        styles.minimumTarget,
        state.pressed && !props.android_ripple && !disabled && styles.pressed,
        { overflow: clipFeedback ? "hidden" : "visible" },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  minimumTarget: {
    minHeight: minimumTouchTarget,
    minWidth: minimumTouchTarget,
  },
});
