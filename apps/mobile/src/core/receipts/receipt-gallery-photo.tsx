import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Text, View } from "react-native";
import { colors } from "@picket/design-tokens";
import { loadCloudReceiptImage, type GalleryEntry } from "./cloud-receipt-gallery";
import { PrimaryAction } from "@/core/ui/picket-ui";

/** Mounted only inside the selected day's sheet. Owner/month changes remount it. */
export function ReceiptGalleryPhoto({ owner, entry }: { owner?: string; entry: GalleryEntry }) {
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
  if (loading) return <ActivityIndicator accessibilityLabel="Đang mở ảnh hóa đơn" color={colors.mauve} />;
  if (uri) return <Image accessibilityLabel={`Ảnh hóa đơn ${entry.title}`} source={{ uri }} onError={() => setUri(undefined)} resizeMode="contain" style={{ height: 320, width: "100%", borderRadius: 16, backgroundColor: colors.cream }} />;
  return <View><Text style={{ color: colors.muted }}>Chưa mở được ảnh. Kết nối mạng rồi thử lại.</Text><PrimaryAction label="Tải lại ảnh" onPress={() => { setLoading(true); setRetry(value => value + 1); }} /></View>;
}
