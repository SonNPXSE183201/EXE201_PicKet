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
  hitSlop,
  style,
  ...props
}: PressableProps & { clipFeedback?: boolean }) {
  const resolvedAccessibilityState =
    disabled == null
      ? accessibilityState
      : { ...accessibilityState, disabled };

  const flat = StyleSheet.flatten(typeof style === "function" ? style({ pressed: false, hovered: false }) : style) ?? {};
  const slop = (size: unknown) => typeof size === "number" && size < minimumTouchTarget ? Math.ceil((minimumTouchTarget - size) / 2) : 4;
  const resolvedSlop = hitSlop ?? { top: slop(flat.height), bottom: slop(flat.height), left: slop(flat.width), right: slop(flat.width) };

  return (
    <Pressable
      {...props}
      // Android ripples ignore borderRadius and paint a rectangle behind rounded controls; use a shape-safe press fade instead.
      android_ripple={props.android_ripple}
      accessibilityRole={accessibilityRole}
      accessibilityState={resolvedAccessibilityState}
      disabled={disabled}
      hitSlop={resolvedSlop}
      style={(state) => {
        const resolved = typeof style === "function" ? style(state) : style;
        const flat = StyleSheet.flatten(resolved) ?? {};
        // Visually compact controls (explicit width/height below 48) keep their Figma size; touch area grows via hitSlop.
        const compactW = typeof flat.width === "number" && flat.width < minimumTouchTarget;
        const compactH = typeof flat.height === "number" && flat.height < minimumTouchTarget;
        return [
          compactW ? null : { minWidth: minimumTouchTarget },
          compactH ? null : { minHeight: minimumTouchTarget },
          resolved,
          state.pressed && !props.android_ripple && !disabled && styles.pressed,
          { overflow: clipFeedback ? "hidden" : "visible" },
        ];
      }}
    />
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
});
