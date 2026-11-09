import { useMgmtCopy } from "@/features/management/management-copy";
import { useState } from "react";
import { useManagementCopy } from "@/core/i18n/use-management-copy";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { Redirect, router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { routes } from "@/core/navigation/routes";
import { AppIcon } from "@/core/ui/app-icon";
import { IconButton, PicketScreen, TopAppBar } from "@/core/ui/picket-ui";
import { FigmaButton, ReceiptDivider } from "@/core/ui/figma-ui";
import { ChevronRow, FieldOverline, ManagementEmpty, PaperCard, Segmented } from "@/features/management/management-ui";
import { categoryTile } from "@/features/home/home-recent";
import { formatMoney } from "@/core/i18n/formatters";
import { useAppTheme } from "@/features/settings/appearance-provider";
import { useAuth } from "@/features/auth/auth-context";
import { useTransactions } from "@/features/transactions/transactions-context";

export default function CategoriesScreen() {
  const tx = useManagementCopy();
  const m = useMgmtCopy();
  const { colors, styles } = useMobileStyles(createStyles);
  const { session, localMode } = useAuth();
  const { language } = useAppTheme();
  const { categories, transactions } = useTransactions();
  const [kind, setKind] = useState<"expense" | "income">("expense");

  if (!session && !localMode) return <Redirect href={routes.login} />;

  const usage = new Map<string, { count: number; sum: number }>();
  for (const item of transactions) {
    if (item.deletedAt || !item.categoryId || item.kind !== kind) continue;
    const row = usage.get(item.categoryId) ?? { count: 0, sum: 0 };
    usage.set(item.categoryId, { count: row.count + 1, sum: row.sum + item.amount });
  }
  const visible = categories.filter((category) => category.kind === kind || category.kind === "both");
  const ranked = [...visible].sort((a, b) => (usage.get(b.id)?.count ?? 0) - (usage.get(a.id)?.count ?? 0));
  const popular = ranked.filter((category) => (usage.get(category.id)?.count ?? 0) > 0).slice(0, 3);
  const popularIds = new Set(popular.map((category) => category.id));
  const others = visible.filter((category) => !popularIds.has(category.id));

  const renderList = (list: typeof visible) => <PaperCard>
    {list.map((category, index) => {
      const tile = categoryTile(category.icon, category.name, kind === "income", colors);
      const used = usage.get(category.id);
      const meta = used ? `${used.count} ${used.count === 1 ? m.item : m.items} · ${formatMoney(used.sum, language, "VND")}` : category.custom ? m.mine : m.defaultCat;
      return <View key={category.id}>
        {index > 0 && <ReceiptDivider />}
        <ChevronRow disabled={!category.custom} onPress={() => router.push(routes.category(category.id))} tile={<AppIcon name={tile.name} size={18} color={colors.text} />} tileColor={tile.color} title={category.name} meta={meta} />
      </View>;
    })}
  </PaperCard>;

  return (
    <PicketScreen>
      <TopAppBar title={m.categories} action={<IconButton icon="plus" label={tx("Thêm danh mục")} variant="surface" onPress={() => router.push(routes.newCategory)} />} />
      <View style={styles.block}>
        <Segmented<"expense" | "income"> value={kind} onChange={setKind} options={[{ value: "expense", label: m.expense }, { value: "income", label: m.income }]} />
      </View>
      {categories.length === 0 ? (
        <ManagementEmpty art="empty" title={tx("Chưa có danh mục")} body={tx("Thêm danh mục đầu tiên để phân loại giao dịch.")} action={<FigmaButton fullWidth icon="plus" label={tx("Tạo danh mục")} onPress={() => router.push(routes.newCategory)} />} />
      ) : (
        <>
          {popular.length > 0 && <View style={styles.block}><FieldOverline>{m.popular}</FieldOverline>{renderList(popular)}</View>}
          {others.length > 0 && <View style={styles.block}><FieldOverline>{m.other}</FieldOverline>{renderList(others)}</View>}
        </>
      )}
    </PicketScreen>
  );
}

const createStyles = (_colors: MobileThemeColors) =>
  StyleSheet.create({
    block: { marginTop: 20, gap: 8 },
  });
