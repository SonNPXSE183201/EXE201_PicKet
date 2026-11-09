import { useMemo, useState, type PropsWithChildren } from "react";
import { Modal, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { figmaType } from "@picket/design-tokens";
import { PicketText as Text } from "@/core/ui/picket-text";
import { PicketTextInput as TextInput } from "@/core/ui/picket-text-input";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { AppIcon, type IconName } from "@/core/ui/app-icon";
import { ReceiptDivider } from "@/core/ui/figma-ui";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";

/** Figma "Sheet": white bottom sheet, 28 top radius, 40x4 handle, 16/800 title and close button. */
export function PickerSheet({ title, visible, onClose, closeLabel, children }: PropsWithChildren<{ title: string; visible: boolean; onClose(): void; closeLabel: string }>) {
  const { colors, styles } = useMobileStyles(createStyles);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable accessibilityLabel={closeLabel} onPress={onClose} style={styles.backdrop} />
        <SafeAreaView edges={["bottom"]} accessibilityViewIsModal style={styles.sheet}>
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.handle} />
          <View style={styles.header}>
            <Text accessibilityRole="header" style={styles.title}>{title}</Text>
            <Pressable accessibilityLabel={closeLabel} hitSlop={10} onPress={onClose}><AppIcon name="close" size={24} color={colors.text} /></Pressable>
          </View>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">{children}</ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

export type CategoryOption = { id: string; name: string; icon: IconName; tint: string };

/** S1 Chọn danh mục: search pill + 4-column CategoryTile grid. Selected tile = tint fill + 1.5 primary border. */
export function CategoryPickerSheet({ title, searchPlaceholder, closeLabel, options, selectedId, onSelect, onClose, visible }: {
  title: string; searchPlaceholder: string; closeLabel: string; options: CategoryOption[]; selectedId?: string; onSelect(id: string): void; onClose(): void; visible: boolean;
}) {
  const { colors, styles } = useMobileStyles(createStyles);
  const [query, setQuery] = useState("");
  const shown = useMemo(() => options.filter((option) => option.name.toLowerCase().includes(query.trim().toLowerCase())), [options, query]);
  return (
    <PickerSheet title={title} visible={visible} onClose={onClose} closeLabel={closeLabel}>
      <View style={styles.search}>
        <AppIcon name="magnify" size={16} color={colors.muted} />
        <TextInput accessibilityLabel={searchPlaceholder} placeholder={searchPlaceholder} placeholderTextColor={colors.muted} value={query} onChangeText={setQuery} style={styles.searchInput} />
      </View>
      <View style={styles.grid}>
        {shown.map((option) => {
          const selected = option.id === selectedId;
          return (
            <Pressable key={option.id} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => onSelect(option.id)} style={styles.tileWrap}>
              <View style={[styles.tile, selected ? { backgroundColor: option.tint, borderColor: colors.primary, borderWidth: 1.5 } : null]}>
                <AppIcon name={option.icon} size={20} color={colors.text} />
              </View>
              <Text numberOfLines={1} style={[styles.tileLabel, selected && styles.tileLabelSelected]}>{option.name}</Text>
            </Pressable>
          );
        })}
      </View>
    </PickerSheet>
  );
}

export type WalletOption = { id: string; name: string; meta?: string; balance?: string };

/** S2 Chọn ví: one row per wallet inside a white paper group, divided by dashed lines. */
export function WalletPickerSheet({ title, closeLabel, options, selectedId, onSelect, onClose, visible }: {
  title: string; closeLabel: string; options: WalletOption[]; selectedId?: string; onSelect(id: string): void; onClose(): void; visible: boolean;
}) {
  const { colors, styles } = useMobileStyles(createStyles);
  return (
    <PickerSheet title={title} visible={visible} onClose={onClose} closeLabel={closeLabel}>
      <View>
        {options.map((option, index) => {
          const selected = option.id === selectedId;
          return (
            <View key={option.id}>
              {index > 0 ? <ReceiptDivider /> : null}
              <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={() => onSelect(option.id)} style={styles.walletRow}>
                <View style={[styles.walletTile, selected && { backgroundColor: colors.selectedSurface }]}><AppIcon name="wallet-outline" size={20} color={selected ? colors.primary : colors.text} /></View>
                <View style={styles.walletText}>
                  <Text numberOfLines={1} style={styles.walletName}>{option.name}</Text>
                  {option.meta ? <Text numberOfLines={1} style={styles.walletMeta}>{option.meta}</Text> : null}
                </View>
                {option.balance ? <Text style={styles.walletBalance}>{option.balance}</Text> : null}
                {selected ? <AppIcon name="check-circle" size={20} color={colors.primary} /> : null}
              </Pressable>
            </View>
          );
        })}
      </View>
    </PickerSheet>
  );
}

const createStyles = (colors: MobileThemeColors) => StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: colors.text, opacity: 0.5 },
  sheet: { backgroundColor: colors.paper, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "85%" },
  handle: { alignSelf: "center", backgroundColor: colors.border, borderRadius: 2, height: 4, marginTop: 10, width: 40 },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 16 },
  title: { ...figmaType.titleSection, color: colors.text },
  scroll: { flexGrow: 0 },
  content: { gap: 14, paddingBottom: 24, paddingHorizontal: 20, paddingTop: 16 },
  search: { alignItems: "center", backgroundColor: colors.elevated, borderRadius: 999, flexDirection: "row", gap: 8, paddingHorizontal: 14 },
  searchInput: { ...figmaType.bodySmall, color: colors.text, flex: 1, minHeight: 40, padding: 0 },
  grid: { flexDirection: "row", flexWrap: "wrap", rowGap: 14 },
  tileWrap: { alignItems: "center", gap: 6, width: "25%" },
  tile: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 16, borderWidth: 1, height: 52, justifyContent: "center", width: 52 },
  tileLabel: { ...figmaType.tab, color: colors.text },
  tileLabelSelected: { ...figmaType.tabActive, color: colors.primary },
  walletRow: { alignItems: "center", flexDirection: "row", gap: 12, minHeight: 56, padding: 8 },
  walletTile: { alignItems: "center", backgroundColor: colors.elevated, borderRadius: 12, height: 36, justifyContent: "center", width: 36 },
  walletText: { flex: 1 },
  walletName: { ...figmaType.bodyStrong, color: colors.text },
  walletMeta: { ...figmaType.tab, color: colors.muted },
  walletBalance: { ...figmaType.bodyStrong, color: colors.text },
});
