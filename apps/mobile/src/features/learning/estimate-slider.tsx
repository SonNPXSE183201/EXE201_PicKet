import { useState } from "react";
import { StyleSheet, View, type AccessibilityActionEvent } from "react-native";
import { coarseEstimateStep, snapEstimate } from "@picket/domain";
import { PicketText as Text } from "@/core/ui/picket-text";
import { figmaShadow, figmaText } from "@/core/ui/figma-ui";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";

/**
 * Dependency-free estimate slider with optional revealed answer dot.
 * Exposed to TalkBack as one adjustable control whose value is spoken as money.
 */
export function EstimateSlider({ value, min, max, step, answer, disabled, format, label, minLabel, maxLabel, onChange }: {
  value: number; min: number; max: number; step: number; answer?: number; disabled: boolean; label: string;
  minLabel?: string; maxLabel?: string;
  format(value: number): string; onChange(value: number): void;
}) {
  const { styles } = useMobileStyles(createStyles);
  const [width, setWidth] = useState(0);
  const coarse = coarseEstimateStep(min, max, step);
  const move = (x: number) => {
    if (!disabled && width > 0) onChange(snapEstimate(min + (x / width) * (max - min), min, max, step));
  };
  const nudge = (direction: 1 | -1) => {
    if (!disabled) onChange(snapEstimate(value + direction * coarse, min, max, step));
  };
  const ratio = max > min ? Math.min(1, Math.max(0, (value - min) / (max - min))) : 0;
  const answerRatio = answer !== undefined && max > min ? Math.min(1, Math.max(0, (answer - min) / (max - min))) : null;
  const thumbLeft = Math.max(0, Math.min(Math.max(0, width - 28), ratio * width - 14));
  const answerLeft = answerRatio !== null ? Math.max(0, Math.min(Math.max(0, width - 16), answerRatio * width - 8)) : 0;

  return (
    <View style={styles.wrap}>
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        accessibilityValue={{ min, max, now: value, text: format(value) }}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={(event: AccessibilityActionEvent) => nudge(event.nativeEvent.actionName === "increment" ? 1 : -1)}
        onLayout={event => setWidth(event.nativeEvent.layout.width)}
        style={styles.trackArea}
        onStartShouldSetResponder={() => !disabled}
        onMoveShouldSetResponder={() => !disabled}
        onResponderTerminationRequest={() => false}
        onResponderGrant={event => move(event.nativeEvent.locationX)}
        onResponderMove={event => move(event.nativeEvent.locationX)}
      >
        <View pointerEvents="none" style={styles.track}>
          <View style={[styles.fill, { width: `${ratio * 100}%` }]} />
        </View>
        {answerRatio !== null ? (
          <View pointerEvents="none" style={[styles.answerDot, { left: answerLeft }]} />
        ) : null}
        <View pointerEvents="none" style={[styles.thumb, figmaShadow("stub"), { left: thumbLeft }]} />
      </View>
      <View style={styles.endsRow}>
        <Text style={styles.endLabel}>{minLabel ?? format(min)}</Text>
        <Text style={[styles.endLabel, styles.endLabelRight]}>{maxLabel ?? format(max)}</Text>
      </View>
    </View>
  );
}

const createStyles = (colors: MobileThemeColors) => StyleSheet.create({
  wrap: {
    gap: 2,
  },
  trackArea: {
    minHeight: 44,
    justifyContent: "center",
    position: "relative",
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.selectedSurface,
    overflow: "hidden",
  },
  fill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  answerDot: {
    position: "absolute",
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.paper,
  },
  thumb: {
    position: "absolute",
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.paper,
  },
  endsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  endLabel: {
    ...figmaText.micro,
    color: colors.muted,
    flexShrink: 1,
  },
  endLabelRight: {
    textAlign: "right",
  },
});
