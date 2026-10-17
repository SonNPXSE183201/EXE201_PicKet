import { colors, radii } from "@picket/design-tokens";
import type { FinanceExportEnvelope, FinanceImportSummary } from "@picket/domain";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { Redirect, router } from "expo-router";
import { useState } from "react";
import { PicketTextInput as TextInput } from "@/core/ui/picket-text-input";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { picketApi } from "@/core/api/client";
import { decryptEncryptedBackup, decryptGuestBackup, restoreEncryptedBackup, restoreGuestBackup, type DecryptedBackup } from "@/core/export/flutter-compatible-backup";
import type { GuestBackupPayload } from "@/core/export/guest-backup-model";
import { convertLegacyBackupToGuest } from "@/core/export/legacy-to-guest";
import { useGuestFinance } from "@/core/local/guest-finance-context";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { routes } from "@/core/navigation/routes";
import { useAccounts } from "@/features/accounts/accounts-context";
import { useAuth } from "@/features/auth/auth-context";
import { useBudgets } from "@/features/budgets/budgets-context";
import { useProfile } from "@/features/profile/profile-context";
import { useTransactions } from "@/features/transactions/transactions-context";

const MAX_IMPORT_BYTES = 11_000_000;

interface PendingRestore {
  exported: FinanceExportEnvelope | null;
  encrypted: DecryptedBackup | null;
  guest: GuestBackupPayload | null;
  summary: FinanceImportSummary;
  currentRevision: number;
  fileName: string;
}

export default function RestoreScreen() {
  const { session, localMode } = useAuth();
  const guest = useGuestFinance();
  const { refresh: refreshProfile } = useProfile();
  const { refresh: refreshAccounts } = useAccounts();
  const { refresh: refreshTransactions } = useTransactions();
  const { refresh: refreshBudgets } = useBudgets();
  const [pending, setPending] = useState<PendingRestore | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!session && !localMode) return <Redirect href={routes.login} />;

  async function chooseBackup() {
    if (!localMode && (!session || !picketApi)) return setMessage("Hãy đăng nhập để khôi phục dữ liệu vào tài khoản.");
    setBusy(true);
    setMessage(null);
    setPending(null);
    setConfirmation("");
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        type: "*/*",
      });
      if (result.canceled) return;
      const file = result.assets[0];
      if (!file) throw new Error("Không đọc được file đã chọn.");
      const encrypted = file.name.toLowerCase().endsWith(".picket");
      const maxBytes = encrypted ? 100_000_000 : MAX_IMPORT_BYTES;
      if (file.size !== undefined && file.size > maxBytes) {
        throw new Error("File vượt quá giới hạn cho phép.");
      }
      const raw = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      if (new TextEncoder().encode(raw).length > maxBytes) {
        throw new Error("File vượt quá giới hạn cho phép.");
      }
      if (localMode) {
        if (!encrypted) throw new Error("Chế độ trên máy chỉ nhận bản sao .picket mã hóa dành cho guest.");
        const backupFormat = (JSON.parse(raw) as { format?: unknown }).format;
        const decodedGuest = backupFormat === "picket-backup-v1"
          ? convertLegacyBackupToGuest(await decryptEncryptedBackup(raw, password))
          : await decryptGuestBackup(raw, password);
        setPending({ exported:null, encrypted:null, guest:decodedGuest, currentRevision:0, fileName:file.name,
          summary:{ valid:true, wallets:decodedGuest.finance.accounts.length, entries:decodedGuest.finance.transactions.length,
            budgets:decodedGuest.finance.budgets.length, bills:decodedGuest.finance.bills.length,
            keepsakes:decodedGuest.keepsakes.length, subscriptions:decodedGuest.finance.subscriptions.length } });
        setMessage("File hợp lệ. Kiểm tra thống kê trước khi xác nhận.");
        return;
      }
      const decoded = encrypted ? await decryptEncryptedBackup(raw, password) : null;
      const exported = encrypted ? null : JSON.parse(raw) as FinanceExportEnvelope;
      const [summary, snapshot] = await Promise.all([
        exported ? picketApi!.validateFinanceImport(session!.access_token, exported) : Promise.resolve({
          valid: true as const, wallets: decoded!.data.wallets.length, entries: decoded!.data.entries.length,
          budgets: decoded!.data.budgets.length, bills: decoded!.data.bills.length,
          keepsakes: decoded!.data.keepsakes.length, subscriptions: decoded!.data.subscriptions.length,
        }),
        picketApi!.loadFinanceSnapshot(session!.access_token),
      ]);
      setPending({
        exported,
        encrypted: decoded,
        guest: null,
        summary,
        currentRevision: snapshot.revision,
        fileName: file.name,
      });
      setMessage("File hợp lệ. Kiểm tra thống kê trước khi xác nhận.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể kiểm tra file backup.");
    } finally {
      setBusy(false);
    }
  }

  async function restore() {
    if (confirmation !== "RESTORE") {
      return setMessage("Hãy nhập chính xác RESTORE để xác nhận.");
    }
    if (!pending || (!localMode && (!session || !picketApi))) return;
    setBusy(true);
    setMessage(null);
    try {
      if (localMode && pending.guest) await restoreGuestBackup(pending.guest, guest.replace);
      else if (pending.encrypted) await restoreEncryptedBackup(session!.access_token, session!.user.id, pending.currentRevision, pending.encrypted);
      else if (pending.exported) await picketApi!.restoreFinance(session!.access_token, {
        confirmation: "RESTORE",
        expectedRevision: pending.currentRevision,
        export: pending.exported,
      });
      if (!localMode) await Promise.all([
        refreshProfile(),
        refreshAccounts(),
        refreshTransactions(),
        refreshBudgets(),
      ]);
      router.replace(routes.home);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Không thể khôi phục. Dữ liệu hiện tại không bị thay đổi.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable accessibilityRole="button" onPress={() => router.back()}>
          <Text style={styles.back}>‹ Quay lại</Text>
        </Pressable>
        <Text accessibilityRole="header" style={styles.title}>Khôi phục backup</Text>
        <Text style={styles.description}>
          {localMode ? "Chọn bản sao .picket dành cho chế độ trên máy và nhập mật khẩu của file." : "Chọn bản export JSON hoặc bản sao mã hóa .picket. Nhập mật khẩu riêng nếu dùng .picket."}
        </Text>
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Lưu ý</Text>
          <Text style={styles.noticeText}>{localMode ? "Bản sao sẽ thay thế dữ liệu và ảnh kỷ vật trên máy. Hãy tạo một bản sao hiện tại trước khi khôi phục." : "Backup sẽ thay thế dữ liệu tài chính hiện tại. Nếu revision đã thay đổi hoặc có lỗi, giao dịch sẽ rollback toàn bộ."}</Text>
        </View>
        <TextInput accessibilityLabel="Mật khẩu bản sao mã hóa" autoCapitalize="none" autoComplete="off" onChangeText={setPassword} placeholder="Mật khẩu file .picket" secureTextEntry style={styles.input} value={password} />
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => void chooseBackup()} style={styles.secondary}>
          {busy && !pending ? <ActivityIndicator accessibilityLabel="Đang đọc file backup" color={colors.mauve} /> : <Text style={styles.secondaryText}>Chọn file JSON hoặc .picket</Text>}
        </Pressable>
        {pending && (
          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>{pending.fileName}</Text>
            <Text style={styles.summaryText}>Ví: {pending.summary.wallets}</Text>
            <Text style={styles.summaryText}>Giao dịch: {pending.summary.entries}</Text>
            {localMode && <Text style={styles.summaryText}>Ảnh hóa đơn: {pending.guest?.receipts.length ?? 0}</Text>}
            <Text style={styles.summaryText}>Ngân sách: {pending.summary.budgets}</Text>
            <Text style={styles.summaryText}>Hóa đơn: {pending.summary.bills}</Text>
            <Text style={styles.summaryText}>Kỷ vật: {pending.summary.keepsakes}</Text>
            <Text style={styles.summaryText}>Gói đăng ký: {pending.summary.subscriptions}</Text>
            {!localMode && <Text style={styles.revision}>Revision hiện tại: {pending.currentRevision}</Text>}
          </View>
        )}
        {pending && (
          <>
            <Text style={styles.label}>Nhập RESTORE để xác nhận</Text>
            <TextInput
              accessibilityLabel="Xác nhận khôi phục backup"
              autoCapitalize="characters"
              autoComplete="off"
              onChangeText={setConfirmation}
              style={styles.input}
              value={confirmation}
            />
            <Pressable
              accessibilityRole="button"
              disabled={busy || confirmation !== "RESTORE"}
              onPress={() => void restore()}
              style={[styles.primary, (busy || confirmation !== "RESTORE") && styles.disabled]}
            >
              {busy ? <ActivityIndicator accessibilityLabel="Đang khôi phục dữ liệu" color={colors.white} /> : <Text style={styles.primaryText}>Khôi phục dữ liệu</Text>}
            </Pressable>
          </>
        )}
        {message && <Text accessibilityLiveRegion="polite" style={pending ? styles.success : styles.error}>{message}</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.cream, flex: 1 },
  content: { gap: 16, padding: 24, paddingBottom: 48 },
  back: { color: colors.mauve, fontSize: 15, fontWeight: "700" },
  title: { color: colors.ink, fontSize: 32, fontWeight: "700", lineHeight: 38 },
  description: { color: colors.muted, fontSize: 15, lineHeight: 23 },
  notice: { backgroundColor: colors.white, borderColor: colors.peach, borderRadius: radii.medium, borderWidth: 1, gap: 5, padding: 16 },
  noticeTitle: { color: colors.ink, fontSize: 15, fontWeight: "700" },
  noticeText: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  secondary: { alignItems: "center", borderColor: colors.mauve, borderRadius: radii.small, borderWidth: 1, justifyContent: "center", minHeight: 52 },
  secondaryText: { color: colors.mauve, fontSize: 15, fontWeight: "700" },
  summary: { backgroundColor: colors.white, borderRadius: radii.medium, gap: 6, padding: 18 },
  summaryTitle: { color: colors.ink, fontSize: 16, fontWeight: "700", marginBottom: 4 },
  summaryText: { color: colors.ink, fontSize: 14 },
  revision: { color: colors.muted, fontSize: 12, marginTop: 6 },
  label: { color: colors.ink, fontSize: 14, fontWeight: "700" },
  input: { backgroundColor: colors.white, borderColor: colors.mauve, borderRadius: radii.small, borderWidth: 1, color: colors.ink, fontSize: 17, minHeight: 54, paddingHorizontal: 16 },
  primary: { alignItems: "center", backgroundColor: colors.mauve, borderRadius: radii.small, justifyContent: "center", minHeight: 54 },
  primaryText: { color: colors.white, fontSize: 15, fontWeight: "700" },
  disabled: { opacity: 0.45 },
  error: { color: colors.expense, fontSize: 14, lineHeight: 20 },
  success: { color: colors.income, fontSize: 14, fontWeight: "700", lineHeight: 20 },
});
