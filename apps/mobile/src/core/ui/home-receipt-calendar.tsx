import { colors } from "@picket/design-tokens";
import type { Transaction } from "@picket/domain";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { loadCloudReceiptGallery, type GalleryEntry } from "@/core/receipts/cloud-receipt-gallery";
import { listGuestReceipts } from "@/core/receipts/guest-receipt-store";
import { createReceiptThumbnail } from "@/core/receipts/receipt-thumbnail";
import { ReceiptGalleryPhoto } from "@/core/receipts/receipt-gallery-photo";
import { useAuth } from "@/features/auth/auth-context";
import { routes } from "@/core/navigation/routes";
import { MonthCalendar } from "./month-calendar";
import { calendarReceiptDay } from "./receipt-calendar";
import { ActionSheet, MenuRow, PrimaryAction, SectionTitle } from "./picket-ui";

type Entry = GalleryEntry;
export function HomeReceiptCalendar({ month, transactions }: { month: string; transactions: Transaction[] }) {
  const { session, localMode } = useAuth();
  return <ReceiptCalendarScope key={`${localMode ? "guest" : session?.user.id}:${month}`} month={month} transactions={transactions} />;
}

function ReceiptCalendarScope({ month, transactions }: { month: string; transactions: Transaction[] }) {
  const { session, localMode } = useAuth();
  const owner = localMode ? "guest" : session?.user.id;
  const token = session?.access_token;
  // Only receipt date associations affect the gallery, not balances, amounts or
  // fresh-but-equal transaction arrays received from a background refresh.
  const datesKey = JSON.stringify(transactions.map(t => [t.id, t.occurredAt]).sort((a, b) => a[0].localeCompare(b[0])));
  const transactionDates = useMemo(() => new Map<string, string>(JSON.parse(datesKey)), [datesKey]);
  const [data, setData] = useState<{ owner?: string; month?: string; rows: Entry[] }>({ rows: [] });
  const [stale, setStale] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [retry, setRetry] = useState(0);
  const rows = data.owner === owner ? data.rows : [];
  const hasSnapshot = data.owner === owner && data.month === month;
  const snapshotRef = useRef(data);
  useFocusEffect(useCallback(() => {
    void retry; // User-requested reload changes this focus callback.
    let active = true;
    const controller = new AbortController();
    setLoading(true); setError(null);
    async function load() {
      let entries: Entry[];
      if (localMode) {
        const receipts = await listGuestReceipts();
        entries = receipts.flatMap((r) => { const day = calendarReceiptDay(r, transactionDates.get(r.transactionId)); return day ? [{ id: r.transactionId, transactionId: r.transactionId, day, title: r.merchant || "Hóa đơn", uri: `data:${r.contentType};base64,${r.imageBase64}` }] : []; });
        if (active) setStale(false);
        const previous = snapshotRef.current.owner === owner ? snapshotRef.current.rows : [];
        entries = entries.map(row => ({ ...row, thumbnailUri: previous.find(old => old.id === row.id && old.uri === row.uri)?.thumbnailUri }));
        if (active) {
          const next = { owner, month, rows: entries.map(row => ({ ...row })) };
          snapshotRef.current = next; setData(next); setLoading(false);
        }
        // Guest images also use small previews. Publish metadata first and
        // preserve full resolution only for the selected-day viewer.
        for (const row of entries.filter(entry => entry.day.startsWith(month))) {
          if (!active) return;
          if (row.thumbnailUri || !row.uri) continue;
          try { row.thumbnailUri = await createReceiptThumbnail(row.uri); } catch { /* Full image is still available. */ }
          if (active) {
            const next = { owner, month, rows: entries.map(entry => ({ ...entry })) };
            snapshotRef.current = next; setData(next);
          }
        }
      } else {
        if (!owner || !token) throw new Error("unavailable");
        const result = await loadCloudReceiptGallery(owner, token, month, transactionDates, controller.signal, (snapshot) => {
          if (!active) return;
          // Keep existing image URIs while metadata refreshes; photo work is
          // incremental and must not blank or disable a usable calendar.
          const previous = snapshotRef.current.owner === owner ? snapshotRef.current.rows : [];
          const rows = snapshot.rows.map((row) => {
            const old = previous.find((entry) => entry.id === row.id && entry.path === row.path);
            return { ...row, uri: row.uri ?? old?.uri, thumbnailUri: row.thumbnailUri ?? old?.thumbnailUri };
          });
          const next = { owner, month, rows };
          snapshotRef.current = next;
          setData(next); setStale(snapshot.stale); setLoading(false);
        });
        entries = result.rows;
        if (active) setStale(result.stale);
      }
      if (active) {
        const next = { owner, month, rows: entries };
        snapshotRef.current = next;
        setData(next);
      }
    }
    let refreshing = false;
    async function revalidate() {
      if (refreshing || !active) return;
      refreshing = true;
      try { await load(); if (active) setError(null); }
      catch { if (active) {
        const retained = snapshotRef.current.owner === owner && snapshotRef.current.month === month;
        if (retained) setStale(true);
        else setError("Chưa tải được hóa đơn. Hãy thử lại trước khi chọn ngày.");
      } }
      finally { refreshing = false; if (active) setLoading(false); }
    }
    void revalidate();
    // Keep receipt-only changes discoverable without coupling the calendar to
    // unrelated preference events. No loading insertion or selection reset.
    const timer = setInterval(() => void revalidate(), 60_000);
    return () => { active = false; clearInterval(timer); controller.abort(); };
  }, [localMode, month, owner, retry, token, transactionDates]));
  const monthly = rows.filter((r) => r.day.startsWith(month));
  const thumbnails = Object.fromEntries(monthly.filter((r) => r.thumbnailUri).map((r) => [Number(r.day.slice(-2)), r.thumbnailUri!]));
  const dayRows = selected === null ? [] : monthly.filter((r) => Number(r.day.slice(-2)) === selected);
  function select(day: number | null) {
    const value = day ?? selected;
    if (value === null || !hasSnapshot) return;
    setSelected(value);
    const found = monthly.some((r) => Number(r.day.slice(-2)) === value);
    if (found) setOpen(true); else router.push(routes.captureOnDate(`${month}-${String(value).padStart(2, "0")}`));
  }
  return <View accessibilityState={{ busy: loading && !hasSnapshot }}><SectionTitle title="Lịch hóa đơn" /><Text style={styles.hint}>Chạm ngày để xem ảnh đã lưu. Ngày trống sẽ mở camera quét.</Text>{stale && <Text accessibilityLiveRegion="polite" style={styles.hint}>Đang xem hóa đơn đã lưu trên máy. Ảnh chưa tải trước đó cần kết nối mạng.</Text>}{error && <><Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text><PrimaryAction label="Tải lại hóa đơn" onPress={() => setRetry((n) => n + 1)} /></>}<MonthCalendar month={month} selected={selected} activeDays={new Set(monthly.map((r) => Number(r.day.slice(-2))))} thumbnails={thumbnails} receiptMode disabled={!hasSnapshot} onSelect={select} /><ActionSheet title={`Hóa đơn ngày ${selected ?? ""}/${Number(month.slice(-2))}`} visible={open} onClose={() => setOpen(false)}>{dayRows.map((entry) => <View key={entry.id} style={styles.receipt}>{open && <ReceiptGalleryPhoto key={`${owner}:${entry.id}`} owner={localMode ? undefined : owner} entry={entry} />}<MenuRow icon="receipt-text-outline" title={entry.title} description="Mở chi tiết hóa đơn" onPress={() => { setOpen(false); router.push(localMode && entry.transactionId ? routes.transaction(entry.transactionId) : routes.receipt(entry.id)); }} /></View>)}<PrimaryAction label="Quét thêm hóa đơn" onPress={() => { setOpen(false); router.push(routes.capture); }} /></ActionSheet></View>;
}
const styles = StyleSheet.create({ hint: { color: colors.muted, fontSize: 13, lineHeight: 20, marginBottom: 12 }, error: { color: colors.expense, lineHeight: 20 }, receipt: { marginBottom: 20 }, image: { height: 320, width: "100%", borderRadius: 16, backgroundColor: colors.cream } });
