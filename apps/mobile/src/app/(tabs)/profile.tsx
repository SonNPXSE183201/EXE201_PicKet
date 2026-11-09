import { paperControl, paperShape } from "@/core/theme/paper-foundations";
import { PicketScrollView as ScrollView } from "@/core/ui/picket-scroll-view";
import { PicketText as Text } from "@/core/ui/picket-text";

import { useTranslation } from "react-i18next";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import type { CurrentProfile, Entitlements } from "@picket/domain";
import { Redirect, router } from "expo-router";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { PicketTextInput as TextInput } from "@/core/ui/picket-text-input";
import { ActivityIndicator, Image, Linking, StyleSheet, Switch, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { picketApi } from "@/core/api/client";
import { routes } from "@/core/navigation/routes";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { AppIcon } from "@/core/ui/app-icon";
import { ActionSheet } from "@/core/ui/picket-ui";
import { Chip, FigmaButton, ReceiptEdge, figmaShadow } from "@/core/ui/figma-ui";
import { FieldRow, GroupLabel, PaperGroup } from "@/features/settings/settings-figma";
import { profileHubCopy, profileThemeMeta } from "@/features/profile/profile-hub-copy";
import { useAuth } from "@/features/auth/auth-context";
import { AnalyticsConsentControl } from "@/features/settings/analytics-consent";
import { useProfile } from "@/features/profile/profile-context";
import { useDeviceLock } from "@/features/security/device-lock";
import { AppUpdateSection, InstalledVersion } from "@/features/updates/app-update-section";
import { pendingMutationCount, mutationConflictCount } from "@/core/sync/mutation-queue";
import { signOutCopy } from "@/features/profile/sign-out-copy";
import { useAppTheme } from "@/features/settings/appearance-provider";
import { featureFlags } from "@/core/config/feature-flags";

const moneyBloom = require("../../assets/paper-v3/home/money-bloom-scene-v1.webp") as number;
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
  const { colors, styles } = useMobileStyles(createStyles);
  const { language, themeMode, update: updateThemeSettings } = useAppTheme();
  const { session, localMode, leaveLocalMode, signOut } = useAuth();
  const { updatePreferences, updateProfile } = useProfile();
  const deviceLock = useDeviceLock();
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [persona, setPersona] = useState(profile.persona);
  const [goal, setGoal] = useState(profile.goal);
  const [currencyCode, setCurrencyCode] = useState(profile.currencyCode);
  const [visibilityDraft, setVisibilityDraft] = useState<boolean | null>(null);
  const hideBalance = visibilityDraft ?? profile.hideBalance;
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
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

  const hub = profileHubCopy(language);
  const initial = (profile.displayName || "B").trim().charAt(0).toUpperCase() || "B";
  const tierChip = localMode ? hub.onDevice : entitlements?.tier === "pro" ? hub.pro : entitlements?.tier === "plus" ? hub.plus : hub.free;
  const themeMeta = profileThemeMeta(language, themeMode);
  const switchProps = { thumbColor: colors.white, trackColor: { false: colors.line, true: colors.mauve } };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={hub.editProfile}
          onPress={() => setEditingProfile(true)}
          style={styles.profileHeader}
        >
          <View style={styles.avatar}><Text style={styles.avatarText}>{initial}</Text></View>
          <View style={styles.profileTextCol}>
            <Text numberOfLines={1} style={styles.profileName}>{profile.displayName || t("Bạn của Picket")}</Text>
            <Text numberOfLines={1} style={styles.profileSub}>
              {localMode || !session?.user.email ? t("Lưu riêng an toàn trên máy") : session.user.email}
            </Text>
          </View>
          <Chip label={tierChip} tone="neutral" />
        </Pressable>

        {localMode ? (
          <View style={[styles.planCard, figmaShadow("paper")]}>
            <Text style={styles.planTitle}>{hub.localTitle}</Text>
            <Text style={styles.planBody}>{hub.localBody}</Text>
            <FigmaButton label={hub.localCta} onPress={() => router.replace(routes.login)} fullWidth />
          </View>
        ) : (
          <Pressable accessibilityRole="button" onPress={() => router.push(routes.billing)} style={styles.planWrap}>
            <View style={figmaShadow("paper")}>
              <View style={styles.planPaper}>
                <Text style={styles.planOverline}>{hub.plan.toUpperCase()}</Text>
                <Text style={styles.planTitle}>{tierLabel}</Text>
                <Text style={styles.planBody}>{tierSummary}</Text>
                <View style={styles.planLink}>
                  <Text style={styles.planLinkText}>{hub.viewPlans}</Text>
                  <AppIcon name="chevron-right" size={14} color={colors.primary} />
                </View>
              </View>
              <ReceiptEdge direction="bottom" />
            </View>
            <Image accessible={false} resizeMode="contain" source={moneyBloom} style={styles.planArt} />
          </Pressable>
        )}

        <View style={styles.block}>
          <GroupLabel>{hub.manage}</GroupLabel>
          <PaperGroup>
            <FieldRow icon="wallet-outline" meta={hub.walletsMeta} title={hub.wallets} onPress={() => router.push(routes.accounts)} />
            <FieldRow icon="shopping-outline" meta={hub.categoriesMeta} title={hub.categories} onPress={() => router.push(routes.categories)} />
            <FieldRow icon="calendar-month-outline" meta={hub.recurringMeta} title={hub.recurring} onPress={() => router.push(routes.subscriptions)} />
            <FieldRow icon="flash-outline" meta={hub.billsMeta} title={hub.bills} onPress={() => router.push(routes.bills)} />
            <FieldRow icon="heart-outline" meta={hub.keepsakesMeta} title={hub.keepsakes} onPress={() => router.push(routes.keepsakes)} />
            {featureFlags.learning && <FieldRow icon="school-outline" meta={hub.learningMeta} title={hub.learning} onPress={() => router.push(routes.learning)} />}
            <FieldRow icon="chart-box-outline" meta={hub.insightsMeta} title={hub.insights} onPress={() => router.push(routes.insights)} />
            <FieldRow icon="bell-outline" meta={hub.notificationsMeta} title={hub.notifications} onPress={() => router.push(routes.notifications)} />
          </PaperGroup>
        </View>

        <View style={styles.block}>
          <GroupLabel>{hub.settings}</GroupLabel>
          <PaperGroup>
            <FieldRow icon="palette-outline" meta={themeMeta} title={hub.appearance} onPress={() => router.push(routes.appearance)} />
            <FieldRow icon="translate" meta={language === "vi" ? hub.vietnamese : "English"} title={hub.language} onPress={() => setShowLanguagePicker(true)} />
            <FieldRow
              icon="eye-off-outline"
              meta={hub.hideBalanceMeta}
              title={hub.hideBalance}
              trailing={
                <Switch
                  accessibilityLabel={t("Ẩn số dư")}
                  disabled={visibilityDraft !== null}
                  hitSlop={12}
                  onValueChange={(next) => void changeVisibility(next)}
                  value={hideBalance}
                  {...switchProps}
                />
              }
            />
            <FieldRow
              icon="lock-outline"
              meta={hub.lockMeta}
              title={hub.lock}
              trailing={
                <Switch
                  accessibilityLabel={t("Khóa ứng dụng")}
                  disabled={deviceLock.busy}
                  hitSlop={12}
                  onValueChange={(next) =>
                    void deviceLock.setEnabled(next).then((saved) => {
                      if (!saved) setMessage("Chưa thể đổi khóa. Hãy thiết lập mã khóa thiết bị rồi thử lại.");
                    })
                  }
                  value={deviceLock.enabled}
                  {...switchProps}
                />
              }
            />
          </PaperGroup>
        </View>

        <View style={styles.block}>
          <GroupLabel>{hub.data}</GroupLabel>
          <PaperGroup>
            <FieldRow icon="cloud-upload-outline" meta={hub.backupMeta} title={hub.backup} onPress={() => router.push(routes.restore)} />
            <FieldRow icon="sync" meta={hub.syncMeta} title={hub.sync} onPress={() => router.push(routes.syncConflicts)} />
          </PaperGroup>
        </View>

        {message && (
          <Text accessibilityLiveRegion="polite" style={message.startsWith("Đã") ? styles.success : styles.error}>
            {t(message, { defaultValue: message })}
          </Text>
        )}

        <View style={styles.footer}>
          <FigmaButton
            variant="text"
            size="medium"
            disabled={busy}
            label={localMode ? hub.leaveLocal : hub.signOut}
            onPress={() => void confirmSignOut()}
          />
          {!localMode && (
            <FigmaButton variant="text" size="medium" disabled={busy} label={hub.deleteAccount} onPress={() => router.push(routes.deleteAccount)} style={{ opacity: 0.8 }} />
          )}
          <View style={styles.legalSection}>
            <Pressable accessibilityRole="link" onPress={() => void Linking.openURL("https://picketfinance.com/privacy.html")} style={styles.legalLink}>
              <Text style={styles.legalText}>{hub.privacy}</Text>
            </Pressable>
            <Text style={styles.legalDot}>·</Text>
            <Pressable accessibilityRole="link" onPress={() => void Linking.openURL("https://picketfinance.com/account-deletion.html")} style={styles.legalLink}>
              <Text style={styles.legalText}>{hub.support}</Text>
            </Pressable>
          </View>
        </View>
        <AppUpdateSection />
        <AnalyticsConsentControl />
        <InstalledVersion />
      </ScrollView>

      {/* Edit Profile Sheet (G17) */}
      <ActionSheet title={hub.editTitle} visible={editingProfile} onClose={() => setEditingProfile(false)}>
        <View style={styles.editAvatarRow}>
          <View style={styles.editAvatar}><Text style={styles.editAvatarText}>{initial}</Text></View>
          <Text style={styles.editAvatarLabel}>{hub.avatar}</Text>
        </View>
        <PaperGroup>
          <FieldRow icon="account-outline" meta={hub.displayName} title={displayName} trailing="none">
            <TextInput
              accessibilityLabel={t("Tên hiển thị")}
              maxLength={120}
              onChangeText={setDisplayName}
              style={styles.nameInput}
              value={displayName}
            />
          </FieldRow>
        </PaperGroup>
        <ChoiceGroup label={hub.currency} options={currencies} selected={currencyCode} select={setCurrencyCode} />
        <ChoiceGroup label={hub.persona} options={personas} selected={persona} select={setPersona} />
        <ChoiceGroup label={hub.goal} options={goals} selected={goal} select={setGoal} />
        <FigmaButton label={hub.save} busy={busy} onPress={() => void save()} fullWidth style={{ marginTop: 12 }} />
      </ActionSheet>

      {/* Language Picker Sheet */}
      <ActionSheet title="Chọn ngôn ngữ" visible={showLanguagePicker} onClose={() => setShowLanguagePicker(false)}>
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
    <View style={styles.choiceBlock}>
      <GroupLabel muted>{label}</GroupLabel>
      <View style={styles.choices}>
        {options.map((option) => (
          <Chip
            key={option}
            label={t(option, { defaultValue: option })}
            tone={selected === option ? "neutral" : "outline"}
            onPress={() => select(option)}
          />
        ))}
      </View>
    </View>
  );
}

const createStyles = (colors: MobileThemeColors) =>
  StyleSheet.create({
    safeArea: { backgroundColor: colors.canvas, flex: 1 },
    content: {
      maxWidth: 720,
      width: "100%",
      alignSelf: "center",
      gap: 24,
      paddingHorizontal: 20,
      paddingTop: 24,
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
      width: 60,
      height: 60,
      borderRadius: 30,
      borderWidth: 3,
      borderColor: colors.paper,
      backgroundColor: colors.pocketLilac,
      alignItems: "center",
      justifyContent: "center",
    },
    profileTextCol: {
      flex: 1,
    },
    profileName: {
      color: colors.text,
      fontSize: 22,
      fontWeight: "800",
      letterSpacing: -0.3,
      lineHeight: 29,
    },
    profileSub: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: "600",
      lineHeight: 18,
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
    profileHeader: { flexDirection: "row", alignItems: "center", gap: 14 },
    avatarText: { color: colors.primary, fontSize: 22, fontWeight: "800", letterSpacing: -0.3 },
    block: { gap: 10 },
    planWrap: { minHeight: 152 },
    planPaper: { backgroundColor: colors.paper, borderTopLeftRadius: 18, borderTopRightRadius: 18, gap: 4, paddingBottom: 12, paddingLeft: 16, paddingRight: 110, paddingTop: 16 },
    planOverline: { color: colors.muted, fontSize: 11, fontWeight: "800", letterSpacing: 1.1, lineHeight: 16 },
    planTitle: { color: colors.text, fontSize: 16, fontWeight: "800", lineHeight: 26 },
    planBody: { color: colors.muted, fontSize: 12, fontWeight: "600", lineHeight: 18 },
    planLink: { alignItems: "center", flexDirection: "row", gap: 4, paddingTop: 4 },
    planLinkText: { color: colors.primary, fontSize: 12, fontWeight: "700", lineHeight: 18 },
    planArt: { height: 94, position: "absolute", right: -6, top: 24, width: 112 },
    planCard: { backgroundColor: colors.paper, borderRadius: 18, gap: 8, padding: 16 },
    footer: { alignItems: "center", gap: 6 },
    editAvatarRow: { alignItems: "center", flexDirection: "row", gap: 16, marginBottom: 16 },
    editAvatar: { alignItems: "center", backgroundColor: colors.pocketLilac, borderRadius: 30, height: 60, justifyContent: "center", width: 60 },
    editAvatarText: { color: colors.primary, fontSize: 22, fontWeight: "800" },
    editAvatarLabel: { color: colors.text, fontSize: 14, fontWeight: "700" },
    nameInput: { color: colors.text, fontSize: 14, fontWeight: "700", lineHeight: 21, minHeight: 24, padding: 0 },
    choiceBlock: { gap: 10, marginTop: 20 },
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
