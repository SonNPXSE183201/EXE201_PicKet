import { figmaRadii, figmaType } from "@picket/design-tokens";
import { FigmaButton, figmaShadow } from "@/core/ui/figma-ui";
import { IconButton } from "@/core/ui/picket-ui";
import { PaperArt } from "@/core/ui/paper-art";
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
    return <View style={styles.loading}><ActivityIndicator accessibilityLabel={t("Đang tải thiết lập")} color={colors.primary} /></View>;
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

  const skippable = step >= 2 && step <= 4;
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.top}>
        {step > 0 ? <IconButton icon="chevron-left" label={t("Quay lại")} variant="surface" disabled={busy} onPress={() => setStep((current) => current - 1)} /> : <View style={styles.topSpacer} />}
        <View accessibilityLabel={t("Tiến độ thiết lập {{step}} trên 8", { step: step + 1 })} accessibilityRole="progressbar" accessibilityValue={{ max: 8, min: 1, now: step + 1 }} style={styles.dots}>
          {Array.from({ length: 8 }, (_, index) => <View key={index} style={[styles.dot, index === step && styles.dotActive]} />)}
        </View>
        {skippable ? <Pressable accessibilityRole="button" hitSlop={8} onPress={() => setStep((current) => current + 1)}><Text style={styles.skip}>{t("Bỏ qua")}</Text></Pressable> : <View style={styles.topSpacer} />}
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {step === 0 && <Step title={t("Giữ từng chi tiêu. Gom từng kỷ niệm.")} description={t("Picket giúp bạn quét hóa đơn, hiểu dòng tiền và xây thói quen tài chính tốt hơn.")}><View style={styles.art}><PaperArt id="bloom" style={{ width: 160, height: 160 }} /></View></Step>}
        {step === 1 && <Step title={t("Mình gọi bạn là gì?")} description={t("Picket dùng tên này để chào bạn mỗi ngày.")}><View style={styles.nameCard}><Text style={styles.overline}>{t("TÊN HIỂN THỊ")}</Text><TextInput accessibilityLabel={t("Tên hiển thị")} value={displayName} onChangeText={setDisplayName} placeholder={t("Tên hiển thị")} placeholderTextColor={colors.muted} selectionColor={colors.primary} style={styles.nameInput} /><View style={styles.underline} /><Text style={styles.hint}>{t("Tên thật hay biệt danh đều được.")}</Text></View></Step>}
        {step === 2 && <Step title={t("Nhịp sống của bạn")} description={t("Chọn nhóm gần nhất với hoàn cảnh hiện tại.")}><Choices values={personas} selected={persona} onSelect={setPersona} /></Step>}
        {step === 3 && <Step title={t("Mục tiêu chính")} description={t("Picket sẽ ưu tiên thông tin liên quan tới mục tiêu này.")}><Choices values={goals} selected={goal} onSelect={setGoal} /></Step>}
        {step === 4 && <Step title={t("Đơn vị tiền tệ")} description={t("Bạn có thể thay đổi lựa chọn này sau.")}><Choices values={currencies} selected={currencyCode} onSelect={setCurrencyCode} /></Step>}
        {step === 5 && <Step title={t("Tạo ví đầu tiên")} description={t("Ví có thể là tiền mặt, tài khoản ngân hàng hoặc quỹ riêng.")}><Field value={walletName} onChangeText={setWalletName} placeholder={t("Tên ví")} /></Step>}
        {step === 6 && <Step title={t("Số dư hiện tại")} description={t("Nhập số dư để báo cáo bắt đầu đúng từ hôm nay.")}><Field money value={openingBalance} onChangeText={setOpeningBalance} keyboardType="number-pad" placeholder={t("Số dư")} /></Step>}
        {step === 7 && <Step title={t("Sẵn sàng bắt đầu")} description={t("{{name}}, bạn sẽ bắt đầu với ví “{{wallet}}”.", { name: displayName, wallet: walletName })}><Pressable accessibilityLabel={t("Đồng ý lưu và đồng bộ dữ liệu tài chính")} accessibilityRole="checkbox" accessibilityState={{ checked: privacyAccepted }} onPress={() => setPrivacyAccepted((value) => !value)} style={styles.consent}><View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.checkbox, privacyAccepted && styles.checked]} /><Text style={styles.consentText}>{t("Tôi hiểu dữ liệu tài chính sẽ được lưu và đồng bộ an toàn theo cài đặt của mình.")}</Text></Pressable></Step>}
        {message && <Text accessibilityLiveRegion="polite" role="alert" style={styles.error}>{message}</Text>}
      </ScrollView>
      <View style={styles.actions}>
        <FigmaButton label={step === 7 ? t("Bắt đầu cùng Picket") : t("Tiếp tục")} onPress={() => void next()} busy={busy} fullWidth />
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
  safeArea: { backgroundColor: colors.canvas, flex: 1 },
  loading: { alignItems: "center", backgroundColor: colors.canvas, flex: 1, justifyContent: "center" },
  top: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 24 },
  topSpacer: { width: 44 },
  dots: { alignItems: "center", flexDirection: "row", gap: 6 },
  dot: { backgroundColor: colors.border, borderRadius: 3, height: 6, width: 6 },
  dotActive: { backgroundColor: colors.primary, width: 22 },
  skip: { ...figmaType.captionStrong, color: colors.muted, textAlign: "right", width: 44 },
  content: { maxWidth: 720, width: "100%", alignSelf: "center", flexGrow: 1, paddingHorizontal: 20, paddingTop: 20 },
  title: { ...figmaType.display, color: colors.text },
  description: { ...figmaType.bodySmall, color: colors.muted, marginTop: 4 },
  stepBody: { marginTop: 20 },
  art: { alignItems: "center", paddingTop: 24 },
  nameCard: { backgroundColor: colors.paper, borderRadius: figmaRadii.receipt, gap: 8, paddingBottom: 12, paddingHorizontal: 16, paddingTop: 16, ...figmaShadow("paper") },
  overline: { ...figmaType.overline, color: colors.muted },
  nameInput: { ...figmaType.amountHero, color: colors.text, padding: 0 },
  underline: { backgroundColor: colors.border, height: 1 },
  hint: { ...figmaType.bodySmall, color: colors.muted },
  input: { backgroundColor: colors.paper, borderColor: colors.border, borderRadius: 14, borderWidth: 1, color: colors.text, fontSize: 14, fontWeight: "700", lineHeight: 21, minHeight: 48, paddingHorizontal: 16 },
  choices: { gap: 10 },
  choice: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 16, borderWidth: 1, justifyContent: "center", minHeight: 56, paddingHorizontal: 16 },
  choiceSelected: { backgroundColor: colors.selectedSurface, borderColor: colors.primary, borderWidth: 1.5 },
  choiceText: { ...figmaType.bodyStrong, color: colors.text },
  choiceTextSelected: { color: colors.primary, fontWeight: "800" },
  consent: { alignItems: "flex-start", flexDirection: "row", gap: 12 },
  checkbox: { borderColor: colors.primary, borderRadius: 6, borderWidth: 2, height: 22, width: 22 },
  checked: { backgroundColor: colors.primary },
  consentText: { ...figmaType.bodySmall, color: colors.text, flex: 1 },
  error: { ...figmaType.bodySmall, color: colors.expense, marginTop: 16 },
  actions: { paddingBottom: 24, paddingHorizontal: 20, paddingTop: 12 },
});
