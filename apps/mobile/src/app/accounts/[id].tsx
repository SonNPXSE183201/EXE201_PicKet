import { colors, radii } from "@picket/design-tokens";
import type { AccountKind, FinancialAccount } from "@picket/domain";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { routes } from "@/core/navigation/routes";
import { isOfflineQueuedError } from "@/core/sync/offline-queued-error";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { useAccounts } from "@/features/accounts/accounts-context";
import { useAuth } from "@/features/auth/auth-context";

const kinds: { value: AccountKind; label: string }[] = [
  { value: "cash", label: "Tiền mặt" },
  { value: "bank", label: "Ngân hàng" },
  { value: "ewallet", label: "Ví điện tử" },
  { value: "other", label: "Khác" },
];

export default function AccountDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const { accounts, loading } = useAccounts();
  const account = accounts.find((item) => item.id === id);

  if (!session) return <Redirect href={routes.login} />;
  if (!account && loading) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.center]}>
        <ActivityIndicator color={colors.mauve} />
      </SafeAreaView>
    );
  }
  if (!account) return <Redirect href={routes.home} />;

  return <AccountForm account={account} />;
}

function AccountForm({ account }: { account: FinancialAccount }) {
  const { archive, update } = useAccounts();
  const [initialAccount] = useState(account);
  const [name, setName] = useState(initialAccount.name);
  const [kind, setKind] = useState<AccountKind>(initialAccount.kind);
  const [currencyCode, setCurrencyCode] = useState(initialAccount.currencyCode);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const selectedAccount = initialAccount;

  async function save() {
    if (!name.trim()) {
      setMessage("Hãy nhập tên tài khoản.");
      return;
    }
    if (!/^[A-Z]{3}$/.test(currencyCode)) {
      setMessage("Mã tiền tệ phải gồm 3 chữ cái, ví dụ VND.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await update(selectedAccount.id, {
        expectedVersion: selectedAccount.version,
        name: name.trim(),
        kind,
        currencyCode,
      });
      router.back();
    } catch (error) {
      if (isOfflineQueuedError(error)) {
        router.replace(routes.home);
        return;
      }
      setMessage("Không lưu được. Dữ liệu có thể đã thay đổi, hãy tải lại và thử lại.");
    } finally {
      setBusy(false);
    }
  }

  function confirmArchive() {
    Alert.alert(
      "Lưu trữ tài khoản?",
      "Tài khoản sẽ không còn xuất hiện trong danh sách. Giao dịch lịch sử vẫn được giữ lại.",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Lưu trữ",
          style: "destructive",
          onPress: () => void archiveAccount(),
        },
      ],
    );
  }

  async function archiveAccount() {
    setBusy(true);
    setMessage(null);
    try {
      await archive(selectedAccount.id, selectedAccount.version);
      router.replace(routes.home);
    } catch (error) {
      if (isOfflineQueuedError(error)) {
        router.replace(routes.home);
        return;
      }
      setMessage("Không lưu trữ được. Hãy tải lại và thử lại.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text accessibilityRole="header" style={styles.title}>Chỉnh sửa tài khoản</Text>
        <Text style={styles.subtitle}>
          Số dư đầu kỳ chỉ thiết lập khi tạo để đảm bảo lịch sử giao dịch nhất quán.
        </Text>
        <Text style={styles.label}>Tên tài khoản</Text>
        <TextInput
          maxLength={80}
          placeholder="Tên tài khoản"
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={name}
          onChangeText={setName}
        />
        <Text style={styles.label}>Loại tài khoản</Text>
        <View accessibilityRole="radiogroup" style={styles.choices}>
          {kinds.map((item) => (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: kind === item.value }}
              key={item.value}
              onPress={() => setKind(item.value)}
              style={[styles.choice, kind === item.value && styles.selected]}
            >
              <Text style={[styles.choiceText, kind === item.value && styles.selectedText]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.label}>Tiền tệ</Text>
        <TextInput
          autoCapitalize="characters"
          maxLength={3}
          placeholder="VND"
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={currencyCode}
          onChangeText={(value) => setCurrencyCode(value.toUpperCase())}
        />
        {message && <Text accessibilityLiveRegion="polite" role="alert" style={styles.error}>{message}</Text>}
        <Pressable disabled={busy} onPress={() => void save()} style={styles.primary}>
          {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryText}>Lưu thay đổi</Text>}
        </Pressable>
        <Pressable disabled={busy} onPress={confirmArchive} style={styles.archive}>
          <Text style={styles.archiveText}>Lưu trữ tài khoản</Text>
        </Pressable>
        <Pressable disabled={busy} onPress={() => router.back()} style={styles.secondary}>
          <Text style={styles.secondaryText}>Hủy</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.cream, flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },
  content: { gap: 14, padding: 24 },
  title: { color: colors.ink, fontSize: 30, fontWeight: "800", marginTop: 20 },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22, marginBottom: 12 },
  label: { color: colors.ink, fontSize: 14, fontWeight: "800" },
  input: { backgroundColor: colors.white, borderColor: colors.peach, borderRadius: radii.small, borderWidth: 1, color: colors.ink, fontSize: 16, minHeight: 52, paddingHorizontal: 16 },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choice: { backgroundColor: colors.white, borderColor: colors.peach, borderRadius: radii.pill, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  selected: { backgroundColor: colors.mauve, borderColor: colors.mauve },
  choiceText: { color: colors.ink, fontWeight: "700" },
  selectedText: { color: colors.white },
  error: { color: colors.expense, fontSize: 14, lineHeight: 20 },
  primary: { alignItems: "center", backgroundColor: colors.mauve, borderRadius: radii.small, justifyContent: "center", marginTop: 8, minHeight: 52 },
  primaryText: { color: colors.white, fontSize: 16, fontWeight: "800" },
  archive: { alignItems: "center", borderColor: colors.expense, borderRadius: radii.small, borderWidth: 1, justifyContent: "center", minHeight: 52 },
  archiveText: { color: colors.expense, fontSize: 16, fontWeight: "800" },
  secondary: { alignItems: "center", minHeight: 44, padding: 12 },
  secondaryText: { color: colors.mauve, fontSize: 15, fontWeight: "800" },
});
