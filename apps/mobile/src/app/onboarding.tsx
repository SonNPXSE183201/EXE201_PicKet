import { colors, radii } from "@picket/design-tokens";
import { Redirect, router } from "expo-router";
import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { PicketTextInput as TextInput } from "@/core/ui/picket-text-input";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { routes } from "@/core/navigation/routes";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { useAuth } from "@/features/auth/auth-context";
import { useProfile } from "@/features/profile/profile-context";

const goals = ["Hiểu chi tiêu", "Tiết kiệm", "Quản lý hóa đơn"] as const;
const personas = ["Đi làm", "Sinh viên", "Tự do", "Gia đình"] as const;
const currencies = ["VND", "USD"] as const;

export default function OnboardingScreen() {
  const { loading: authLoading, session } = useAuth();
  const { completeOnboarding, loading: profileLoading, profile } = useProfile();
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [persona, setPersona] = useState<(typeof personas)[number]>("Đi làm");
  const [goal, setGoal] = useState<(typeof goals)[number]>("Hiểu chi tiêu");
  const [currencyCode, setCurrencyCode] = useState<(typeof currencies)[number]>("VND");
  const [walletName, setWalletName] = useState("Tiền mặt");
  const [openingBalance, setOpeningBalance] = useState("0");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (authLoading || (session && profileLoading)) {
    return <View style={styles.loading}><ActivityIndicator accessibilityLabel="Đang tải thiết lập" color={colors.mauve} /></View>;
  }
  if (!session) return <Redirect href={routes.login} />;
  if (profile?.onboardingCompleted) return <Redirect href={routes.home} />;

  async function next() {
    setMessage(null);
    if (step === 1 && !displayName.trim()) return setMessage("Hãy nhập tên hiển thị.");
    if (step === 5 && !walletName.trim()) return setMessage("Hãy nhập tên ví.");
    if (step === 6 && !/^\d+$/.test(openingBalance)) return setMessage("Số dư chưa hợp lệ.");
    if (step === 7 && !privacyAccepted) return setMessage("Bạn cần xác nhận chính sách dữ liệu.");
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
      router.replace(routes.home);
    } catch {
      setMessage("Chưa lưu được lựa chọn. Hãy kiểm tra kết nối và thử lại.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View accessibilityLabel={`Tiến độ thiết lập ${step + 1} trên 8`} accessibilityRole="progressbar" accessibilityValue={{ max: 8, min: 1, now: step + 1 }} style={styles.progressTrack}><View style={[styles.progress, { width: `${((step + 1) / 8) * 100}%` }]} /></View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.counter}>Thiết lập {step + 1}/8</Text>
        {step === 0 && <Step title="Giữ từng chi tiêu. Gom từng kỷ niệm." description="Picket giúp bạn quét hóa đơn, hiểu dòng tiền và xây thói quen tài chính tốt hơn." />}
        {step === 1 && <Step title="Mình gọi bạn là gì?" description="Tên này chỉ dùng để cá nhân hóa trải nghiệm."><Field value={displayName} onChangeText={setDisplayName} placeholder="Tên hiển thị" /></Step>}
        {step === 2 && <Step title="Nhịp sống của bạn" description="Chọn nhóm gần nhất với hoàn cảnh hiện tại."><Choices values={personas} selected={persona} onSelect={setPersona} /></Step>}
        {step === 3 && <Step title="Mục tiêu chính" description="Picket sẽ ưu tiên thông tin liên quan tới mục tiêu này."><Choices values={goals} selected={goal} onSelect={setGoal} /></Step>}
        {step === 4 && <Step title="Đơn vị tiền tệ" description="Bạn có thể thay đổi lựa chọn này sau."><Choices values={currencies} selected={currencyCode} onSelect={setCurrencyCode} /></Step>}
        {step === 5 && <Step title="Tạo ví đầu tiên" description="Ví có thể là tiền mặt, tài khoản ngân hàng hoặc quỹ riêng."><Field value={walletName} onChangeText={setWalletName} placeholder="Tên ví" /></Step>}
        {step === 6 && <Step title="Số dư hiện tại" description="Nhập số dư để báo cáo bắt đầu đúng từ hôm nay."><Field money value={openingBalance} onChangeText={setOpeningBalance} keyboardType="number-pad" placeholder="Số dư" /></Step>}
        {step === 7 && <Step title="Sẵn sàng bắt đầu" description={`${displayName}, bạn sẽ bắt đầu với ví “${walletName}”.`}><Pressable accessibilityLabel="Đồng ý lưu và đồng bộ dữ liệu tài chính" accessibilityRole="checkbox" accessibilityState={{ checked: privacyAccepted }} onPress={() => setPrivacyAccepted((value) => !value)} style={styles.consent}><View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.checkbox, privacyAccepted && styles.checked]} /><Text style={styles.consentText}>Tôi hiểu dữ liệu tài chính sẽ được lưu và đồng bộ an toàn theo cài đặt của mình.</Text></Pressable></Step>}
        {message && <Text accessibilityLiveRegion="polite" role="alert" style={styles.error}>{message}</Text>}
      </ScrollView>
      <View style={styles.actions}>
        {step > 0 && <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => setStep((current) => current - 1)} style={styles.secondary}><Text style={styles.secondaryText}>Quay lại</Text></Pressable>}
        <Pressable accessibilityRole="button" accessibilityState={{ busy, disabled: busy }} disabled={busy} onPress={() => void next()} style={styles.primary}>{busy ? <ActivityIndicator accessibilityLabel="Đang hoàn tất thiết lập" color={colors.white} /> : <Text style={styles.primaryText}>{step === 7 ? "Bắt đầu cùng Picket" : "Tiếp tục"}</Text>}</Pressable>
      </View>
    </SafeAreaView>
  );
}

function Step({ title, description, children }: { title: string; description: string; children?: React.ReactNode }) {
  return <View><Text accessibilityRole="header" style={styles.title}>{title}</Text><Text style={styles.description}>{description}</Text>{children && <View style={styles.stepBody}>{children}</View>}</View>;
}

function Field(props: React.ComponentProps<typeof TextInput>) {
  const { accessibilityLabel, placeholder, ...inputProps } = props;
  return <TextInput accessibilityLabel={accessibilityLabel ?? placeholder} placeholder={placeholder} placeholderTextColor={colors.muted} style={styles.input} {...inputProps} />;
}

function Choices<T extends string>({ values, selected, onSelect }: { values: readonly T[]; selected: T; onSelect: Dispatch<SetStateAction<T>> }) {
  return <View accessibilityRole="radiogroup" style={styles.choices}>{values.map((value) => <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected === value }} key={value} onPress={() => onSelect(value)} style={[styles.choice, selected === value && styles.choiceSelected]}><Text style={[styles.choiceText, selected === value && styles.choiceTextSelected]}>{value}</Text></Pressable>)}</View>;
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.cream, flex: 1 },
  loading: { alignItems: "center", backgroundColor: colors.cream, flex: 1, justifyContent: "center" },
  progressTrack: { backgroundColor: colors.peach, height: 5 },
  progress: { backgroundColor: colors.mauve, height: 5 },
  content: { flexGrow: 1, justifyContent: "center", padding: 28 },
  counter: { color: colors.mauve, fontSize: 13, fontWeight: "700", marginBottom: 24 },
  title: { color: colors.ink, fontSize: 32, fontWeight: "700", lineHeight: 38 },
  description: { color: colors.muted, fontSize: 16, lineHeight: 24, marginTop: 12 },
  stepBody: { marginTop: 28 },
  input: { backgroundColor: colors.white, borderColor: colors.peach, borderRadius: radii.small, borderWidth: 1, color: colors.ink, fontSize: 16, minHeight: 54, paddingHorizontal: 16 },
  choices: { gap: 12 },
  choice: { backgroundColor: colors.white, borderColor: colors.peach, borderRadius: radii.small, borderWidth: 1, minHeight: 52, padding: 16 },
  choiceSelected: { backgroundColor: colors.mauve, borderColor: colors.mauve },
  choiceText: { color: colors.ink, fontSize: 16, fontWeight: "700" },
  choiceTextSelected: { color: colors.white },
  consent: { alignItems: "flex-start", flexDirection: "row", gap: 12 },
  checkbox: { borderColor: colors.mauve, borderRadius: 4, borderWidth: 2, height: 22, width: 22 },
  checked: { backgroundColor: colors.mauve },
  consentText: { color: colors.ink, flex: 1, fontSize: 15, lineHeight: 22 },
  error: { color: colors.expense, fontSize: 14, marginTop: 20 },
  actions: { flexDirection: "row", gap: 12, padding: 20 },
  primary: { alignItems: "center", backgroundColor: colors.mauve, borderRadius: radii.small, flex: 1, justifyContent: "center", minHeight: 52, paddingHorizontal: 16 },
  primaryText: { color: colors.white, fontSize: 15, fontWeight: "700" },
  secondary: { alignItems: "center", borderColor: colors.mauve, borderRadius: radii.small, borderWidth: 1, justifyContent: "center", minHeight: 52, paddingHorizontal: 16 },
  secondaryText: { color: colors.mauve, fontSize: 15, fontWeight: "700" },
});
