import { colors, radii } from "@picket/design-tokens";
import type { CurrentProfile, Entitlements } from "@picket/domain";
import { Redirect, router } from "expo-router";
import { useEffect, useState } from "react";
import { PicketTextInput as TextInput } from "@/core/ui/picket-text-input";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { picketApi } from "@/core/api/client";
import { routes } from "@/core/navigation/routes";
import { exportAndShareFinance } from "@/core/export/export-finance";
import { exportEncryptedBackup, exportFinanceCsv, exportGuestBackup } from "@/core/export/flutter-compatible-backup";
import { useGuestFinance } from "@/core/local/guest-finance-context";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { AppIcon } from "@/core/ui/app-icon";
import { MenuRow, SectionTitle, Surface, TopAppBar } from "@/core/ui/picket-ui";
import { useAuth } from "@/features/auth/auth-context";
import { isStaff } from "@/features/admin/admin-mobile";
import { useProfile } from "@/features/profile/profile-context";
import { useDeviceLock } from "@/features/security/device-lock";

const personas = ["Đi làm", "Sinh viên", "Tự do", "Gia đình"] as const;
const goals = ["Hiểu chi tiêu", "Tiết kiệm", "Quản lý hóa đơn"] as const;
const currencies = ["VND", "USD"] as const;

export default function ProfileScreen() {
  const { session, localMode } = useAuth();
  const { error, loading, profile, refresh } = useProfile();

  if (!session && !localMode) return <Redirect href={routes.login} />;
  if (loading && !profile) return <SafeAreaView style={[styles.safeArea, styles.center]}><ActivityIndicator accessibilityLabel="Đang tải hồ sơ" color={colors.mauve} /></SafeAreaView>;
  if (!profile) return <SafeAreaView style={[styles.safeArea, styles.center]}><Text style={styles.error}>{error ?? "Chưa có hồ sơ lưu trên thiết bị. Hãy kết nối mạng rồi thử lại."}</Text><Pressable accessibilityRole="button" onPress={() => void refresh()}><Text style={styles.back}>Tải lại hồ sơ</Text></Pressable></SafeAreaView>;

  return <ProfileForm key={profile.id} profile={profile} />;
}

function ProfileForm({ profile }: { profile: CurrentProfile }) {
  const { session, localMode, leaveLocalMode, signOut } = useAuth();
  const { updatePreferences, updateProfile } = useProfile();
  const deviceLock = useDeviceLock();
  const guest = useGuestFinance();
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [persona, setPersona] = useState(profile.persona);
  const [goal, setGoal] = useState(profile.goal);
  const [currencyCode, setCurrencyCode] = useState(profile.currencyCode);
  const [visibilityDraft, setVisibilityDraft] = useState<boolean | null>(null);
  const hideBalance = visibilityDraft ?? profile.hideBalance;
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);
  const [staff, setStaff] = useState(false);
  const [backupPassword, setBackupPassword] = useState("");
  const [editingProfile, setEditingProfile] = useState(false);
  const [showBackup, setShowBackup] = useState(false);

  async function changeVisibility(next: boolean) {
    if (visibilityDraft !== null) return;
    setVisibilityDraft(next); setMessage(null);
    try { await updatePreferences({ hide_balance: next }); }
    catch { setMessage("Chưa lưu được tùy chọn ẩn số dư. Hãy thử lại."); }
    finally { setVisibilityDraft(null); }
  }

  useEffect(() => {
    if (!session || !picketApi) return;
    let active = true;
    void picketApi.currentEntitlements(session.access_token)
      .then((result) => { if (active) setEntitlements(result); })
      .catch(() => { if (active) setEntitlements(null); });
    return () => { active = false; };
  }, [session]);

  useEffect(() => {
    let active = true;
    void isStaff().then((value) => { if (active) setStaff(value); }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  async function save() {
    if (!displayName.trim()) return setMessage("Tên hiển thị không được để trống.");
    setBusy(true);
    setMessage(null);
    try {
      await updateProfile({ display_name: displayName.trim(), locale: profile.locale, timezone: profile.timezone });
      await updatePreferences({ persona, goal, currency_code: currencyCode, hide_balance: hideBalance });
      setMessage(localMode ? "Đã lưu cài đặt trên thiết bị." : "Đã lưu và đồng bộ cài đặt.");
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
      setMessage("Chưa tạo được bản sao. Hãy kiểm tra kết nối và thử lại.");
    } finally {
      setBusy(false);
    }
  }

  async function exportExtra(kind: "csv" | "picket") {
    if (!session) return;
    setBusy(true);
    setMessage(null);
    try {
      if (kind === "csv") await exportFinanceCsv(session.access_token);
      else await exportEncryptedBackup(session.access_token, session.user.id, backupPassword);
      setMessage("Đã tạo file. Hãy chọn nơi lưu an toàn.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không tạo được bản sao.");
    } finally { setBusy(false); }
  }

  async function exportLocalBackup() {
    setBusy(true); setMessage(null);
    try { await exportGuestBackup(guest.data, backupPassword); setMessage("Đã tạo bản sao trên máy. Hãy lưu file và mật khẩu ở nơi an toàn."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Không tạo được bản sao."); }
    finally { setBusy(false); }
  }

  function confirmSignOut() {
    if (localMode) {
      Alert.alert("Thoát chế độ trên thiết bị?", "Dữ liệu trên máy được giữ riêng và sẽ hiện lại khi bạn chọn dùng không cần đăng nhập.", [
        { text: "Hủy", style: "cancel" },
        { text: "Thoát", onPress: () => { void leaveLocalMode().then(() => router.replace(routes.login)); } },
      ]);
      return;
    }
    Alert.alert("Đăng xuất?", "Bản nháp và thay đổi chưa đồng bộ vẫn được giữ trên thiết bị này.", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Đăng xuất",
        onPress: () => {
          setBusy(true);
          setMessage(null);
          void (async () => {
            try {
              await signOut();
              router.replace(routes.login);
            } catch {
              setMessage("Không đăng xuất được. Hãy thử lại.");
            } finally {
              setBusy(false);
            }
          })();
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TopAppBar title="Cá nhân" back={false} />
        <Surface peach style={styles.profileCard}><View style={styles.avatar}><AppIcon name="account" color={colors.white} size={36} /></View><Text style={styles.profileName}>{profile.displayName || "Bạn của Picket"}</Text><Text style={styles.description}>{localMode ? "Lưu riêng trên thiết bị" : session?.user.email}</Text><Pressable accessibilityState={{ expanded: editingProfile }} onPress={() => setEditingProfile(!editingProfile)}><Text style={styles.back}>{editingProfile ? "Đóng chỉnh sửa" : "Chỉnh sửa hồ sơ"}</Text></Pressable></Surface>
        {editingProfile && <Surface>
        <Text style={styles.label}>Tên hiển thị</Text>
        <TextInput accessibilityLabel="Tên hiển thị" maxLength={120} onChangeText={setDisplayName} style={styles.input} value={displayName} />
        <ChoiceGroup label="Nhịp sống" options={personas} selected={persona} select={setPersona} />
        <ChoiceGroup label="Mục tiêu" options={goals} selected={goal} select={setGoal} />
        <ChoiceGroup label="Tiền tệ chính" options={currencies} selected={currencyCode} select={setCurrencyCode} />
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => void save()} style={styles.primary}>{busy ? <ActivityIndicator accessibilityLabel="Đang lưu hồ sơ" color={colors.white} /> : <Text style={styles.primaryText}>Lưu thay đổi</Text>}</Pressable>
        </Surface>}
        <SectionTitle title="Tùy chọn và bảo mật" />
        <View style={styles.switchRow}><View style={styles.switchCopy}><Text style={styles.switchTitle}>Ẩn số dư</Text><Text style={styles.switchDescription}>Che số tiền trên màn hình tổng quan.</Text></View><Switch accessibilityLabel="Ẩn số dư" disabled={visibilityDraft !== null} hitSlop={12} onValueChange={(next) => void changeVisibility(next)} thumbColor={colors.white} trackColor={{ false: colors.peach, true: colors.mauve }} value={hideBalance} /></View>
        <View style={styles.switchRow}><View style={styles.switchCopy}><Text style={styles.switchTitle}>Khóa ứng dụng</Text><Text style={styles.switchDescription}>Yêu cầu sinh trắc học hoặc mã khóa thiết bị khi mở lại Picket.</Text></View><Switch accessibilityLabel="Khóa ứng dụng" disabled={deviceLock.busy} hitSlop={12} onValueChange={(next) => void deviceLock.setEnabled(next).then((saved) => { if (!saved) setMessage("Chưa thể đổi khóa. Hãy thiết lập mã khóa thiết bị rồi thử lại."); })} thumbColor={colors.white} trackColor={{ false: colors.peach, true: colors.mauve }} value={deviceLock.enabled} /></View>
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => void save()}><Text style={styles.back}>Lưu tùy chọn</Text></Pressable>
        {entitlements && <View style={styles.planCard}><Text style={styles.planTitle}>Picket {entitlements.tier.toUpperCase()}</Text><Text style={styles.planText}>Còn {entitlements.ocrFallbackRemaining}/{entitlements.ocrFallbackDailyLimit} lượt nhận diện nâng cao trong 24 giờ.</Text></View>}
        {message && <Text accessibilityLiveRegion="polite" style={message.startsWith("Đã") ? styles.success : styles.error}>{message}</Text>}
        <SectionTitle title="Công cụ của bạn" />
        <Surface style={styles.menuGroup}>
        <MenuRow disabled={busy} icon="calendar-check-outline" title="Hóa đơn cần thanh toán" onPress={() => router.push(routes.bills)} />
        <MenuRow disabled={busy} icon="repeat" title="Chi phí định kỳ" onPress={() => router.push(routes.subscriptions)} />
        <MenuRow disabled={busy} icon="shape-outline" title="Quản lý danh mục" onPress={() => router.push(routes.categories)} />
        <MenuRow disabled={busy} icon="chart-box-outline" title="Thống kê thu chi" onPress={() => router.push(routes.insights)} />
        <MenuRow disabled={busy} icon="image-multiple-outline" title="Bộ sưu tập kỷ vật" onPress={() => router.push(routes.keepsakes)} />
        <MenuRow disabled={busy} icon="bell-outline" title="Thông báo và nhắc việc" onPress={() => router.push(routes.notifications)} />
        </Surface>
        <SectionTitle title="Tài khoản và dữ liệu" />
        <Surface style={styles.menuGroup}>
        {!localMode && <MenuRow disabled={busy} icon="crown-outline" title="Gói Picket và thanh toán" onPress={() => router.push(routes.billing)} />}
        <MenuRow icon="cloud-upload-outline" title="Sao lưu và xuất dữ liệu" description="Bản sao mã hóa, JSON và CSV" onPress={() => setShowBackup(!showBackup)} />
        <MenuRow disabled={busy} icon="backup-restore" title="Khôi phục từ bản sao" onPress={() => router.push(routes.restore)} />
        <MenuRow disabled={busy} icon="sync" title="Kiểm tra đồng bộ" onPress={() => router.push(routes.syncConflicts)} />
        {!localMode && staff && <MenuRow disabled={busy} icon="shield-account-outline" title="Quản trị Picket" onPress={() => router.push(routes.admin)} />}
        </Surface>
        {showBackup && <Surface>
        {!localMode && <MenuRow disabled={busy} icon="file-code-outline" title="Xuất dữ liệu JSON" onPress={() => void exportData()} />}
        {!localMode && <MenuRow disabled={busy} icon="file-table-outline" title="Xuất giao dịch CSV" onPress={() => void exportExtra("csv")} />}
        <TextInput accessibilityLabel="Mật khẩu bản sao mã hóa" autoCapitalize="none" autoComplete="off" onChangeText={setBackupPassword} placeholder="Mật khẩu riêng, ít nhất 12 ký tự" secureTextEntry style={styles.input} value={backupPassword} />
        <Pressable accessibilityRole="button" disabled={busy || backupPassword.length < 12 || (localMode && guest.loading)} onPress={() => void (localMode ? exportLocalBackup() : exportExtra("picket"))} style={styles.secondary}><Text style={styles.secondaryText}>Tạo bản sao .picket có ảnh</Text></Pressable>
        <Text style={styles.sensitive}>Bản export chứa dữ liệu tài chính nhạy cảm. Chỉ lưu ở nơi bạn tin cậy.</Text>
        </Surface>}
        <Pressable accessibilityRole="button" disabled={busy} onPress={confirmSignOut} style={styles.signOut}><Text style={styles.signOutText}>{localMode ? "Thoát chế độ trên máy" : "Đăng xuất"}</Text></Pressable>
        {!localMode && <Pressable accessibilityRole="button" disabled={busy} onPress={() => router.push(routes.deleteAccount)} style={styles.deleteLink}><Text style={styles.deleteText}>Xóa tài khoản</Text></Pressable>}
      </ScrollView>
    </SafeAreaView>
  );
}

function ChoiceGroup<T extends string>({ label, options, selected, select }: { label: string; options: readonly T[]; selected: string; select(value: T): void }) {
  return <View><Text style={styles.label}>{label}</Text><View style={styles.choices}>{options.map((option) => <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected === option }} key={option} onPress={() => select(option)} style={[styles.choice, selected === option && styles.choiceSelected]}><Text style={[styles.choiceText, selected === option && styles.choiceTextSelected]}>{option}</Text></Pressable>)}</View></View>;
}

const styles = StyleSheet.create({
  profileCard: { alignItems: "center", gap: 8, paddingVertical: 24 }, avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.mauve, alignItems: "center", justifyContent: "center" }, profileName: { color: colors.ink, fontSize: 23, lineHeight: 32, fontWeight: "700", textAlign: "center" }, menuGroup: { paddingVertical: 4 },
  signOut: { alignItems: "center", borderColor: colors.peach, borderRadius: radii.small, borderWidth: 1, justifyContent: "center", minHeight: 52 },
  signOutText: { color: colors.ink, fontSize: 15, fontWeight: "700" },
  safeArea: { backgroundColor: colors.cream, flex: 1 }, center: { alignItems: "center", justifyContent: "center" }, content: { gap: 12, padding: 20, paddingBottom: 140 }, header: { minHeight: 38 }, back: { color: colors.mauve, fontSize: 14, fontWeight: "700", paddingVertical: 12 }, title: { color: colors.ink, fontSize: 32, fontWeight: "700", lineHeight: 38 }, description: { color: colors.muted, fontSize: 13, lineHeight: 20, textAlign: "center" }, label: { color: colors.ink, fontSize: 14, fontWeight: "600", marginTop: 16, marginBottom: 8 }, input: { backgroundColor: colors.cream, borderColor: colors.line, borderRadius: radii.small, borderWidth: 1, color: colors.ink, fontSize: 16, minHeight: 56, paddingHorizontal: 15 }, choices: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, choice: { backgroundColor: colors.white, borderColor: colors.peach, borderRadius: radii.pill, borderWidth: 1, minHeight: 48, justifyContent: "center", paddingHorizontal: 15 }, choiceSelected: { backgroundColor: colors.mauve, borderColor: colors.mauve }, choiceText: { color: colors.ink, fontSize: 14, fontWeight: "600" }, choiceTextSelected: { color: colors.white }, switchRow: { alignItems: "center", backgroundColor: colors.white, borderRadius: radii.medium, flexDirection: "row", gap: 14, minHeight: 76, padding: 16 }, switchCopy: { flex: 1 }, switchTitle: { color: colors.ink, fontSize: 15, fontWeight: "600" }, switchDescription: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 3 }, planCard: { backgroundColor: colors.white, borderColor: colors.peach, borderRadius: radii.medium, borderWidth: 1, gap: 5, padding: 16 }, planTitle: { color: colors.ink, fontSize: 15, fontWeight: "700" }, planText: { color: colors.muted, fontSize: 13, lineHeight: 19 }, primary: { alignItems: "center", backgroundColor: colors.mauve, borderRadius: 28, justifyContent: "center", marginTop: 20, minHeight: 52 }, primaryText: { color: colors.white, fontSize: 16, fontWeight: "700" }, secondary: { alignItems: "center", borderColor: colors.mauve, borderRadius: radii.small, borderWidth: 1, justifyContent: "center", minHeight: 52 }, secondaryText: { color: colors.mauve, fontSize: 15, fontWeight: "700" }, sensitive: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 12 }, deleteLink: { alignItems: "center", minHeight: 48, justifyContent: "center" }, deleteText: { color: colors.expense, fontSize: 14, fontWeight: "700" }, error: { color: colors.expense, fontSize: 14 }, success: { color: colors.income, fontSize: 14, fontWeight: "600" },
});
