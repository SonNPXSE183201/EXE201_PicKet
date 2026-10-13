import { colors, radii } from "@picket/design-tokens";
import type { CurrentProfile, Entitlements } from "@picket/domain";
import { Redirect, router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { picketApi } from "@/core/api/client";
import { routes } from "@/core/navigation/routes";
import { exportAndShareFinance } from "@/core/export/export-finance";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { useAuth } from "@/features/auth/auth-context";
import { useProfile } from "@/features/profile/profile-context";

const personas = ["Đi làm", "Sinh viên", "Tự do", "Gia đình"] as const;
const goals = ["Hiểu chi tiêu", "Tiết kiệm", "Quản lý hóa đơn"] as const;
const currencies = ["VND", "USD"] as const;

export default function ProfileScreen() {
  const { session } = useAuth();
  const { loading, profile } = useProfile();

  if (!session) return <Redirect href={routes.login} />;
  if (loading || !profile) return <SafeAreaView style={[styles.safeArea, styles.center]}><ActivityIndicator color={colors.mauve} /></SafeAreaView>;

  return <ProfileForm key={profile.id} profile={profile} />;
}

function ProfileForm({ profile }: { profile: CurrentProfile }) {
  const { session } = useAuth();
  const { updatePreferences, updateProfile } = useProfile();
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [persona, setPersona] = useState(profile.persona);
  const [goal, setGoal] = useState(profile.goal);
  const [currencyCode, setCurrencyCode] = useState(profile.currencyCode);
  const [hideBalance, setHideBalance] = useState(profile.hideBalance);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);

  useEffect(() => {
    if (!session || !picketApi) return;
    let active = true;
    void picketApi.currentEntitlements(session.access_token)
      .then((result) => { if (active) setEntitlements(result); })
      .catch(() => { if (active) setEntitlements(null); });
    return () => { active = false; };
  }, [session]);

  async function save() {
    if (!displayName.trim()) return setMessage("Tên hiển thị không được để trống.");
    setBusy(true);
    setMessage(null);
    try {
      await updateProfile({ display_name: displayName.trim(), locale: profile.locale, timezone: profile.timezone });
      await updatePreferences({ persona, goal, currency_code: currencyCode, hide_balance: hideBalance });
      setMessage("Đã lưu và đồng bộ cài đặt.");
    } catch {
      setMessage("Không lưu được cài đặt. Hãy kiểm tra kết nối và thử lại.");
    } finally {
      setBusy(false);
    }
  }

  async function exportData() {
    if (!session) return;
    setBusy(true);
    setMessage(null);
    try {
      await exportAndShareFinance(session.access_token);
      setMessage("Đã tạo bản export. Hãy chọn nơi lưu an toàn.");
    } catch {
      setMessage("Không tạo được bản export. Hãy kiểm tra Dart API và thử lại.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}><Pressable accessibilityRole="button" onPress={() => router.back()}><Text style={styles.back}>‹ Quay lại</Text></Pressable></View>
        <Text accessibilityRole="header" style={styles.title}>Hồ sơ và tùy chọn</Text>
        <Text style={styles.description}>Các thay đổi được đồng bộ với Next.js thông qua Dart API.</Text>
        <Text style={styles.label}>Tên hiển thị</Text>
        <TextInput accessibilityLabel="Tên hiển thị" maxLength={120} onChangeText={setDisplayName} style={styles.input} value={displayName} />
        <ChoiceGroup label="Nhịp sống" options={personas} selected={persona} select={setPersona} />
        <ChoiceGroup label="Mục tiêu" options={goals} selected={goal} select={setGoal} />
        <ChoiceGroup label="Tiền tệ chính" options={currencies} selected={currencyCode} select={setCurrencyCode} />
        <View style={styles.switchRow}><View style={styles.switchCopy}><Text style={styles.switchTitle}>Ẩn số dư</Text><Text style={styles.switchDescription}>Che số tiền trên màn hình tổng quan.</Text></View><Switch accessibilityLabel="Ẩn số dư" onValueChange={setHideBalance} thumbColor={colors.white} trackColor={{ false: colors.peach, true: colors.mauve }} value={hideBalance} /></View>
        {entitlements && <View style={styles.planCard}><Text style={styles.planTitle}>Gói {entitlements.tier.toUpperCase()}</Text><Text style={styles.planText}>OCR cloud còn {entitlements.ocrFallbackRemaining}/{entitlements.ocrFallbackDailyLimit} lượt trong 24 giờ.</Text></View>}
        {message && <Text accessibilityLiveRegion="polite" style={message.startsWith("Đã") ? styles.success : styles.error}>{message}</Text>}
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => void save()} style={styles.primary}>{busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryText}>Lưu thay đổi</Text>}</Pressable>
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => void exportData()} style={styles.secondary}><Text style={styles.secondaryText}>Export dữ liệu JSON</Text></Pressable>
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => router.push(routes.restore)} style={styles.secondary}><Text style={styles.secondaryText}>Khôi phục từ bản export</Text></Pressable>
        <Text style={styles.sensitive}>Bản export chứa dữ liệu tài chính nhạy cảm. Chỉ lưu ở nơi bạn tin cậy.</Text>
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => router.push(routes.deleteAccount)} style={styles.deleteLink}><Text style={styles.deleteText}>Xóa tài khoản</Text></Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function ChoiceGroup<T extends string>({ label, options, selected, select }: { label: string; options: readonly T[]; selected: string; select(value: T): void }) {
  return <View><Text style={styles.label}>{label}</Text><View style={styles.choices}>{options.map((option) => <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected === option }} key={option} onPress={() => select(option)} style={[styles.choice, selected === option && styles.choiceSelected]}><Text style={[styles.choiceText, selected === option && styles.choiceTextSelected]}>{option}</Text></Pressable>)}</View></View>;
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.cream, flex: 1 }, center: { alignItems: "center", justifyContent: "center" }, content: { gap: 14, padding: 24, paddingBottom: 48 }, header: { minHeight: 38 }, back: { color: colors.mauve, fontSize: 15, fontWeight: "800" }, title: { color: colors.ink, fontSize: 32, fontWeight: "800", lineHeight: 38 }, description: { color: colors.muted, fontSize: 15, lineHeight: 23, marginBottom: 8 }, label: { color: colors.ink, fontSize: 14, fontWeight: "800", marginTop: 8 }, input: { backgroundColor: colors.white, borderColor: colors.peach, borderRadius: radii.small, borderWidth: 1, color: colors.ink, fontSize: 16, minHeight: 52, paddingHorizontal: 15 }, choices: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, choice: { backgroundColor: colors.white, borderColor: colors.peach, borderRadius: radii.pill, borderWidth: 1, minHeight: 44, justifyContent: "center", paddingHorizontal: 15 }, choiceSelected: { backgroundColor: colors.mauve, borderColor: colors.mauve }, choiceText: { color: colors.ink, fontSize: 14, fontWeight: "700" }, choiceTextSelected: { color: colors.white }, switchRow: { alignItems: "center", backgroundColor: colors.white, borderRadius: radii.medium, flexDirection: "row", gap: 14, marginTop: 8, minHeight: 76, padding: 16 }, switchCopy: { flex: 1 }, switchTitle: { color: colors.ink, fontSize: 15, fontWeight: "800" }, switchDescription: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 3 }, planCard: { backgroundColor: colors.white, borderColor: colors.peach, borderRadius: radii.medium, borderWidth: 1, gap: 5, padding: 16 }, planTitle: { color: colors.ink, fontSize: 15, fontWeight: "800" }, planText: { color: colors.muted, fontSize: 13, lineHeight: 19 }, primary: { alignItems: "center", backgroundColor: colors.mauve, borderRadius: radii.small, justifyContent: "center", marginTop: 10, minHeight: 52 }, primaryText: { color: colors.white, fontSize: 16, fontWeight: "800" }, secondary: { alignItems: "center", borderColor: colors.mauve, borderRadius: radii.small, borderWidth: 1, justifyContent: "center", minHeight: 52 }, secondaryText: { color: colors.mauve, fontSize: 15, fontWeight: "800" }, sensitive: { color: colors.expense, fontSize: 12, lineHeight: 18 }, deleteLink: { alignItems: "center", minHeight: 48, justifyContent: "center" }, deleteText: { color: colors.expense, fontSize: 14, fontWeight: "800" }, error: { color: colors.expense, fontSize: 14 }, success: { color: colors.income, fontSize: 14, fontWeight: "700" },
});
