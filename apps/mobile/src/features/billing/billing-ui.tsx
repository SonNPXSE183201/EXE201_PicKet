import type { ReactNode } from "react";
import { Image, StyleSheet, View } from "react-native";
import { figmaColors, figmaType } from "@picket/design-tokens";
import { paperAssets } from "@/core/theme/paper-assets";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { AppIcon } from "@/core/ui/app-icon";
import { Chip, figmaShadow } from "@/core/ui/figma-ui";
import { PicketText as Text } from "@/core/ui/picket-text";

/* Figma G11 "Gói Picket" building blocks, shared by the PayOS and Google Play
   screens so both payment channels look and read the same. */

const receiptArt = paperAssets.receipt;
const coinsArt = paperAssets.savings;
const sproutArt = paperAssets.investment;

export type Cadence = "monthly" | "yearly";
export type PlanTier = "plus" | "pro";

/** Purple pouch: current tier, cloud OCR quota and a caption (renewal, no auto-renew…). */
export function CurrentPlanHero({ label, headline, caption, meter, warning }: { label: string; headline: string; caption?: string; meter?: number | null; warning?: string | null }) {
  const { styles } = useMobileStyles(createStyles);
  return (
    <View style={[styles.hero, figmaShadow("paper")]}>
      <View pointerEvents="none" style={styles.stitch} />
      <Image accessible={false} source={receiptArt} resizeMode="contain" style={styles.heroArt} />
      <Text style={[figmaType.captionStrong, styles.onHero]}>{label}</Text>
      <Text style={[figmaType.amountHero, styles.onHero]}>{headline}</Text>
      {meter != null && (
        <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(meter * 100) }} style={styles.meter}>
          <View style={[styles.meterFill, { width: `${Math.min(100, Math.max(0, meter * 100))}%` }]} />
        </View>
      )}
      {!!caption && <Text style={[figmaType.bodySmall, styles.onHero]}>{caption}</Text>}
      {!!warning && <Text accessibilityLiveRegion="polite" style={[figmaType.captionStrong, styles.onHero]}>{warning}</Text>}
    </View>
  );
}

/** "Theo tháng / Theo năm · −20%" segmented control. */
export function CadenceToggle({ value, onChange, monthlyLabel, yearlyLabel, disabled = false }: { value: Cadence; onChange(value: Cadence): void; monthlyLabel: string; yearlyLabel: string; disabled?: boolean }) {
  const { styles } = useMobileStyles(createStyles);
  return (
    <View accessibilityRole="tablist" style={styles.toggle}>
      {(["monthly", "yearly"] as const).map((option) => {
        const selected = value === option;
        return (
          <Pressable key={option} accessibilityRole="tab" accessibilityState={{ selected, disabled }} disabled={disabled} onPress={() => onChange(option)} style={[styles.toggleItem, selected && styles.toggleSelected]}>
            <Text style={[figmaType.button, selected ? styles.toggleTextSelected : styles.toggleText]}>{option === "monthly" ? monthlyLabel : yearlyLabel}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export type PlanTileModel = { id: string; tier: PlanTier; name: string; quota: string; price: string; note?: string | null; badge?: string | null; current?: boolean };

/** Two tiles side by side (Plus blue, Pro lilac); the selected one gets the primary border and check. */
export function PlanTiles({ plans, selectedId, onSelect, disabled = false, currentLabel }: { plans: PlanTileModel[]; selectedId: string | null; onSelect(id: string): void; disabled?: boolean; currentLabel: string }) {
  const { colors, styles } = useMobileStyles(createStyles);
  return (
    <View style={styles.tiles}>
      {plans.map((plan) => {
        const selected = plan.id === selectedId;
        return (
          <Pressable
            key={plan.id}
            accessibilityRole="radio"
            accessibilityState={{ selected, disabled }}
            accessibilityLabel={`${plan.name}, ${plan.quota}, ${plan.price}`}
            disabled={disabled}
            onPress={() => onSelect(plan.id)}
            style={[styles.tile, { backgroundColor: plan.tier === "pro" ? colors.pocketLilac : colors.pocketBlue }, selected && styles.tileSelected]}
          >
            {selected && <View style={styles.check}><AppIcon name="check" size={16} color={colors.onPrimary} /></View>}
            <Image accessible={false} source={plan.tier === "pro" ? sproutArt : coinsArt} resizeMode="contain" style={styles.tileArt} />
            {plan.badge ? <Chip size="small" tone="success" label={plan.badge} style={styles.badge} /> : null}
            <Text style={[figmaType.bodyStrong, { color: figmaColors.text }]}>{plan.name}</Text>
            <Text style={[figmaType.captionStrong, { color: figmaColors.text }]}>{plan.quota}</Text>
            <Text style={[figmaType.bodyStrong, { color: figmaColors.text }]}>{plan.price}</Text>
            {!!plan.note && <Text style={[figmaType.captionStrong, { color: figmaColors.muted }]}>{plan.note}</Text>}
            {plan.current && <Text style={[figmaType.captionStrong, { color: figmaColors.primary }]}>{currentLabel}</Text>}
          </Pressable>
        );
      })}
    </View>
  );
}

/** "Gói nào cũng có" checklist. */
export function IncludedList({ title, items }: { title: string; items: string[] }) {
  const { colors, styles } = useMobileStyles(createStyles);
  return (
    <View style={[styles.paper, figmaShadow("paper")]}>
      <Text accessibilityRole="header" style={[figmaType.overline, { color: colors.muted }]}>{title.toUpperCase()}</Text>
      {items.map((item) => (
        <View key={item} style={styles.includedRow}>
          <View style={styles.includedTick}><AppIcon name="check" size={14} color={colors.income} /></View>
          <Text style={[figmaType.bodySmall, { color: colors.text, flex: 1 }]}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

/** "Cảm ơn bạn đã ủng hộ Picket!" shown once a paid plan is active. */
export function ThankYouCard({ title, body }: { title: string; body: string }) {
  const { colors, styles } = useMobileStyles(createStyles);
  return (
    <View style={styles.thanks}>
      <View style={styles.includedTickLarge}><AppIcon name="check" size={20} color={colors.income} /></View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={[figmaType.bodyStrong, { color: colors.text }]}>{title}</Text>
        <Text style={[figmaType.bodySmall, { color: colors.muted }]}>{body}</Text>
      </View>
    </View>
  );
}

/** Paper card with an overline heading; used for payment history and store tools. */
export function BillingSection({ title, children }: { title: string; children: ReactNode }) {
  const { colors, styles } = useMobileStyles(createStyles);
  return (
    <View style={{ gap: 8 }}>
      <Text accessibilityRole="header" style={[figmaType.overline, { color: colors.muted }]}>{title.toUpperCase()}</Text>
      <View style={[styles.paper, figmaShadow("paper")]}>{children}</View>
    </View>
  );
}

const createStyles = (colors: MobileThemeColors) => StyleSheet.create({
  hero: { backgroundColor: colors.camera, borderRadius: 28, borderBottomLeftRadius: 14, paddingHorizontal: 24, paddingVertical: 22, gap: 6, overflow: "hidden" },
  stitch: { position: "absolute", left: 8, right: 8, top: 8, bottom: 8, borderWidth: 1.5, borderStyle: "dashed", borderColor: "rgba(255,255,255,0.55)", borderRadius: 22, borderBottomLeftRadius: 10 },
  heroArt: { position: "absolute", right: -6, bottom: -4, width: 96, height: 96 },
  onHero: { color: colors.onCamera, paddingRight: 72 },
  meter: { height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.25)", overflow: "hidden", marginVertical: 6, marginRight: 76 },
  meterFill: { height: 8, borderRadius: 4, backgroundColor: colors.pocketCoral },
  toggle: { flexDirection: "row", backgroundColor: colors.elevated, borderRadius: 24, padding: 4, gap: 4 },
  toggleItem: { flex: 1, minHeight: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  toggleSelected: { backgroundColor: colors.paper, ...figmaShadow("stub") },
  toggleText: { color: colors.muted },
  toggleTextSelected: { color: colors.primary },
  tiles: { flexDirection: "row", gap: 12 },
  tile: { flex: 1, minHeight: 168, borderRadius: 18, padding: 14, gap: 4, justifyContent: "flex-end", borderWidth: 2, borderColor: "transparent" },
  tileSelected: { borderColor: figmaColors.primary },
  tileArt: { position: "absolute", top: -14, right: 6, width: 72, height: 72 },
  check: { position: "absolute", top: 10, left: 10, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  badge: { alignSelf: "flex-start" },
  paper: { backgroundColor: colors.paper, borderRadius: 18, padding: 16, gap: 10 },
  includedRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  includedTick: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: colors.elevated },
  includedTickLarge: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.elevated },
  thanks: { flexDirection: "row", gap: 12, alignItems: "flex-start", borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 16, backgroundColor: colors.surface },
});
