import { usePullRefresh } from "@/features/sync/use-pull-refresh";
import { PicketText as Text } from "@/core/ui/picket-text";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { formatVnd, type ReceiptRecord, type Transaction } from "@picket/domain";
import { Redirect, router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { figmaType } from "@picket/design-tokens";
import { routes } from "@/core/navigation/routes";
import { picketApi } from "@/core/api/client";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { AppIcon } from "@/core/ui/app-icon";
import { PaperArt } from "@/core/ui/paper-art";
import { CategoryPickerSheet } from "@/core/ui/picker-sheets";
import { Chip, ReceiptEdge, figmaShadow } from "@/core/ui/figma-ui";
import { categoryTile } from "@/features/home/home-recent";
import { useAuth } from "@/features/auth/auth-context";
import { useProfile } from "@/features/profile/profile-context";
import { useTransactionHistory } from "@/features/transactions/use-transaction-history";
import { useTransactions } from "@/features/transactions/transactions-context";
import { selectReceiptReviews, selectReviewInbox } from "@/features/transactions/review-inbox";
import { useFigmaCopy } from "@/features/transactions/figma-copy";
import { ChildBar, ErrorLine, FigmaScreen } from "@/features/transactions/figma-parts";
import { SpendingEmpty, dayKeyAt } from "@/features/transactions/spending-list";

function Paper({ children }: { children: ReactNode }) {
  const { colors } = useMobileStyles(() => ({}));
  return <View style={figmaShadow("paper")}><View style={{ backgroundColor: colors.paper, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16, gap: 12 }}>{children}</View><ReceiptEdge direction="bottom" /></View>;
}

// Remount per owner; never retain a previous account's receipts on screen.
function ReceiptReviews({ accessToken, onRetry }: { accessToken: string; onRetry: () => void }) {
  const { colors, styles } = useMobileStyles(createStyles);
  const copy = useFigmaCopy();
  const [rows, setRows] = useState<ReceiptRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  useFocusEffect(useCallback(() => {
    let active = true;
    const controller = new AbortController();
    setLoading(true);
    setFailed(false);
    setRows([]);
    void (async () => {
      try {
        if (!picketApi) throw new Error("unavailable");
        const result = await picketApi.listReceipts(accessToken, controller.signal);
        if (active) setRows(selectReceiptReviews(result.receipts));
      } catch {
        if (active) setFailed(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; controller.abort(); };
  }, [accessToken]));
  if (!loading && !failed && rows.length === 0) return null;
  return <View style={{ gap: 12 }}>
    <Text accessibilityRole="header" style={[figmaType.titleSection, { color: colors.text }]}>{copy("receiptsToCheck")}</Text>
    {loading ? <Text accessibilityLiveRegion="polite" style={styles.muted}>Đang tải danh sách hóa đơn…</Text> : failed ?
      <Pressable accessibilityRole="button" accessibilityLabel="Thử tải lại hóa đơn cần kiểm tra" onPress={onRetry}><Text style={[figmaType.bodySmall, { color: colors.expense }]}>Chưa tải được trạng thái hóa đơn. Kết nối mạng rồi chạm để thử lại.</Text></Pressable> :
      rows.map((item) => {
        const title = item.merchant?.trim() || "Hóa đơn chưa rõ cửa hàng";
        const amount = item.detectedTotal === null ? "Chưa có tổng tiền" : formatVnd(item.detectedTotal);
        return <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`${title}, hóa đơn cần kiểm tra, ${amount}`} onPress={() => router.push(routes.receipt(item.id))}>
          <Paper><View style={styles.row}>
            <View style={[styles.tile, { backgroundColor: colors.pocketLilac }]}><AppIcon name="receipt-text-outline" size={18} color={colors.text} /></View>
            <View style={{ flex: 1, minWidth: 1 }}><Text numberOfLines={1} style={[figmaType.bodyStrong, { color: colors.text }]}>{title}</Text><Text style={styles.muted}>Kiểm tra kết quả nhận diện hóa đơn</Text></View>
            <Text style={[figmaType.amountRow, { color: colors.text }]}>{amount}</Text>
          </View></Paper></Pressable>;
      })}
  </View>;
}

export default function ReviewInboxScreen() {
  const { colors, styles } = useMobileStyles(createStyles);
  const copy = useFigmaCopy();
  const pullRefresh = usePullRefresh();
  const { session, localMode } = useAuth();
  const { profile } = useProfile();
  const timeZone = profile?.timezone ?? "Asia/Ho_Chi_Minh";
  const [receiptAttempt, setReceiptAttempt] = useState(0);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [picking, setPicking] = useState<Transaction | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(false);
  const { error, loading, refresh, transactions } = useTransactionHistory();
  const { archive, categories, update } = useTransactions();
  const flagged = useMemo(() => {
    const otherCategoryIds = new Set(categories.filter((item) => item.name.trim().toLocaleLowerCase("vi-VN") === "khác").map((item) => item.id));
    return selectReviewInbox(transactions, otherCategoryIds);
  }, [categories, transactions]);
  if (!session && !localMode) return <Redirect href={routes.login} />;

  const visible = flagged.filter(({ item }) => !dismissed.includes(item.id));
  const categoryById = new Map(categories.map((item) => [item.id, item]));
  const otherIds = new Set(categories.filter((item) => item.name.trim().toLocaleLowerCase("vi-VN") === "khác").map((item) => item.id));
  const timeOf = (iso: string) => new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone });
  const counterpart = (item: Transaction) => transactions.find((other) => other.id !== item.id && other.kind === item.kind && other.accountId === item.accountId && other.amount === item.amount && other.title.trim().toLocaleLowerCase("vi-VN") === item.title.trim().toLocaleLowerCase("vi-VN") && Math.abs(Date.parse(other.occurredAt) - Date.parse(item.occurredAt)) < 86_400_000);

  async function assign(item: Transaction, categoryId: string) {
    if (busy) return;
    setBusy(true); setProblem(false);
    try { await update(item.id, { expectedVersion: item.version, categoryId }); } catch { setProblem(true); } finally { setBusy(false); }
  }
  async function merge(item: Transaction) {
    if (busy) return;
    setBusy(true); setProblem(false);
    try { await archive(item.id, item.version); } catch { setProblem(true); } finally { setBusy(false); }
  }
  const options = (item: Transaction) => categories.filter((category) => category.kind === item.kind || category.kind === "both").map((category) => { const t = categoryTile(category.icon, category.name, item.kind === "income", colors); return { id: category.id, name: category.name, icon: t.name, tint: t.color }; });

  return <FigmaScreen onRefresh={pullRefresh}>
    <ChildBar title={copy("reviewTitle")} />
    {session && <ReceiptReviews key={`${session.user.id}:${receiptAttempt}`} accessToken={session.access_token} onRetry={() => setReceiptAttempt((n) => n + 1)} />}
    {error && <Pressable accessibilityRole="button" onPress={() => void refresh()}><ErrorLine>{error} Chạm để thử lại.</ErrorLine></Pressable>}
    {problem && <ErrorLine>Không cập nhật được. Dữ liệu có thể đã đổi trên thiết bị khác.</ErrorLine>}
    {loading && <Text style={styles.muted}>Đang đối chiếu toàn bộ lịch sử giao dịch…</Text>}
    {!loading && !error && (visible.length === 0 ? (
      <View style={{ alignItems: "center" }}><SpendingEmpty art title={copy("reviewEmptyTitle")} body={copy("reviewEmptyBody")} action={{ label: copy("backToSpending"), onPress: () => router.replace(routes.transactions) }} /></View>
    ) : <>
      <View style={styles.headline}>
        <PaperArt id="receipt" style={{ width: 56, height: 56 }} />
        <View style={{ flex: 1 }}><Text style={[figmaType.titleSection, { color: colors.text }]}>{copy("reviewHeadline", { count: visible.length })}</Text><Text style={styles.muted}>{copy("reviewBody")}</Text></View>
      </View>
      {visible.map(({ item, reason }) => {
        const duplicate = reason.startsWith("Nghi trùng");
        const other = duplicate ? counterpart(item) : undefined;
        const category = categoryById.get(item.categoryId ?? "");
        const uncategorized = !item.categoryId || otherIds.has(item.categoryId);
        const tile = categoryTile(uncategorized ? null : category?.icon ?? null, uncategorized ? "" : category?.name ?? item.title, item.kind === "income", colors);
        const suggestions = categories.filter((c) => (c.kind === item.kind || c.kind === "both") && !otherIds.has(c.id)).slice(0, 3);
        const day = dayKeyAt(item.occurredAt, timeZone).split("-");
        const meta = duplicate ? `${category?.name ?? ""} · ${timeOf(item.occurredAt)}` : `${copy("uncategorized")} · ${Number(day[2])}/${Number(day[1])}`;
        return <Pressable key={item.id} accessibilityLabel={`${item.title}, ${reason}, ${formatVnd(item.amount)}`} accessibilityRole="button" onPress={() => router.push(routes.transaction(item.id))}>
          <Paper>
            {duplicate ? <Chip tone="warning" label={copy("dupWith", { time: other ? timeOf(other.occurredAt) : "—" })} /> : null}
            <View style={styles.row}>
              <View style={[styles.tile, { backgroundColor: tile.color }]}><AppIcon name={duplicate ? tile.name : "dots-horizontal"} size={18} color={colors.text} /></View>
              <View style={{ flex: 1, minWidth: 1 }}><Text numberOfLines={1} style={[figmaType.titleSection, { fontSize: 15, lineHeight: 22, color: colors.text }]}>{item.title}</Text><Text numberOfLines={1} style={styles.muted}>{meta}</Text></View>
              <Text style={[figmaType.amountRow, { color: item.kind === "expense" ? colors.expense : colors.income }]}>{item.kind === "expense" ? "−" : "+"}{formatVnd(item.amount)}</Text>
            </View>
            <View style={styles.chips}>
              {duplicate ? <>
                <Chip tone="outline" label={copy("keepBoth")} onPress={() => setDismissed((current) => [...current, item.id])} />
                <Chip tone="outline" label={copy("mergeOne")} onPress={() => void merge(item)} />
              </> : <>
                {suggestions.map((c) => <Chip key={c.id} tone="outline" label={c.name} onPress={() => void assign(item, c.id)} />)}
                <Chip tone="outline" label="Khác…" onPress={() => setPicking(item)} />
              </>}
            </View>
          </Paper>
        </Pressable>;
      })}
    </>)}
    <CategoryPickerSheet visible={picking !== null} title={copy("categoryPickTitle")} searchPlaceholder={copy("categorySearch")} closeLabel={copy("close")} options={picking ? options(picking) : []}
      onSelect={(id) => { const target = picking; setPicking(null); if (target) void assign(target, id); }} onClose={() => setPicking(null)} />
  </FigmaScreen>;
}

const createStyles = (colors: MobileThemeColors) => StyleSheet.create({
  muted: { ...figmaType.bodySmall, color: colors.muted },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  tile: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  headline: { flexDirection: "row", alignItems: "center", gap: 12 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
