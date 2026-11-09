import { View } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { figmaType } from "@picket/design-tokens";
import { PicketText as Text } from "@/core/ui/picket-text";
import { AppIcon, type IconName } from "@/core/ui/app-icon";
import { FigmaButton, Overline, ReceiptEdge, ReceiptDivider, ReceiptSheet, SectionHeader, Skeleton, TransactionRow, figmaShadow } from "@/core/ui/figma-ui";
import { routes } from "@/core/navigation/routes";
import { categoryArt } from "@/core/theme/category-art";
import type { PaperAssetId } from "@/core/theme/paper-assets";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";

const icons: Partial<Record<PaperAssetId, IconName>> = {
  food: "silverware-fork-knife", cafe: "coffee-outline", groceries: "cart-outline", transport: "car-outline", vehicle: "car-wrench", health: "heart-outline", fitness: "dumbbell",
  beauty: "face-woman-shimmer-outline", pet: "paw-outline", education: "school-outline", bills: "receipt-text-outline", savings: "piggy-bank-outline", security: "shield-outline",
  gift: "gift-outline", home: "home-outline", leisure: "movie-open-outline", gaming: "gamepad-variant-outline", music: "music-note-outline", salary: "cash", bonus: "cash-plus", investment: "chart-line", travel: "airplane", shopping: "shopping-outline",
};
const tones: Partial<Record<PaperAssetId, "pocketCoral" | "pocketBlue" | "pocketMint" | "pocketLilac">> = {
  food: "pocketCoral", cafe: "pocketCoral", groceries: "pocketCoral", transport: "pocketBlue", vehicle: "pocketBlue", travel: "pocketBlue", salary: "pocketMint", bonus: "pocketMint", investment: "pocketMint", savings: "pocketMint",
};

/** Row icon: stroke icon on a category-tinted tile (Figma: no illustration). */
export function categoryTile(icon: string | null, name: string, income: boolean, colors: MobileThemeColors) {
  const art = categoryArt(icon, name);
  const tone = income ? "pocketMint" : tones[art] ?? "pocketLilac";
  return { name: icons[art] ?? "shape-outline" as IconName, color: colors[tone] };
}

export type RecentRow = { id: string; title: string; meta: string; amount: string; kind: string; icon: string | null; categoryName: string; group: string };

/** Gần đây: receipt sheet grouped by day, or the empty receipt paper. */
export function HomeRecent({ rows, onAdd, onOpen }: { rows: RecentRow[]; onAdd(): void; onOpen(id: string): void }) {
  const { t } = useTranslation("overview");
  const { colors } = useMobileStyles(() => ({}));
  const header = <SectionHeader overline={t("homeRecentOverline")} title={t("homeRecentTitle")} action={rows.length ? "link" : "none"} actionLabel={t("viewAll")} onAction={() => router.push(routes.transactions)} />;
  if (!rows.length) return <View style={{ gap: 12 }}>{header}
    <View style={[{ alignSelf: "stretch" }, figmaShadow("paper")]}>
      <View style={{ backgroundColor: colors.paper, borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingTop: 24, paddingBottom: 20, paddingHorizontal: 16, alignItems: "center", gap: 6 }}>
        <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: colors.pocketCoral, alignItems: "center", justifyContent: "center", marginBottom: 4 }}><AppIcon name="note-text-outline" size={20} color={colors.text} /></View>
        <Text style={[figmaType.bodyStrong, { color: colors.text, textAlign: "center" }]}>{t("homeEmptyTitle")}</Text>
        <Text style={[figmaType.bodySmall, { color: colors.muted, textAlign: "center" }]}>{t("homeEmptyBody")}</Text>
        <View style={{ height: 8 }} />
        <FigmaButton variant="outline" size="medium" label={t("homeManualAdd")} onPress={onAdd} />
      </View>
      <ReceiptEdge direction="bottom" />
    </View></View>;
  const groups: { group: string; rows: RecentRow[] }[] = [];
  for (const row of rows) { const last = groups[groups.length - 1]; if (last?.group === row.group) last.rows.push(row); else groups.push({ group: row.group, rows: [row] }); }
  return <View style={{ gap: 12 }}>{header}
    <ReceiptSheet>{groups.map((group, index) => <View key={group.group} style={{ gap: 8 }}>
      {index > 0 && <ReceiptDivider />}
      <Overline>{group.group}</Overline>
      {group.rows.map(row => { const tile = categoryTile(row.icon, row.categoryName || row.title, row.kind === "income", colors); const amountColor = row.kind === "expense" ? colors.expense : row.kind === "income" ? colors.income : colors.primary;
        return <TransactionRow key={row.id} tileColor={tile.color} tile={<AppIcon name={tile.name} size={18} color={colors.text} />} title={row.title} meta={row.meta} amount={row.amount} amountColor={amountColor} onPress={() => onOpen(row.id)} />; })}
    </View>)}</ReceiptSheet></View>;
}

export function HomeRecentSkeleton() {
  const { t } = useTranslation("overview");
  return <View style={{ gap: 12 }}><SectionHeader overline={t("homeRecentOverline")} title={t("homeRecentTitle")} />
    <ReceiptSheet><Skeleton width={120} height={10} />{[[150, 96], [120, 80], [170, 70]].map(([a, b], i) => <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 6 }}><Skeleton width={32} height={32} radius={11} /><View style={{ flex: 1, gap: 8 }}><Skeleton width={a} height={8} /><Skeleton width={b} height={6} /></View><Skeleton width={48} height={8} /></View>)}</ReceiptSheet></View>;
}
