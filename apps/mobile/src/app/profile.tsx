import { paperControl, paperShape, paperSpace } from "@/core/theme/paper-foundations";
import { PicketScrollView as ScrollView } from "@/core/ui/picket-scroll-view";
import { PicketText as Text } from "@/core/ui/picket-text";

import { useTranslation } from "react-i18next";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import type { CurrentProfile, Entitlements } from "@picket/domain";
import { Redirect, router } from "expo-router";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { PicketTextInput as TextInput } from "@/core/ui/picket-text-input";
import { ActivityIndicator, Linking, StyleSheet, Switch, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { picketApi } from "@/core/api/client";
import { routes } from "@/core/navigation/routes";
import { exportAndShareFinance } from "@/core/export/export-finance";
import { exportEncryptedBackup, exportFinanceCsv, exportGuestBackup } from "@/core/export/flutter-compatible-backup";
import { useGuestFinance } from "@/core/local/guest-finance-context";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { AppIcon } from "@/core/ui/app-icon";
import { ActionSheet, ChoiceChip, IconButton, Surface } from "@/core/ui/picket-ui";
import { useAuth } from "@/features/auth/auth-context";
import { AnalyticsConsentControl } from "@/features/settings/analytics-consent";
import { useProfile } from "@/features/profile/profile-context";
import { useDeviceLock } from "@/features/security/device-lock";
import { AppUpdateSection, InstalledVersion } from "@/features/updates/app-update-section";
import { pendingMutationCount, mutationConflictCount } from "@/core/sync/mutation-queue";
import { signOutCopy } from "@/features/profile/sign-out-copy";
import { useAppTheme } from "@/features/settings/appearance-provider";

const personas = ["Đi làm", "Sinh viên", "Tự do", "Gia đình"] as const;
const goals = ["Hiểu chi tiêu", "Tiết kiệm", "Quản lý hóa đơn"] as const;
const currencies = ["VND", "USD"] as const;

export default function ProfileScreen() {
  const { t } = useTranslation("profile");
  const { colors, styles } = useMobileStyles(createStyles);
  const { session, localMode } = useAuth();
  const { error, loading, profile, refresh } = useProfile();

  if (!session && !localMode) return <Redirect href={routes.login} />;
  if (loading && !profile) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.fallbackPage]}>
        <View style={[styles.center, styles.fallbackBody]}>
          <ActivityIndicator accessibilityLabel={t("Đang tải hồ sơ")} color={colors.link} />
        </View>
        <InstalledVersion />
      </SafeAreaView>
    );
  }
  if (!profile) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.fallbackPage]}>
        <View style={[styles.center, styles.fallbackBody]}>
          <Text style={styles.error}>
            {error ? t(error, { defaultValue: error }) : t("Chưa có hồ sơ lưu trên thiết bị. Hãy kết nối mạng rồi thử lại.")}
          </Text>
          <Pressable accessibilityRole="button" onPress={() => void refresh()}>
            <Text style={styles.back}>{t("Tải lại hồ sơ")}</Text>
          </Pressable>
        </View>
        <InstalledVersion />
      </SafeAreaView>
    );
  }

  return <ProfileForm key={profile.id} profile={profile} />;
}

function ProfileForm({ profile }: { profile: CurrentProfile }) {
  const { t } = useTranslation("profile");
  const { colors, styles, theme } = useMobileStyles(createStyles);
  const { language, update: updateThemeSettings } = useAppTheme();
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
  const [backupPassword, setBackupPassword] = useState("");
  const [editingProfile, setEditingProfile] = useState(false);
  const [showBackup, setShowBackup] = useState(false);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [signOutPrompt, setSignOutPrompt] = useState<{ owner: string | null; copy: string } | null>(null);
  const signOutReading = useRef(false);
  const activeOwner = useRef(session?.user.id);
  useLayoutEffect(() => {
    activeOwner.current = session?.user.id;
    return () => {
      activeOwner.current = undefined;
    };
  }, [session?.user.id]);

  async function changeVisibility(next: boolean) {
    if (visibilityDraft !== null) return;
    setVisibilityDraft(next);
    setMessage(null);
    try {
      await updatePreferences({ hide_balance: next });
    } catch {
      setMessage("Chưa lưu được tùy chọn ẩn số dư. Hãy thử lại.");
    } finally {
      setVisibilityDraft(null);
    }
  }

  useEffect(() => {
    if (!session || !picketApi) return;
    let active = true;
    void picketApi
      .currentEntitlements(session.access_token)
      .then((result) => {
        if (active) setEntitlements(result);
      })
      .catch(() => {
        if (active) setEntitlements(null);
      });
    return () => {
      active = false;
    };
  }, [session]);

  async function save() {
    if (!displayName.trim()) return setMessage("Tên hiển thị không được để trống.");
    setBusy(true);
    setMessage(null);
    try {
      await updateProfile({ display_name: displayName.trim(), locale: profile.locale, timezone: profile.timezone });
      await updatePreferences({ persona, goal, currency_code: currencyCode, hide_balance: hideBalance });
      setMessage(localMode ? "Đã lưu cài đặt trên thiết bị." : "Đã lưu và đồng bộ cài đặt.");
      setEditingProfile(false);
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
      await exportAndShareFinance(session.access_token,session.user.id);
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
      if (kind === "csv") await exportFinanceCsv(session.access_token,session.user.id);
      else await exportEncryptedBackup(session.access_token, session.user.id, backupPassword);
      setMessage("Đã tạo file. Hãy chọn nơi lưu an toàn.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không tạo được bản sao.");
    } finally {
      setBusy(false);
    }
  }

  async function exportLocalBackup() {
    setBusy(true);
    setMessage(null);
    try {
      await exportGuestBackup(guest.data, backupPassword);
      setMessage("Đã tạo bản sao trên máy. Hãy lưu file và mật khẩu ở nơi an toàn.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không tạo được bản sao.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmSignOut() {
    if (busy || signOutReading.current) return;
    if (localMode) {
      setSignOutPrompt({
        owner: null,
        copy: "Dữ liệu trên máy được giữ riêng và sẽ hiện lại khi bạn chọn dùng không cần đăng nhập.",
      });
      return;
    }
    const owner = session?.user.id;
    if (!owner) return;
    signOutReading.current = true;
    setBusy(true);
    let copy: "signOutClean" | "signOutPending";
    try {
      const [pending, conflicts] = await Promise.all([pendingMutationCount(owner), mutationConflictCount(owner)]);
      if (activeOwner.current !== owner) return;
      copy = signOutCopy(pending, conflicts);
    } catch {
      if (activeOwner.current === owner) setMessage("Không kiểm tra được đồng bộ. Hãy thử lại.");
      return;
    } finally {
      signOutReading.current = false;
      if (activeOwner.current === owner) setBusy(false);
    }
    setSignOutPrompt({ owner, copy });
  }

  async function performSignOut() {
    if (busy || !signOutPrompt) return;
    const expectedOwner = signOutPrompt.owner;
    if (expectedOwner !== null && activeOwner.current !== expectedOwner) {
      setSignOutPrompt(null);
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      if (expectedOwner === null) await leaveLocalMode();
      else await signOut();
      setSignOutPrompt(null);
      router.replace(routes.login);
    } catch {
      setMessage("Không đăng xuất được. Hãy thử lại.");
      setSignOutPrompt(null);
    } finally {
      setBusy(false);
    }
  }

  const tierLabel = entitlements?.tier === "pro" ? "Picket PRO" : entitlements?.tier === "plus" ? "Picket PLUS" : "Picket Miễn phí";
  const tierSummary = entitlements?.tier === "pro"
    ? "Hạn mức tối đa · 100 lượt OCR Cloud/ngày"
    : entitlements?.tier === "plus"
    ? "Không giới hạn túi ngân sách · OCR AI thông minh"
    : "Quản lý cơ bản trên thiết bị · OCR offline";

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Master Design Screen 11 Header */}
        <View style={styles.topHeader}>
          <Text accessibilityRole="header" style={styles.screenTitle}>{t("Cá nhân")}</Text>
        </View>

        {/* Master User Card */}
        <View style={styles.profileMasterCard}>
          <View style={styles.avatar}>
            <AppIcon name="account" color={colors.onPrimary} size={28} />
          </View>
          <View style={styles.profileTextCol}>
            <Text numberOfLines={1} style={styles.profileName}>
              {profile.displayName || t("Bạn của Picket")}
            </Text>
            <Text numberOfLines={1} style={styles.profileSub}>
              {localMode
                ? t("Lưu riêng an toàn trên máy")
                : session?.user.email
                ? `${session.user.email} · ${t("Lưu an toàn")}`
                : t("Lưu riêng an toàn trên máy")}
            </Text>
          </View>
          <IconButton
            icon="pencil-outline"
            label={t("Chỉnh sửa hồ sơ")}
            onPress={() => setEditingProfile(true)}
          />
        </View>

        {/* Master Membership Banner Card */}
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(routes.billing)}
          style={styles.membershipBanner}
        >
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.membershipTitle}>{t("Gói tài khoản: {{tier}}", { tier: tierLabel })}</Text>
            <Text style={styles.membershipSubtitle}>{tierSummary}</Text>
          </View>
          <Text style={styles.membershipLink}>{t("Quản lý")}</Text>
        </Pressable>

        {/* Section 1: TÙY CHỌN & BẢO MẬT */}
        <Text style={styles.sectionHeadingLabel}>TÙY CHỌN & BẢO MẬT</Text>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(routes.appearance)}
          style={styles.settingCard}
        >
          <View style={styles.settingIconBadge}>
            <AppIcon name="palette-outline" color={colors.mauve} size={20} />
          </View>
          <View style={styles.settingTextCol}>
            <Text style={styles.settingTitle}>Giao diện & Màu sắc</Text>
            <Text style={styles.settingSub}>Bảng màu và chế độ sáng/tối</Text>
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => setShowLanguagePicker(true)}
          style={styles.settingCard}
        >
          <View style={styles.settingIconBadge}>
            <AppIcon name="translate" color={colors.mauve} size={20} />
          </View>
          <View style={styles.settingTextCol}>
            <Text style={styles.settingTitle}>Ngôn ngữ</Text>
            <Text style={styles.settingSub}>
              {language === "vi" ? "Tiếng Việt (Mặc định)" : "English"}
            </Text>
          </View>
        </Pressable>

        <View style={styles.settingCard}>
          <View style={styles.settingIconBadge}>
            <AppIcon name="eye-off-outline" color={colors.mauve} size={20} />
          </View>
          <View style={styles.settingTextCol}>
            <Text style={styles.settingTitle}>Ẩn số dư trên màn hình</Text>
            <Text style={styles.settingSub}>Che số tiền trên trang chủ để đảm bảo riêng tư</Text>
          </View>
          <Switch
            accessibilityLabel={t("Ẩn số dư")}
            disabled={visibilityDraft !== null}
            hitSlop={12}
            onValueChange={(next) => void changeVisibility(next)}
            thumbColor={theme === "dark" && !hideBalance ? colors.muted : colors.white}
            trackColor={{ false: colors.line, true: colors.mauve }}
            value={hideBalance}
          />
        </View>

        <View style={styles.settingCard}>
          <View style={styles.settingIconBadge}>
            <AppIcon name="shield-lock-outline" color={colors.mauve} size={20} />
          </View>
          <View style={styles.settingTextCol}>
            <Text style={styles.settingTitle}>Khóa ứng dụng (Sinh trắc học / PIN)</Text>
            <Text style={styles.settingSub}>Yêu cầu vân tay hoặc mã khi mở lại Picket</Text>
          </View>
          <Switch
            accessibilityLabel={t("Khóa ứng dụng")}
            disabled={deviceLock.busy}
            hitSlop={12}
            onValueChange={(next) =>
              void deviceLock.setEnabled(next).then((saved) => {
                if (!saved) setMessage("Chưa thể đổi khóa. Hãy thiết lập mã khóa thiết bị rồi thử lại.");
              })
            }
            thumbColor={theme === "dark" && !deviceLock.enabled ? colors.muted : colors.white}
            trackColor={{ false: colors.line, true: colors.mauve }}
            value={deviceLock.enabled}
          />
        </View>

        {/* Section 2: CÔNG CỤ CỦA BẠN */}
        <Text style={styles.sectionHeadingLabel}>CÔNG CỤ CỦA BẠN</Text>

        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => router.push(routes.bills)}
          style={styles.settingCard}
        >
          <View style={styles.settingIconBadge}>
            <AppIcon name="calendar-check-outline" color={colors.mauve} size={20} />
          </View>
          <View style={styles.settingTextCol}>
            <Text style={styles.settingTitle}>Hóa đơn cần thanh toán</Text>
            <Text style={styles.settingSub}>Quản lý hạn nộp điện, nước, internet</Text>
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => router.push(routes.subscriptions)}
          style={styles.settingCard}
        >
          <View style={styles.settingIconBadge}>
            <AppIcon name="repeat" color={colors.mauve} size={20} />
          </View>
          <View style={styles.settingTextCol}>
            <Text style={styles.settingTitle}>Chi phí định kỳ & Thuê bao</Text>
            <Text style={styles.settingSub}>Netflix, Spotify, phòng tập</Text>
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => router.push(routes.categories)}
          style={styles.settingCard}
        >
          <View style={styles.settingIconBadge}>
            <AppIcon name="shape-outline" color={colors.mauve} size={20} />
          </View>
          <View style={styles.settingTextCol}>
            <Text style={styles.settingTitle}>Quản lý danh mục & Icon 3D</Text>
            <Text style={styles.settingSub}>Tùy chỉnh nhóm chi tiêu cá nhân</Text>
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => router.push(routes.insights)}
          style={styles.settingCard}
        >
          <View style={styles.settingIconBadge}>
            <AppIcon name="chart-box-outline" color={colors.mauve} size={20} />
          </View>
          <View style={styles.settingTextCol}>
            <Text style={styles.settingTitle}>Thống kê thu chi & Phân tích</Text>
            <Text style={styles.settingSub}>Cơ cấu chi tiêu và xu hướng dòng tiền</Text>
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => router.push(routes.notifications)}
          style={styles.settingCard}
        >
          <View style={styles.settingIconBadge}>
            <AppIcon name="bell-outline" color={colors.mauve} size={20} />
          </View>
          <View style={styles.settingTextCol}>
            <Text style={styles.settingTitle}>Thông báo & Lịch nhắc</Text>
            <Text style={styles.settingSub}>Cảnh báo ngân sách và hạn thanh toán</Text>
          </View>
        </Pressable>

        {/* Section 3: SAO LƯU & DỮ LIỆU */}
        <Text style={styles.sectionHeadingLabel}>SAO LƯU & DỮ LIỆU</Text>

        <Pressable
          accessibilityRole="button"
          onPress={() => setShowBackup(!showBackup)}
          style={styles.settingCard}
        >
          <View style={styles.settingIconBadge}>
            <AppIcon name="cloud-upload-outline" color={colors.mauve} size={20} />
          </View>
          <View style={styles.settingTextCol}>
            <Text style={styles.settingTitle}>Sao lưu và xuất dữ liệu</Text>
            <Text style={styles.settingSub}>Bản sao mã hóa, JSON và CSV</Text>
          </View>
        </Pressable>

        {showBackup && (
          <Surface style={styles.backupPanel}>
            {!localMode && (
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={() => void exportData()}
                style={styles.backupRow}
              >
                <AppIcon name="file-code-outline" color={colors.mauve} size={18} />
                <Text style={styles.backupRowText}>Xuất dữ liệu JSON</Text>
              </Pressable>
            )}
            {!localMode && (
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={() => void exportExtra("csv")}
                style={styles.backupRow}
              >
                <AppIcon name="file-table-outline" color={colors.mauve} size={18} />
                <Text style={styles.backupRowText}>Xuất giao dịch CSV</Text>
              </Pressable>
            )}
            <TextInput
              accessibilityLabel={t("Mật khẩu bản sao mã hóa")}
              autoCapitalize="none"
              autoComplete="off"
              onChangeText={setBackupPassword}
              placeholder={t("Mật khẩu riêng, ít nhất 12 ký tự")}
              secureTextEntry
              style={styles.input}
              value={backupPassword}
            />
            <Pressable
              accessibilityRole="button"
              disabled={busy || backupPassword.length < 12 || (localMode && guest.loading)}
              onPress={() => void (localMode ? exportLocalBackup() : exportExtra("picket"))}
              style={styles.backupActionBtn}
            >
              <Text style={styles.backupActionText}>{t("Tạo bản sao .picket có ảnh")}</Text>
            </Pressable>
            <Text style={styles.sensitive}>
              {t("Bản export chứa dữ liệu tài chính nhạy cảm. Chỉ lưu ở nơi bạn tin cậy.")}
            </Text>
          </Surface>
        )}

        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => router.push(routes.restore)}
          style={styles.settingCard}
        >
          <View style={styles.settingIconBadge}>
            <AppIcon name="backup-restore" color={colors.mauve} size={20} />
          </View>
          <View style={styles.settingTextCol}>
            <Text style={styles.settingTitle}>Khôi phục từ bản sao</Text>
            <Text style={styles.settingSub}>Nạp lại dữ liệu từ tệp sao lưu .picket</Text>
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => router.push(routes.syncConflicts)}
          style={styles.settingCard}
        >
          <View style={styles.settingIconBadge}>
            <AppIcon name="sync" color={colors.mauve} size={20} />
          </View>
          <View style={styles.settingTextCol}>
            <Text style={styles.settingTitle}>Kiểm tra đồng bộ</Text>
            <Text style={styles.settingSub}>Xem trạng thái xung đột dữ liệu</Text>
          </View>
        </Pressable>

        {message && (
          <Text accessibilityLiveRegion="polite" style={message.startsWith("Đã") ? styles.success : styles.error}>
            {t(message, { defaultValue: message })}
          </Text>
        )}

        {/* Bottom Action Buttons */}
        {localMode ? (
          <View style={styles.bottomButtonsColumn}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.replace(routes.login)}
              style={styles.masterLoginBtn}
            >
              <AppIcon name="login" size={20} color={colors.onPrimary} />
              <Text style={styles.masterLoginText}>Đăng nhập / Tạo tài khoản</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={confirmSignOut}
              style={styles.masterSignOutFullBtn}
            >
              <Text style={styles.masterSignOutText}>{t("Thoát chế độ trên máy")}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.bottomButtonsRow}>
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={confirmSignOut}
              style={styles.masterSignOutBtn}
            >
              <Text style={styles.masterSignOutText}>{t("Đăng xuất tài khoản")}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => router.push(routes.deleteAccount)}
              style={styles.masterDeleteBtn}
            >
              <Text style={styles.masterDeleteText}>Xóa tài khoản</Text>
            </Pressable>
          </View>
        )}

        {/* Help & Policies */}
        <View style={styles.legalSection}>
          <Pressable
            accessibilityRole="link"
            onPress={() => void Linking.openURL("https://picketfinance.com/privacy.html")}
            style={styles.legalLink}
          >
            <Text style={styles.legalText}>Chính sách quyền riêng tư</Text>
          </Pressable>
          <Text style={styles.legalDot}>·</Text>
          <Pressable
            accessibilityRole="link"
            onPress={() => void Linking.openURL("https://picketfinance.com/account-deletion.html")}
            style={styles.legalLink}
          >
            <Text style={styles.legalText}>Hỗ trợ tài khoản</Text>
          </Pressable>
        </View>

        <AppUpdateSection />
        <AnalyticsConsentControl />
        <InstalledVersion />
      </ScrollView>

      {/* Edit Profile Sheet */}
      <ActionSheet
        title={t("Chỉnh sửa hồ sơ")}
        visible={editingProfile}
        onClose={() => setEditingProfile(false)}
      >
        <Text style={styles.fieldLabel}>{t("Tên hiển thị")}</Text>
        <TextInput
          accessibilityLabel={t("Tên hiển thị")}
          maxLength={120}
          onChangeText={setDisplayName}
          style={styles.input}
          value={displayName}
        />
        <ChoiceGroup label={t("Nhịp sống")} options={personas} selected={persona} select={setPersona} />
        <ChoiceGroup label={t("Mục tiêu")} options={goals} selected={goal} select={setGoal} />
        <ChoiceGroup label={t("Tiền tệ chính")} options={currencies} selected={currencyCode} select={setCurrencyCode} />
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => void save()} style={styles.saveBtn}>
          {busy ? (
            <ActivityIndicator accessibilityLabel={t("Đang lưu hồ sơ")} color={colors.onPrimary} />
          ) : (
            <Text style={styles.saveBtnText}>{t("Lưu thay đổi")}</Text>
          )}
        </Pressable>
      </ActionSheet>

      {/* Language Picker Sheet */}
      <ActionSheet
        title="Chọn ngôn ngữ"
        visible={showLanguagePicker}
        onClose={() => setShowLanguagePicker(false)}
      >
        <Pressable
          onPress={() => {
            void updateThemeSettings({ languageMode: "vi" });
            setShowLanguagePicker(false);
          }}
          style={styles.langChoice}
        >
          <Text style={[styles.langText, language === "vi" && styles.langSelected]}>
            {t("Tiếng Việt")} {language === "vi" ? "✓" : ""}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            void updateThemeSettings({ languageMode: "en" });
            setShowLanguagePicker(false);
          }}
          style={styles.langChoice}
        >
          <Text style={[styles.langText, language === "en" && styles.langSelected]}>
            English {language === "en" ? "✓" : ""}
          </Text>
        </Pressable>
      </ActionSheet>

      {/* Sign Out Confirmation Sheet */}
      <ActionSheet
        title={localMode ? t("Thoát chế độ trên thiết bị?") : t("Đăng xuất?")}
        visible={signOutPrompt !== null}
        onClose={() => {
          if (!busy) setSignOutPrompt(null);
        }}
      >
        <Text style={styles.description}>{signOutPrompt ? t(signOutPrompt.copy) : ""}</Text>
        <View style={styles.confirmActions}>
          <Pressable
            disabled={busy}
            onPress={() => setSignOutPrompt(null)}
            style={[styles.cancelBtn, styles.confirmButton]}
          >
            <Text style={styles.cancelBtnText}>{t("Hủy")}</Text>
          </Pressable>
          <Pressable
            disabled={busy}
            accessibilityState={{ busy, disabled: busy }}
            onPress={() => void performSignOut()}
            style={[styles.confirmPrimaryBtn, styles.confirmButton]}
          >
            {busy ? (
              <ActivityIndicator accessibilityLabel={t("Đang đăng xuất")} color={colors.onPrimary} />
            ) : (
              <Text style={styles.confirmPrimaryText}>{localMode ? t("Thoát chế độ trên máy") : t("Đăng xuất")}</Text>
            )}
          </Pressable>
        </View>
      </ActionSheet>
    </SafeAreaView>
  );
}

function ChoiceGroup<T extends string>({
  label,
  options,
  selected,
  select,
}: {
  label: string;
  options: readonly T[];
  selected: string;
  select(value: T): void;
}) {
  const { t } = useTranslation("profile");
  const { styles } = useMobileStyles(createStyles);
  return (
    <View style={{ marginTop: 8 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.choices}>
        {options.map((option) => (
          <ChoiceChip
            checked={selected === option}
            key={option}
            label={t(option, { defaultValue: option })}
            onPress={() => select(option)}
          />
        ))}
      </View>
    </View>
  );
}

const createStyles = (colors: MobileThemeColors) =>
  StyleSheet.create({
    safeArea: { backgroundColor: colors.cream, flex: 1 },
    content: {
      maxWidth: 720,
      width: "100%",
      alignSelf: "center",
      gap: 10,
      padding: paperSpace.screen,
      paddingBottom: 140,
    },
    topHeader: {
      marginTop: 6,
      marginBottom: 6,
    },
    screenTitle: {
      color: colors.ink,
      fontSize: 28,
      fontWeight: "800",
      letterSpacing: -0.5,
    },
    profileMasterCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 20,
      borderWidth: 1,
      overflow: "hidden",
      flexDirection: "row",
      alignItems: "center",
      padding: 14,
      gap: 14,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 3,
      elevation: 1,
    },
    avatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: colors.mauve,
      alignItems: "center",
      justifyContent: "center",
    },
    profileTextCol: {
      flex: 1,
    },
    profileName: {
      color: colors.ink,
      fontSize: 18,
      fontWeight: "700",
    },
    profileSub: {
      color: colors.muted,
      fontSize: 12,
      marginTop: 3,
    },
    membershipBanner: {
      backgroundColor: colors.pocketLilac,
      borderColor: colors.mauve,
      borderWidth: 1,
      borderRadius: 16,
      overflow: "hidden",
      paddingVertical: 14,
      paddingHorizontal: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 4,
    },
    membershipTitle: {
      color: colors.ink,
      fontSize: 14,
      fontWeight: "700",
    },
    membershipSubtitle: {
      color: colors.muted,
      fontSize: 12,
      marginTop: 2,
    },
    membershipLink: {
      color: colors.mauve,
      fontSize: 14,
      fontWeight: "700",
    },
    sectionHeadingLabel: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 0.6,
      marginTop: 14,
      marginBottom: 2,
      textTransform: "uppercase",
    },
    settingCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 16,
      overflow: "hidden",
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 14,
      gap: 12,
    },
    settingIconBadge: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.cream,
      alignItems: "center",
      justifyContent: "center",
    },
    settingTextCol: {
      flex: 1,
    },
    settingTitle: {
      color: colors.ink,
      fontSize: 15,
      fontWeight: "600",
    },
    settingSub: {
      color: colors.muted,
      fontSize: 12,
      marginTop: 2,
    },
    bottomButtonsRow: {
      flexDirection: "row",
      gap: 12,
      marginTop: 20,
    },
    bottomButtonsColumn: {
      gap: 10,
      marginTop: 20,
    },
    masterLoginBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      minHeight: 48,
      borderRadius: 24,
      overflow: "hidden",
      backgroundColor: colors.mauve,
    },
    masterLoginText: {
      color: colors.onPrimary,
      fontSize: 15,
      fontWeight: "700",
    },
    masterSignOutFullBtn: {
      minHeight: 48,
      borderRadius: 24,
      overflow: "hidden",
      borderWidth: 1.5,
      borderColor: colors.mauve,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
    },
    masterSignOutBtn: {
      flex: 1,
      minHeight: 48,
      borderRadius: 24,
      overflow: "hidden",
      borderWidth: 1.5,
      borderColor: colors.mauve,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
    },
    masterSignOutText: {
      color: colors.mauve,
      fontSize: 14,
      fontWeight: "700",
    },
    masterDeleteBtn: {
      flex: 1,
      minHeight: 48,
      borderRadius: 24,
      overflow: "hidden",
      borderWidth: 1.5,
      borderColor: colors.expense,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
    },
    masterDeleteText: {
      color: colors.expense,
      fontSize: 14,
      fontWeight: "700",
    },
    legalSection: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginTop: 10,
    },
    legalLink: {
      paddingVertical: 6,
    },
    legalText: {
      color: colors.muted,
      fontSize: 12,
    },
    legalDot: {
      color: colors.muted,
      fontSize: 12,
    },
    editPanel: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 18,
      borderWidth: 1,
      padding: 16,
      gap: 10,
      marginTop: 4,
    },
    fieldLabel: {
      color: colors.ink,
      fontSize: 13,
      fontWeight: "600",
      marginTop: 6,
      marginBottom: 4,
    },
    input: {
      backgroundColor: colors.cream,
      borderColor: colors.controlBorder,
      borderRadius: paperShape.input,
      borderWidth: 1,
      color: colors.ink,
      fontSize: 15,
      minHeight: paperControl.height,
      paddingHorizontal: 14,
    },
    choices: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    saveBtn: {
      alignItems: "center",
      backgroundColor: colors.mauve,
      borderRadius: paperShape.button,
      justifyContent: "center",
      marginTop: 14,
      minHeight: paperControl.height,
    },
    saveBtnText: {
      color: colors.onPrimary,
      fontSize: 15,
      fontWeight: "700",
    },
    backupPanel: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 16,
      borderWidth: 1,
      padding: 14,
      gap: 10,
    },
    backupRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 8,
    },
    backupRowText: {
      color: colors.ink,
      fontSize: 14,
      fontWeight: "600",
    },
    backupActionBtn: {
      alignItems: "center",
      borderColor: colors.primaryOutline,
      borderRadius: paperShape.button,
      borderWidth: 1,
      justifyContent: "center",
      minHeight: paperControl.height,
      marginTop: 6,
    },
    backupActionText: {
      color: colors.link,
      fontSize: 14,
      fontWeight: "700",
    },
    sensitive: {
      color: colors.muted,
      fontSize: 11,
      lineHeight: 16,
    },
    langChoice: {
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.line,
    },
    langText: {
      color: colors.ink,
      fontSize: 16,
    },
    langSelected: {
      color: colors.mauve,
      fontWeight: "700",
    },
    confirmActions: {
      flexDirection: "row",
      gap: 12,
      marginTop: 16,
    },
    confirmButton: {
      flex: 1,
      minHeight: 46,
      borderRadius: paperShape.button,
      alignItems: "center",
      justifyContent: "center",
    },
    cancelBtn: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    cancelBtnText: {
      color: colors.ink,
      fontSize: 15,
      fontWeight: "600",
    },
    confirmPrimaryBtn: {
      backgroundColor: colors.mauve,
    },
    confirmPrimaryText: {
      color: colors.onPrimary,
      fontSize: 15,
      fontWeight: "700",
    },
    description: {
      color: colors.muted,
      fontSize: 13,
      lineHeight: 20,
    },
    error: {
      color: colors.danger,
      fontSize: 13,
      marginTop: 4,
    },
    success: {
      color: colors.income,
      fontSize: 13,
      fontWeight: "600",
      marginTop: 4,
    },
    fallbackPage: { paddingBottom: 140 },
    fallbackBody: { flex: 1, width: "100%", paddingHorizontal: 20 },
    center: { alignItems: "center", justifyContent: "center" },
    back: { color: colors.link, fontSize: 14, fontWeight: "700", paddingVertical: 12 },
  });
