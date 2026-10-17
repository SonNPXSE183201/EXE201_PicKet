import { colors } from "@picket/design-tokens";
import { formatVnd, type ReceiptRecord } from "@picket/domain";
import { Redirect, router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { routes } from "@/core/navigation/routes";
import { picketApi } from "@/core/api/client";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { TopAppBar, EmptyState, PicketScreen, Surface } from "@/core/ui/picket-ui";
import { useAuth } from "@/features/auth/auth-context";
import { useTransactionHistory } from "@/features/transactions/use-transaction-history";
import { useTransactions } from "@/features/transactions/transactions-context";
import { selectReceiptReviews, selectReviewInbox } from "@/features/transactions/review-inbox";

// Remount per owner; never retain a previous account's receipts on screen.
function ReceiptReviews({ accessToken, onRetry }: { accessToken: string; onRetry: () => void }) {
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
  return <View style={styles.stack}>
    <Text accessibilityRole="header" style={styles.section}>Hóa đơn cần kiểm tra</Text>
    {loading ? <Text accessibilityLiveRegion="polite" style={styles.reason}>Đang tải danh sách hóa đơn…</Text> : failed ?
      <Pressable accessibilityRole="button" accessibilityLabel="Thử tải lại hóa đơn cần kiểm tra" onPress={onRetry}><Text style={styles.warning}>Chưa tải được trạng thái hóa đơn. Kết nối mạng rồi chạm để thử lại.</Text></Pressable> : rows.length === 0 ?
      <Text style={styles.reason}>Không có hóa đơn cần kiểm tra trong dữ liệu vừa tải.</Text> : rows.map(item => {
        const title = item.merchant?.trim() || "Hóa đơn chưa rõ cửa hàng";
        const amount = item.detectedTotal === null ? "Chưa có tổng tiền" : formatVnd(item.detectedTotal);
        return <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`${title}, hóa đơn cần kiểm tra, ${amount}`} onPress={() => router.push(routes.receipt(item.id))}><Surface><View style={styles.row}><View style={styles.copy}><Text style={styles.title}>{title}</Text><Text style={styles.reason}>Kiểm tra kết quả nhận diện hóa đơn</Text></View><Text style={styles.amount}>{amount}</Text></View></Surface></Pressable>;
      })}
  </View>;
}

export default function ReviewInboxScreen() {
  const { session, localMode } = useAuth();
  const [receiptAttempt, setReceiptAttempt] = useState(0);
  const { error, loading, refresh, transactions } = useTransactionHistory();
  const { categories } = useTransactions();
  const flagged = useMemo(() => {
    const otherCategoryIds = new Set(categories.filter((item) => item.name.trim().toLocaleLowerCase("vi-VN") === "khác").map((item) => item.id));
    return selectReviewInbox(transactions, otherCategoryIds);
  }, [categories, transactions]);
  if (!session && !localMode) return <Redirect href={routes.login} />;
  return <PicketScreen>
    <TopAppBar title="Cần kiểm tra" />
    <Text style={styles.subtitle}>Kiểm tra hóa đơn, phân loại giao dịch và đối chiếu các khoản nghi trùng.</Text>
    {session && <ReceiptReviews key={`${session.user.id}:${receiptAttempt}`} accessToken={session.access_token} onRetry={() => setReceiptAttempt(n => n + 1)} />}
    <Text accessibilityRole="header" style={styles.section}>Giao dịch cần kiểm tra</Text>
    {error && <Pressable accessibilityRole="button" onPress={() => void refresh()}><Text accessibilityLiveRegion="polite" style={styles.warning}>{error} Chạm để thử lại.</Text></Pressable>}
    {loading && <Text style={styles.warning}>Đang đối chiếu toàn bộ lịch sử giao dịch…</Text>}
    {!loading && !error && (flagged.length === 0 ? <EmptyState title="Giao dịch đã gọn gàng" description="Không có giao dịch cần phân loại hoặc nghi trùng trong dữ liệu đã tải." symbol="✓" /> :
      <View style={styles.stack}>{flagged.map(({ item, reason }) => <Pressable accessibilityLabel={`${item.title}, ${reason}, ${formatVnd(item.amount)}`} accessibilityRole="button" key={item.id} onPress={() => router.push(routes.transaction(item.id))}><Surface><View style={styles.row}><View style={styles.copy}><Text style={styles.title}>{item.title}</Text><Text style={styles.reason}>{reason}</Text></View><Text style={styles.amount}>{formatVnd(item.amount)}</Text></View></Surface></Pressable>)}</View>)}
  </PicketScreen>;
}

const styles = StyleSheet.create({
  section: { color: colors.ink, fontSize: 18, fontWeight: "800", marginTop: 18, marginBottom: 12 },
  back:{color:colors.mauve,fontSize:15,fontWeight:"800",marginBottom:18},heading:{color:colors.ink,fontSize:29,fontWeight:"800"},subtitle:{color:colors.muted,fontSize:15,lineHeight:22,marginBottom:22,marginTop:7},warning:{color:colors.expense,fontSize:13,lineHeight:20,marginBottom:16},stack:{gap:10},row:{alignItems:"center",flexDirection:"row",gap:14},copy:{flex:1},title:{color:colors.ink,fontSize:16,fontWeight:"800"},reason:{color:colors.muted,fontSize:12,marginTop:6},amount:{color:colors.ink,fontSize:14,fontWeight:"800"},
});
