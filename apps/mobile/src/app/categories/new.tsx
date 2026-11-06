import { paperControl, paperShape } from "@/core/theme/paper-foundations";
import { PicketText as Text } from "@/core/ui/picket-text";

import { useManagementCopy } from "@/core/i18n/use-management-copy";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { TopAppBar, ChoiceChip, FieldLabel, PicketScreen, PrimaryAction, Surface } from "@/core/ui/picket-ui";
import { PaperArt } from "@/core/ui/paper-art";
import type { PaperAssetId } from "@/core/theme/paper-assets";
import type { Category } from "@picket/domain";
import { Redirect, router } from "expo-router";
import { useState } from "react";
import { PicketTextInput as TextInput } from "@/core/ui/picket-text-input";
import { StyleSheet, View } from "react-native";

import { routes } from "@/core/navigation/routes";
import { isOfflineQueuedError } from "@/core/sync/offline-queued-error";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { useAuth } from "@/features/auth/auth-context";
import { useTransactions } from "@/features/transactions/transactions-context";

const kinds: { value: Category["kind"]; label: string }[] = [
  { value: "expense", label: "Khoản chi" },
  { value: "income", label: "Khoản thu" },
  { value: "both", label: "Cả hai" },
];

const swatches = ["#8C6A7D", "#D46A6A", "#4F8A6B", "#C98A3D", "#5577A8"];

const availableIcons: { id: PaperAssetId; label: string }[] = [
  { id: "shopping", label: "Mua sắm" },
  { id: "food", label: "Ăn uống" },
  { id: "cafe", label: "Cà phê" },
  { id: "groceries", label: "Đi chợ" },
  { id: "transport", label: "Di chuyển" },
  { id: "bills", label: "Hóa đơn" },
  { id: "salary", label: "Lương" },
  { id: "bonus", label: "Thưởng" },
  { id: "investment", label: "Đầu tư" },
  { id: "savings", label: "Tiết kiệm" },
  { id: "gift", label: "Quà tặng" },
  { id: "leisure", label: "Giải trí" },
  { id: "health", label: "Y tế" },
  { id: "fitness", label: "Thể thao" },
  { id: "education", label: "Học tập" },
  { id: "beauty", label: "Làm đẹp" },
  { id: "vehicle", label: "Xe cộ" },
  { id: "pet", label: "Thú cưng" },
  { id: "music", label: "Âm nhạc" },
  { id: "home", label: "Nhà cửa" },
  { id: "security", label: "Bảo hiểm" },
];

export default function NewCategoryScreen() {
  const tx = useManagementCopy();
  const { colors, styles } = useMobileStyles(createStyles);
  const { session, localMode } = useAuth();
  const { createCategory } = useTransactions();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<Category["kind"]>("expense");
  const [selectedIcon, setSelectedIcon] = useState<PaperAssetId>("shopping");
  const [color, setColor] = useState(swatches[0]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  if (!session && !localMode) return <Redirect href={routes.login} />;

  async function submit() {
    if (!name.trim()) return setMessage("Hãy nhập tên danh mục.");
    setBusy(true);
    setMessage(null);
    try {
      await createCategory({ color, kind, name: name.trim(), icon: selectedIcon });
      router.replace(routes.categories);
    } catch (error) {
      if (isOfflineQueuedError(error)) {
        router.replace(routes.categories);
        return;
      }
      setMessage("Không tạo được danh mục. Tên có thể đã tồn tại.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PicketScreen>
      <TopAppBar illustration={selectedIcon} title={tx("Danh mục mới")} backDisabled={busy} />
      <Text style={styles.subtitle}>{tx("Tạo nhóm riêng để theo dõi thu chi đúng với thói quen của bạn.")}</Text>
      <Surface>
        <FieldLabel>{tx("Tên danh mục")}</FieldLabel>
        <TextInput
          accessibilityLabel={tx("Tên danh mục")}
          autoCapitalize="sentences"
          maxLength={80}
          onChangeText={setName}
          placeholder={tx("Ví dụ: Ăn uống")}
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={name}
        />

        <FieldLabel>{tx("Chọn Icon 3D Paper Art")}</FieldLabel>
        <View style={styles.iconGrid}>
          {availableIcons.map((item) => {
            const isSelected = selectedIcon === item.id;
            return (
              <Pressable
                accessibilityLabel={item.label}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
                key={item.id}
                onPress={() => setSelectedIcon(item.id)}
                style={[styles.iconChip, isSelected && styles.iconChipSelected]}
              >
                <View style={[styles.iconWrap, isSelected && styles.iconWrapSelected]}>
                  <PaperArt id={item.id} style={{ width: 34, height: 34 }} />
                </View>
                <Text numberOfLines={1} style={[styles.iconLabel, isSelected && styles.iconLabelSelected]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <FieldLabel>{tx("Áp dụng cho")}</FieldLabel>
        <View accessibilityRole="radiogroup" style={styles.choices}>
          {kinds.map((item) => (
            <ChoiceChip
              checked={kind === item.value}
              key={item.value}
              label={tx(item.label)}
              onPress={() => setKind(item.value)}
            />
          ))}
        </View>

        <FieldLabel>{tx("Màu sắc")}</FieldLabel>
        <View accessibilityRole="radiogroup" style={styles.choices}>
          {swatches.map((item) => (
            <Pressable
              accessibilityLabel={tx("colorOption", { color: item })}
              accessibilityRole="radio"
              accessibilityState={{ checked: color === item }}
              key={item}
              onPress={() => setColor(item)}
              style={[
                styles.swatch,
                { backgroundColor: item },
                color === item && styles.swatchSelected,
              ]}
            />
          ))}
        </View>

        {message ? (
          <Text accessibilityLiveRegion="polite" role="alert" style={styles.error}>
            {tx(message)}
          </Text>
        ) : null}
        <PrimaryAction busy={busy} label={tx("Tạo danh mục")} onPress={() => void submit()} />
      </Surface>
    </PicketScreen>
  );
}

const createStyles = (colors: MobileThemeColors) =>
  StyleSheet.create({
    appBar: { justifyContent: "center", minHeight: 52 },
    back: { color: colors.link, fontSize: 15, fontWeight: "700" },
    heading: { color: colors.ink, fontSize: 26, fontWeight: "700", letterSpacing: -0.8, marginTop: 18 },
    subtitle: { color: colors.muted, fontSize: 14, lineHeight: 20, marginBottom: 18, marginTop: 4 },
    input: {
      backgroundColor: colors.white,
      borderColor: colors.controlBorder,
      borderRadius: paperShape.input,
      borderWidth: 1,
      color: colors.ink,
      fontSize: 16,
      minHeight: paperControl.height,
      paddingHorizontal: 16,
      marginBottom: 6,
    },
    iconGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 16,
      marginTop: 4,
    },
    iconChip: {
      width: "22.5%",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.white,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 14,
      paddingVertical: 8,
      paddingHorizontal: 4,
      gap: 4,
    },
    iconChipSelected: {
      borderColor: colors.mauve,
      borderWidth: 1.5,
      backgroundColor: colors.pocketLilac,
    },
    iconWrap: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.cream,
      alignItems: "center",
      justifyContent: "center",
    },
    iconWrapSelected: {
      backgroundColor: colors.white,
    },
    iconLabel: {
      color: colors.ink,
      fontSize: 10,
      fontWeight: "600",
      textAlign: "center",
    },
    iconLabelSelected: {
      color: colors.mauve,
      fontWeight: "700",
    },
    choices: { flexDirection: "row", flexWrap: "wrap", gap: 9, marginBottom: 16 },
    swatch: { borderRadius: 22, height: 40, width: 40 },
    swatchSelected: { borderColor: colors.ink, borderWidth: 3 },
    error: { color: colors.danger, fontSize: 13, fontWeight: "700", lineHeight: 19, marginTop: 14 },
  });
