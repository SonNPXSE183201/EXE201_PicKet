import { useState } from "react";
import { View, type AccessibilityActionEvent } from "react-native";
import { useTranslation } from "react-i18next";
import { IconButton } from "@/core/ui/picket-ui";
import { useAppTheme } from "@/features/settings/appearance-provider";
import { coarseEstimateStep, snapEstimate } from "@picket/domain";

/**
 * Dependency-free slider: a drag/tap track plus -/+ buttons. Exposed to
 * TalkBack as one adjustable control whose value is spoken as money.
 */
export function EstimateSlider({ value, min, max, step, disabled, format, label, onChange }: {
  value: number; min: number; max: number; step: number; disabled: boolean; label: string;
  format(value: number): string; onChange(value: number): void;
}) {
  const { colors: c } = useAppTheme();
  const { t } = useTranslation("learning");
  const [width, setWidth] = useState(0);
  const coarse = coarseEstimateStep(min, max, step);
  const move = (x: number) => { if (!disabled && width > 0) onChange(snapEstimate(min + (x / width) * (max - min), min, max, step)); };
  const nudge = (direction: 1 | -1) => { if (!disabled) onChange(snapEstimate(value + direction * coarse, min, max, step)); };
  const ratio = max > min ? (value - min) / (max - min) : 0;
  return <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
    <IconButton icon="minus" label={t("decrease")} variant="surface" disabled={disabled || value <= min} onPress={() => nudge(-1)} />
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      accessibilityValue={{ min, max, now: value, text: format(value) }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(event: AccessibilityActionEvent) => nudge(event.nativeEvent.actionName === "increment" ? 1 : -1)}
      onLayout={event => setWidth(event.nativeEvent.layout.width)}
      style={{ flex: 1, minHeight: 48, justifyContent: "center" }}
      onStartShouldSetResponder={() => !disabled}
      onMoveShouldSetResponder={() => !disabled}
      onResponderTerminationRequest={() => false}
      onResponderGrant={event => move(event.nativeEvent.locationX)}
      onResponderMove={event => move(event.nativeEvent.locationX)}
    >
      <View pointerEvents="none" style={{ height: 8, borderRadius: 4, backgroundColor: c.disabledSurface, overflow: "hidden" }}>
        <View style={{ width: `${ratio * 100}%`, height: 8, backgroundColor: disabled ? c.disabledText : c.primary }} />
      </View>
      <View pointerEvents="none" style={{ position: "absolute", left: Math.max(0, Math.min(Math.max(0, width - 28), ratio * width - 14)), width: 28, height: 28, borderRadius: 14,
        backgroundColor: c.surface, borderWidth: 3, borderColor: disabled ? c.disabledText : c.primary }} />
    </View>
    <IconButton icon="plus" label={t("increase")} variant="surface" disabled={disabled || value >= max} onPress={() => nudge(1)} />
  </View>;
}
