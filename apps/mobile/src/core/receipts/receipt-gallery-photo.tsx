import { PicketText as Text } from "@/core/ui/picket-text";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, View } from "react-native";
import { useAppTheme } from "@/features/settings/appearance-provider";
import { useTranslation } from "react-i18next";
import { loadCloudReceiptImage, type GalleryEntry } from "./cloud-receipt-gallery";
import { PrimaryAction } from "@/core/ui/picket-ui";

/** Mounted only inside the selected day's sheet. Owner/month changes remount it. */
export function ReceiptGalleryPhoto({ owner, entry }: { owner?: string; entry: GalleryEntry }) {
  const { colors } = useAppTheme();
  const { t } = useTranslation("calendar");
  const [uri, setUri] = useState(entry.uri);
  const [loading, setLoading] = useState(!entry.uri);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true; const controller = new AbortController();
    const image = entry.uri && (retry === 0 || !owner) ? Promise.resolve(entry.uri)
      : owner && entry.path ? loadCloudReceiptImage(owner, entry.path, controller.signal) : Promise.resolve(null);
    void image.then(value => {
      if (active) setUri(value ?? undefined);
    }).catch(() => { if (active) setUri(undefined); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [owner, entry.path, entry.uri, retry]);
  if (loading) return <ActivityIndicator accessibilityLabel={t("openingReceipt")} color={colors.link} />;
  if (uri) return <Image accessibilityLabel={t("receiptPhoto",{title:entry.title})} source={{ uri }} onError={() => setUri(undefined)} resizeMode="contain" style={{ height: 320, width: "100%", borderRadius: 16, backgroundColor: colors.canvas }} />;
  return <View><Text style={{ color: colors.muted }}>{t("photoError")}</Text><PrimaryAction label={t("reloadPhoto")} onPress={() => { setLoading(true); setRetry(value => value + 1); }} /></View>;
}
