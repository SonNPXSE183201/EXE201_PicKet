import { paperControl , paperShape, paperSpace } from "@/core/theme/paper-foundations";
import { PicketScrollView as ScrollView } from "@/core/ui/picket-scroll-view";
import { PicketText as Text } from "@/core/ui/picket-text";

import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { Redirect, router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Dispatch, SetStateAction } from "react";
import { PicketTextInput as TextInput } from "@/core/ui/picket-text-input";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { routes } from "@/core/navigation/routes";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { useAuth } from "@/features/auth/auth-context";
import { useProfile } from "@/features/profile/profile-context";
import { useAccounts } from "@/features/accounts/accounts-context";

const goals = ["Hiểu chi tiêu", "Tiết kiệm", "Quản lý hóa đơn"] as const;
const personas = ["Đi làm", "Sinh viên", "Tự do", "Gia đình"] as const;
const currencies = ["VND", "USD"] as const;

export default function OnboardingScreen() {
  const { t } = useTranslation("common");
  const { colors, styles } = useMobileStyles(createStyles);
  const { loading: authLoading, session } = useAuth();
  const { completeOnboarding, loading: profileLoading, profile } = useProfile();
  const { refresh: refreshAccounts } = useAccounts();
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [persona, setPersona] = useState<(typeof personas)[number]>("Đi làm");
  const [goal, setGoal] = useState<(typeof goals)[number]>("Hiểu chi tiêu");
  const [currencyCode, setCurrencyCode] = useState<(typeof currencies)[number]>("VND");
  const [walletName, setWalletName] = useState(t("Tiền mặt"));
  const [openingBalance, setOpeningBalance] = useState("0");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (authLoading || (session && profileLoading)) {
    return <View style={styles.loading}><ActivityIndicator accessibilityLabel={t("Đang tải thiết lập")} color={colors.link} /></View>;
  }
  if (!session) return <Redirect href={routes.login} />;
  if (profile?.onboardingCompleted) return <Redirect href={routes.home} />;

  async function next() {
    setMessage(null);
    if (step === 1 && !displayName.trim()) return setMessage(t("Hãy nhập tên hiển thị."));
    if (step === 5 && !walletName.trim()) return setMessage(t("Hãy nhập tên ví."));
    if (step === 6 && !/^\d+$/.test(openingBalance)) return setMessage(t("Số dư chưa hợp lệ."));
    if (step === 7 && !privacyAccepted) return setMessage(t("Bạn cần xác nhận chính sách dữ liệu."));
    if (step < 7) return setStep((current) => current + 1);

    setBusy(true);
    try {
      await completeOnboarding({
        displayName: displayName.trim(),
        persona,
        goal,
        currencyCode,
        walletName: walletName.trim(),
        openingBalance: Number.parseInt(openingBalance, 10),
      });
      await refreshAccounts();
      router.replace(routes.home);
    } catch {
      setMessage(t("Chưa lưu được lựa chọn. Hãy kiểm tra kết nối và thử lại."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View accessibilityLabel={t("Tiến độ thiết lập {{step}} trên 8", { step: step + 1 })} accessibilityRole="progressbar" accessibilityValue={{ max: 8, min: 1, now: step + 1 }} style={styles.progressTrack}><View style={[styles.progress, { width: `${((step + 1) / 8) * 100}%` }]} /></View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.counter}>{t("Thiết lập {{step}}/8", { step: step + 1 })}</Text>
        {step === 0 && <Step title={t("Giữ từng chi tiêu. Gom từng kỷ niệm.")} description={t("Picket giúp bạn quét hóa đơn, hiểu dòng tiền và xây thói quen tài chính tốt hơn.")} />}
        {step === 1 && <Step title={t("Mình gọi bạn là gì?")} description={t("Tên này chỉ dùng để cá nhân hóa trải nghiệm.")}><Field value={displayName} onChangeText={setDisplayName} placeholder={t("Tên hiển thị")} /></Step>}
        {step === 2 && <Step title={t("Nhịp sống của bạn")} description={t("Chọn nhóm gần nhất với hoàn cảnh hiện tại.")}><Choices values={personas} selected={persona} onSelect={setPersona} /></Step>}
        {step === 3 && <Step title={t("Mục tiêu chính")} description={t("Picket sẽ ưu tiên thông tin liên quan tới mục tiêu này.")}><Choices values={goals} selected={goal} onSelect={setGoal} /></Step>}
        {step === 4 && <Step title={t("Đơn vị tiền tệ")} description={t("Bạn có thể thay đổi lựa chọn này sau.")}><Choices values={currencies} selected={currencyCode} onSelect={setCurrencyCode} /></Step>}
        {step === 5 && <Step title={t("Tạo ví đầu tiên")} description={t("Ví có thể là tiền mặt, tài khoản ngân hàng hoặc quỹ riêng.")}><Field value={walletName} onChangeText={setWalletName} placeholder={t("Tên ví")} /></Step>}
        {step === 6 && <Step title={t("Số dư hiện tại")} description={t("Nhập số dư để báo cáo bắt đầu đúng từ hôm nay.")}><Field money value={openingBalance} onChangeText={setOpeningBalance} keyboardType="number-pad" placeholder={t("Số dư")} /></Step>}
        {step === 7 && <Step title={t("Sẵn sàng bắt đầu")} description={t("{{name}}, bạn sẽ bắt đầu với ví “{{wallet}}”.", { name: displayName, wallet: walletName })}><Pressable accessibilityLabel={t("Đồng ý lưu và đồng bộ dữ liệu tài chính")} accessibilityRole="checkbox" accessibilityState={{ checked: privacyAccepted }} onPress={() => setPrivacyAccepted((value) => !value)} style={styles.consent}><View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.checkbox, privacyAccepted && styles.checked]} /><Text style={styles.consentText}>{t("Tôi hiểu dữ liệu tài chính sẽ được lưu và đồng bộ an toàn theo cài đặt của mình.")}</Text></Pressable></Step>}
        {message && <Text accessibilityLiveRegion="polite" role="alert" style={styles.error}>{message}</Text>}
      </ScrollView>
      <View style={styles.actions}>
        {step > 0 && <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => setStep((current) => current - 1)} style={styles.secondary}><Text style={styles.secondaryText}>{t("Quay lại")}</Text></Pressable>}
        <Pressable accessibilityRole="button" accessibilityState={{ busy, disabled: busy }} disabled={busy} onPress={() => void next()} style={styles.primary}>{busy ? <ActivityIndicator accessibilityLabel={t("Đang hoàn tất thiết lập")} color={colors.onPrimary} /> : <Text style={styles.primaryText}>{step === 7 ? t("Bắt đầu cùng Picket") : t("Tiếp tục")}</Text>}</Pressable>
      </View>
    </SafeAreaView>
  );
}

function Step({ title, description, children }: { title: string; description: string; children?: React.ReactNode }) {
  const { styles } = useMobileStyles(createStyles);
  return <View><Text accessibilityRole="header" style={styles.title}>{title}</Text><Text style={styles.description}>{description}</Text>{children && <View style={styles.stepBody}>{children}</View>}</View>;
}

function Field(props: React.ComponentProps<typeof TextInput>) {
  const { colors, styles } = useMobileStyles(createStyles);
  const { accessibilityLabel, placeholder, ...inputProps } = props;
  return <TextInput accessibilityLabel={accessibilityLabel ?? placeholder} placeholder={placeholder} placeholderTextColor={colors.muted} style={styles.input} {...inputProps} />;
}

function Choices<T extends string>({ values, selected, onSelect }: { values: readonly T[]; selected: T; onSelect: Dispatch<SetStateAction<T>> }) {
  const { t } = useTranslation("common");
  const { styles } = useMobileStyles(createStyles);
  return <View accessibilityRole="radiogroup" style={styles.choices}>{values.map((value) => <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected === value }} key={value} onPress={() => onSelect(value)} style={[styles.choice, selected === value && styles.choiceSelected]}><Text style={[styles.choiceText, selected === value && styles.choiceTextSelected]}>{value === "VND" || value === "USD" ? value : t(value)}</Text></Pressable>)}</View>;
}

const createStyles = (colors: MobileThemeColors) => StyleSheet.create({
  safeArea: { backgroundColor: colors.cream, flex: 1 },
  loading: { alignItems: "center", backgroundColor: colors.cream, flex: 1, justifyContent: "center" },
  progressTrack: { backgroundColor: colors.peach, height: 5 },
  progress: { backgroundColor: colors.mauve, height: 5 },
  content: { maxWidth: 720, width: "100%", alignSelf: "center", flexGrow: 1, justifyContent: "center", padding: paperSpace.screen },
  counter: { color: colors.link, fontSize: 13, fontWeight: "700", marginBottom: 24 },
  title: { color: colors.ink, fontSize: 26, fontWeight: "700", lineHeight: 38 },
  description: { color: colors.muted, fontSize: 16, lineHeight: 24, marginTop: 12 },
  stepBody: { marginTop: 28 },
  input: { backgroundColor: colors.white, borderColor: colors.controlBorder, borderRadius: paperShape.input, borderWidth: 1, color: colors.ink, fontSize: 16, minHeight: paperControl.height, paddingHorizontal: 16 },
  choices: { gap: 12 },
  choice: { backgroundColor: colors.white, borderColor: colors.peach, borderRadius: paperShape.chip, borderWidth: 1, minHeight: paperControl.height, padding: 16 },
  choiceSelected: { backgroundColor: colors.mauve, borderColor: colors.primaryOutline },
  choiceText: { color: colors.ink, fontSize: 16, fontWeight: "700" },
  choiceTextSelected: { color: colors.onPrimary },
  consent: { alignItems: "flex-start", flexDirection: "row", gap: 12 },
  checkbox: { borderColor: colors.primaryOutline, borderRadius: 4, borderWidth: 2, height: 22, width: 22 },
  checked: { backgroundColor: colors.mauve },
  consentText: { color: colors.ink, flex: 1, fontSize: 15, lineHeight: 22 },
  error: { color: colors.danger, fontSize: 14, marginTop: 20 },
  actions: { flexDirection: "row", gap: 12, padding: 20 },
  primary: { alignItems: "center", backgroundColor: colors.mauve, borderRadius: paperShape.button, flex: 1, justifyContent: "center", minHeight: paperControl.height, paddingHorizontal: 16 },
  primaryText: { color: colors.onPrimary, fontSize: 15, fontWeight: "700" },
  secondary: { alignItems: "center", borderColor: colors.primaryOutline, borderRadius: paperShape.button, borderWidth: 1, justifyContent: "center", minHeight: paperControl.height, paddingHorizontal: 16 },
  secondaryText: { color: colors.link, fontSize: 15, fontWeight: "700" },
});
