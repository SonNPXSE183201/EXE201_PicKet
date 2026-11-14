import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";
import * as SecureStore from "expo-secure-store";
import { AppState, Linking, Modal, ScrollView, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/features/auth/auth-context";
import { configureTelemetry, sendTelemetry } from "@/core/analytics/telemetry";
import { FigmaButton } from "@/core/ui/figma-ui";
import { PicketText } from "@/core/ui/picket-text";
import { useAppTheme } from "./appearance-provider";
import { consentNeedsPrompt, parseConsent, type ConsentDecision } from "./analytics-consent-policy";

const PRIVACY_URL = "https://picketfinance.com/privacy.html";

const ConsentContext = createContext<{
  enabled: boolean;
  decided: boolean;
  busy: boolean;
  choose(value: boolean): Promise<void>;
  openChoice(): void;
}>({ enabled: false, decided: false, busy: false, choose: async () => {}, openChoice: () => {} });

/** Usage-statistics consent for signed-in accounts (guests never send telemetry).
    The first time an account opens the app it must make a choice; both answers keep the app
    fully usable (consent must be voluntary under Vietnamese law and Google Play policy). */
export function AnalyticsConsentProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const owner = session?.user.id;
  const token = session?.access_token;
  const key = owner ? `picket_analytics_consent_v1_${owner}` : null;
  // The stored answer is tied to the account it was read for; a new account reads again.
  const [loaded, setLoaded] = useState<{ key: string | null; decision: ConsentDecision }>({ key: null, decision: null });
  const [saving, setSaving] = useState(false);
  const [reopened, setReopened] = useState(false);
  const decision = loaded.key === key ? loaded.decision : null;
  const busy = saving || (key !== null && loaded.key !== key);
  const enabled = decision === "yes";
  useEffect(() => {
    let active = true;
    configureTelemetry(null);
    void (key ? SecureStore.getItemAsync(key) : Promise.resolve(null))
      .then((v) => {
        if (active) setLoaded({ key, decision: parseConsent(v) });
      })
      .catch(() => {
        if (active) setLoaded({ key, decision: null });
      });
    return () => {
      active = false;
      configureTelemetry(null);
    };
  }, [key]);
  useEffect(() => {
    configureTelemetry(enabled && token ? token : null);
    if (!enabled || !token || !key) return;
    let active = true;
    void SecureStore.getItemAsync(`${key}_observed`)
      .then(async (previous) => {
        if (!active) return;
        if (!previous) {
          await SecureStore.setItemAsync(`${key}_observed`, "yes");
          if (active) void sendTelemetry("first_open");
        }
        if (active) void sendTelemetry("app_open");
      })
      .catch(() => {});
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void sendTelemetry("app_open");
    });
    return () => {
      active = false;
      configureTelemetry(null);
      subscription.remove();
    };
  }, [enabled, token, key]);
  async function choose(value: boolean) {
    if (!key) return;
    setSaving(true);
    try {
      await SecureStore.setItemAsync(key, value ? "yes" : "no");
      setLoaded({ key, decision: value ? "yes" : "no" });
      if (!value) configureTelemetry(null);
      setReopened(false);
    } finally {
      setSaving(false);
    }
  }
  const mandatory = consentNeedsPrompt(Boolean(key), busy, decision);
  return (
    <ConsentContext.Provider value={{ enabled, decided: decision !== null, busy, choose, openChoice: () => setReopened(true) }}>
      {children}
      <AnalyticsConsentPrompt
        visible={mandatory || (reopened && Boolean(key))}
        mandatory={mandatory}
        enabled={enabled}
        busy={busy}
        onChoose={choose}
        onClose={() => setReopened(false)}
      />
    </ConsentContext.Provider>
  );
}

export function useAnalyticsConsent() {
  return useContext(ConsentContext);
}

function AnalyticsConsentPrompt({ visible, mandatory, enabled, busy, onChoose, onClose }: {
  visible: boolean; mandatory: boolean; enabled: boolean; busy: boolean;
  onChoose(value: boolean): Promise<void>; onClose(): void;
}) {
  const { colors } = useAppTheme();
  const { i18n } = useTranslation();
  const vi = i18n.language.startsWith("vi");
  const [error, setError] = useState(false);
  const pick = (value: boolean) => {
    setError(false);
    void onChoose(value).catch(() => setError(true));
  };
  const points = vi
    ? [
        "Chỉ gửi: lượt mở ứng dụng, thao tác hoàn tất (ví dụ lưu giao dịch, quét hoá đơn), phiên bản ứng dụng và loại thiết bị.",
        "Không gửi: số tiền, nội dung hoá đơn, tên giao dịch, email, số điện thoại hay vị trí.",
        "Mục đích: thống kê để sửa lỗi và cải thiện Picket. Không bán, không dùng cho quảng cáo.",
        "Không đồng ý vẫn dùng đầy đủ mọi tính năng. Bạn đổi lựa chọn bất cứ lúc nào tại Hồ sơ › Cài đặt › Quyền riêng tư & thống kê.",
      ]
    : [
        "Only sends: app opens, completed actions (such as saving a transaction or scanning a receipt), app version and device type.",
        "Never sends: amounts, receipt contents, transaction names, email, phone number or location.",
        "Purpose: statistics to fix bugs and improve Picket. Never sold or used for advertising.",
        "Declining keeps every feature available. Change your choice anytime in Profile › Settings › Privacy & statistics.",
      ];
  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={() => { if (!mandatory) onClose(); }}>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(20,12,24,0.45)" }}>
        <View accessibilityViewIsModal style={{ maxHeight: "92%", backgroundColor: colors.canvas, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, gap: 16 }}>
          <ScrollView contentContainerStyle={{ gap: 12 }}>
            <PicketText accessibilityRole="header" style={{ fontSize: 22, fontWeight: "800", color: colors.text }}>
              {vi ? "Chia sẻ thống kê sử dụng?" : "Share usage statistics?"}
            </PicketText>
            <PicketText style={{ color: colors.muted }}>
              {vi
                ? "Picket xin phép bạn thu thập một số thống kê ẩn danh về cách dùng ứng dụng. Bạn cần chọn một trong hai để tiếp tục."
                : "Picket asks to collect a few anonymous statistics about how the app is used. Please choose one to continue."}
            </PicketText>
            {points.map((point) => (
              <View key={point} style={{ flexDirection: "row", gap: 10 }}>
                <PicketText style={{ color: colors.primary, fontWeight: "800" }}>•</PicketText>
                <PicketText style={{ flex: 1, color: colors.text }}>{point}</PicketText>
              </View>
            ))}
            <PicketText accessibilityRole="link" onPress={() => void Linking.openURL(PRIVACY_URL)} style={{ color: colors.primary, fontWeight: "700", textDecorationLine: "underline" }}>
              {vi ? "Đọc Chính sách quyền riêng tư" : "Read the Privacy Policy"}
            </PicketText>
            {!mandatory && (
              <PicketText style={{ color: colors.muted }}>
                {vi ? `Hiện tại: ${enabled ? "đang chia sẻ" : "không chia sẻ"}.` : `Current choice: ${enabled ? "sharing" : "not sharing"}.`}
              </PicketText>
            )}
            {error && (
              <PicketText accessibilityRole="alert" style={{ color: colors.danger }}>
                {vi ? "Chưa lưu được lựa chọn. Hãy thử lại." : "Could not save your choice. Please retry."}
              </PicketText>
            )}
          </ScrollView>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <FigmaButton style={{ flex: 1 }} variant="outline" disabled={busy} label={vi ? "Không đồng ý" : "Decline"} onPress={() => pick(false)} />
            <FigmaButton style={{ flex: 1 }} disabled={busy} label={vi ? "Đồng ý" : "Agree"} onPress={() => pick(true)} />
          </View>
          {!mandatory && <FigmaButton variant="text" size="medium" disabled={busy} label={vi ? "Đóng" : "Close"} onPress={onClose} />}
        </View>
      </View>
    </Modal>
  );
}
