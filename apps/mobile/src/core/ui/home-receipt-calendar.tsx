import { colors } from "@picket/design-tokens";
import type { Transaction } from "@picket/domain";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";
import { loadCloudReceiptGallery, type GalleryEntry } from "@/core/receipts/cloud-receipt-gallery";
import { listGuestReceipts } from "@/core/receipts/guest-receipt-store";
import { useAuth } from "@/features/auth/auth-context";
import { routes } from "@/core/navigation/routes";
import { MonthCalendar } from "./month-calendar";
import { calendarReceiptDay } from "./receipt-calendar";
import { ActionSheet, MenuRow, PrimaryAction, SectionTitle } from "./picket-ui";

type Entry = GalleryEntry;
export function HomeReceiptCalendar({ month, transactions }: { month: string; transactions: Transaction[] }) {
  const { session, localMode } = useAuth();
  const owner = localMode ? "guest" : session?.user.id;
  const [data, setData] = useState<{ owner?: string; rows: Entry[] }>({ rows: [] });
  const [stale, setStale] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [retry, setRetry] = useState(0);
  const rows = data.owner === owner ? data.rows : [];
  useFocusEffect(useCallback(() => {
    void retry; // User-requested reload changes this focus callback.
    let active = true;
    const controller = new AbortController();
    setLoading(true); setError(null); setOpen(false); setStale(false); setFailedImages(new Set());
    async function load() {
      let entries: Entry[];
      if (localMode) {
        const receipts = await listGuestReceipts();
        entries = receipts.flatMap((r) => { const day = calendarReceiptDay(r, transactions.find((t) => t.id === r.transactionId)?.occurredAt); return day ? [{ id: r.transactionId, transactionId: r.transactionId, day, title: r.merchant || "Hóa đơn", uri: `data:${r.contentType};base64,${r.imageBase64}` }] : []; });
      } else {
        if (!session) throw new Error("unavailable");
        const result = await loadCloudReceiptGallery(session.user.id, session.access_token, month, new Map(transactions.map((t) => [t.id, t.occurredAt])), controller.signal);
        entries = result.rows;
        if (active) setStale(result.stale);
      }
      if (active) setData({ owner, rows: entries });
    }
    void load().catch(() => { if (active) { setData({ owner, rows: [] }); setError("Chưa tải được hóa đơn. Hãy thử lại trước khi chọn ngày."); } }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [localMode, month, owner, retry, session, transactions]));
  const monthly = rows.filter((r) => r.day.startsWith(month));
  const thumbnails = Object.fromEntries(monthly.filter((r) => r.uri).map((r) => [Number(r.day.slice(-2)), r.uri!]));
  const dayRows = selected === null ? [] : monthly.filter((r) => Number(r.day.slice(-2)) === selected);
  function select(day: number | null) {
    const value = day ?? selected;
    if (value === null || loading || error) return;
    setSelected(value);
    const found = monthly.some((r) => Number(r.day.slice(-2)) === value);
    if (found) setOpen(true); else router.push(routes.capture);
  }
  return <View><SectionTitle title="Lịch hóa đơn" action="Tải lại" onAction={() => { if (!loading) setRetry((value) => value + 1); }} /><Text style={styles.hint}>Chạm ngày để xem ảnh đã lưu. Ngày trống sẽ mở camera quét.</Text>{stale && <Text accessibilityLiveRegion="polite" style={styles.hint}>Đang xem hóa đơn đã lưu trên máy. Ảnh chưa tải trước đó cần kết nối mạng.</Text>}{loading && <ActivityIndicator accessibilityLabel="Đang tải lịch hóa đơn" color={colors.mauve} />}{error && <><Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text><PrimaryAction label="Tải lại hóa đơn" onPress={() => setRetry((n) => n + 1)} /></>}<MonthCalendar month={month} selected={selected} activeDays={new Set(monthly.map((r) => Number(r.day.slice(-2))))} thumbnails={thumbnails} receiptMode disabled={loading || Boolean(error)} onSelect={select} /><ActionSheet title={`Hóa đơn ngày ${selected ?? ""}/${Number(month.slice(-2))}`} visible={open} onClose={() => setOpen(false)}>{dayRows.map((entry) => <View key={entry.id} style={styles.receipt}>{entry.uri && !failedImages.has(entry.id) ? <Image onError={() => setFailedImages((current) => new Set([...current, entry.id]))} accessibilityLabel={`Ảnh hóa đơn ${entry.title}`} source={{ uri: entry.uri }} resizeMode="contain" style={styles.image} /> : <View><Text style={styles.hint}>Chưa tải được ảnh. Kết nối mạng rồi thử lại.</Text><PrimaryAction label="Tải lại ảnh" onPress={() => setRetry((value) => value + 1)} /></View>}<MenuRow icon="receipt-text-outline" title={entry.title} description="Mở chi tiết hóa đơn" onPress={() => { setOpen(false); router.push(localMode && entry.transactionId ? routes.transaction(entry.transactionId) : routes.receipt(entry.id)); }} /></View>)}<PrimaryAction label="Quét thêm hóa đơn" onPress={() => { setOpen(false); router.push(routes.capture); }} /></ActionSheet></View>;
}
const styles = StyleSheet.create({ hint: { color: colors.muted, fontSize: 13, lineHeight: 20, marginBottom: 12 }, error: { color: colors.expense, lineHeight: 20 }, receipt: { marginBottom: 20 }, image: { height: 320, width: "100%", borderRadius: 16, backgroundColor: colors.cream } });
