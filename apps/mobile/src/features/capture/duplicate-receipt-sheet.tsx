import { useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { figmaType } from "@picket/design-tokens";
import { picketApi } from "@/core/api/client";
import { formatMoney } from "@/core/i18n/formatters";
import { loadCloudReceiptImage } from "@/core/receipts/cloud-receipt-gallery";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { Chip, FigmaButton, Skeleton, figmaShadow } from "@/core/ui/figma-ui";
import { ActionSheet } from "@/core/ui/picket-ui";
import { PicketText as Text } from "@/core/ui/picket-text";
import { useAppTheme } from "@/features/settings/appearance-provider";

export type ReceiptSummary = { merchant: string | null; total: number | null; purchasedAt: string | null; imageUri: string | null };

import { duplicateChoices, type DuplicateChoice } from "./duplicate-receipt-sheet-choices";
export type { DuplicateChoice } from "./duplicate-receipt-sheet-choices";

/** C3-style duplicate check for a scanned receipt: compare the saved receipt with the new scan. */
export function DuplicateReceiptSheet({ visible, exact, savedId, owner, token, fresh, onChoose }: {
  visible: boolean;
  exact: boolean;
  savedId: string | null;
  owner: string | null;
  token: string | null;
  fresh: ReceiptSummary;
  onChoose(choice: DuplicateChoice): void;
}) {
  const { t } = useTranslation("common");
  const { colors, styles } = useMobileStyles(createStyles);
  const [saved, setSaved] = useState<ReceiptSummary | null>(null);
  const [loadedId, setLoadedId] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !savedId || !owner || !token || !picketApi) return;
    let active = true;
    const controller = new AbortController();
    void picketApi.getReceipt(token, savedId, controller.signal).then(async ({ receipt }) => {
      const imageUri = receipt.storagePath ? await loadCloudReceiptImage(owner, receipt.storagePath, controller.signal) : null;
      if (!active) return;
      setSaved({ merchant: receipt.merchant, total: receipt.detectedTotal, purchasedAt: receipt.purchasedAt, imageUri });
      setLoadedId(savedId);
    }).catch(() => { if (active) setLoadedId(savedId); });
    return () => { active = false; controller.abort(); };
  }, [visible, savedId, owner, token]);

  const choices = duplicateChoices(exact);
  const savedReady = loadedId === savedId;
  return (
    <ActionSheet title={exact ? t("Hoá đơn này đã được lưu") : t("Có thể bạn đã lưu hoá đơn này")} visible={visible} onClose={() => onChoose("cancel")}>
      <View style={styles.notice}>
        <Chip tone="warning" label={exact ? t("Trùng ảnh") : t("Trùng cửa hàng, ngày và tổng tiền")} />
        <Text style={[figmaType.bodySmall, { color: colors.muted }]}>
          {exact
            ? t("Ảnh giống hệt một hoá đơn đã có. Mở bản đã lưu thay vì tạo thêm một khoản chi.")
            : t("Hãy so sánh hai hoá đơn trước khi lưu thêm để không ghi một khoản chi hai lần.")}
        </Text>
      </View>
      <View style={styles.compare}>
        <ReceiptCard label={t("Đã lưu")} summary={savedReady ? saved : null} loading={!savedReady} />
        <ReceiptCard label={t("Mới quét")} summary={fresh} highlight />
      </View>
      <View style={styles.actions}>
        <FigmaButton fullWidth icon="receipt-text-outline" label={t("Xem hoá đơn đã lưu")} onPress={() => onChoose("view")} />
        {choices.includes("save") && <FigmaButton fullWidth variant="outline" label={t("Vẫn lưu hoá đơn mới")} onPress={() => onChoose("save")} />}
        <FigmaButton fullWidth variant="text" size="medium" label={t("Huỷ")} onPress={() => onChoose("cancel")} />
      </View>
    </ActionSheet>
  );
}

function ReceiptCard({ label, summary, loading = false, highlight = false }: { label: string; summary: ReceiptSummary | null; loading?: boolean; highlight?: boolean }) {
  const { t } = useTranslation("common");
  const { language } = useAppTheme();
  const { colors, styles } = useMobileStyles(createStyles);
  const date = summary?.purchasedAt ? new Date(summary.purchasedAt).toLocaleDateString(language === "en" ? "en-US" : "vi-VN") : "—";
  return (
    <View style={[styles.card, highlight && { borderColor: colors.primary }, figmaShadow("paper")]}>
      <Text style={[figmaType.overline, { color: highlight ? colors.primary : colors.muted }]}>{label.toUpperCase()}</Text>
      {loading ? <Skeleton height={120} radius={8} /> : summary?.imageUri
        ? <Image accessible={false} source={{ uri: summary.imageUri }} resizeMode="cover" style={styles.photo} />
        : <View style={[styles.photo, styles.empty]}><Text style={[figmaType.captionStrong, { color: colors.muted }]}>{t("Không có ảnh")}</Text></View>}
      <Text numberOfLines={2} style={[figmaType.bodyStrong, { color: colors.text }]}>{loading ? "…" : summary?.merchant || t("Không rõ cửa hàng")}</Text>
      <Text style={[figmaType.captionStrong, { color: colors.muted }]}>{loading ? " " : date}</Text>
      <Text style={[figmaType.bodyStrong, { color: colors.text }]}>{loading || summary?.total == null ? "—" : formatMoney(summary.total, language, "VND")}</Text>
    </View>
  );
}

const createStyles = (colors: MobileThemeColors) => StyleSheet.create({
  notice: { gap: 8 },
  compare: { flexDirection: "row", gap: 12, marginTop: 16 },
  card: { flex: 1, gap: 6, padding: 10, borderRadius: 14, borderWidth: 1.5, borderColor: "transparent", backgroundColor: colors.paper },
  photo: { height: 120, borderRadius: 8, backgroundColor: colors.elevated },
  empty: { alignItems: "center", justifyContent: "center" },
  actions: { gap: 8, marginTop: 20 },
});
