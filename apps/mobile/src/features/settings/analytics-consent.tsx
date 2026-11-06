import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";
import * as SecureStore from "expo-secure-store";
import { AppState, Switch, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/features/auth/auth-context";
import { configureTelemetry, sendTelemetry } from "@/core/analytics/telemetry";
import { PicketText } from "@/core/ui/picket-text";
import { Surface } from "@/core/ui/picket-ui";
import { useAppTheme } from "./appearance-provider";

const ConsentContext = createContext<{
  enabled: boolean;
  busy: boolean;
  toggle(value: boolean): Promise<void>;
}>({ enabled: false, busy: false, toggle: async () => {} });
export function AnalyticsConsentProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const owner = session?.user.id;
  const token = session?.access_token;
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(true);
  const key = owner ? `picket_analytics_consent_v1_${owner}` : null;
  useEffect(() => {
    let active = true;
    configureTelemetry(null);
    void (key ? SecureStore.getItemAsync(key) : Promise.resolve(null))
      .then((v) => {
        if (active) setEnabled(v === "yes");
      })
      .catch(() => {})
      .finally(() => {
        if (active) setBusy(false);
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
        if(active)void sendTelemetry("app_open");
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
  async function toggle(value: boolean) {
    if (!key || busy) return;
    setBusy(true);
    try {
      await SecureStore.setItemAsync(key, value ? "yes" : "no");
      setEnabled(value);
      if (!value) configureTelemetry(null);
    } finally {
      setBusy(false);
    }
  }
  return (
    <ConsentContext.Provider value={{ enabled, busy, toggle }}>
      {children}
    </ConsentContext.Provider>
  );
}
export function AnalyticsConsentControl() {
  const { session } = useAuth();
  const { colors } = useAppTheme();
  const { i18n } = useTranslation();
  const vi = i18n.language.startsWith("vi");
  const { enabled, busy, toggle } = useContext(ConsentContext);
  const [error, setError] = useState(false);
  if (!session) return null;
  return (
    <Surface>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <View style={{ flex: 1 }}>
          <PicketText style={{ fontWeight: "700" }}>
            {vi ? "Chia sẻ thống kê sử dụng" : "Share usage statistics"}
          </PicketText>
          <PicketText
            style={{ fontSize: 12, color: colors.muted, marginTop: 5 }}
          >
            {vi
              ? "Tùy chọn. Chỉ gửi sự kiện mở app và thao tác thành công; không gửi số tiền, nội dung hóa đơn hay email. Có thể tắt bất cứ lúc nào."
              : "Optional. Shares app opens and successful actions, without amounts, receipt contents or email. You can turn this off anytime."}
          </PicketText>
        </View>
        <Switch
          hitSlop={8}
          accessibilityLabel={
            vi ? "Chia sẻ thống kê sử dụng" : "Share usage statistics"
          }
          value={enabled}
          disabled={busy}
          onValueChange={(v) => {
            setError(false);
            void toggle(v).catch(() => setError(true));
          }}
        />
      </View>
      {error && (
        <PicketText accessibilityRole="alert" style={{ color: colors.danger }}>
          {vi
            ? "Chưa lưu được lựa chọn. Hãy thử lại."
            : "Could not save your choice. Please retry."}
        </PicketText>
      )}
    </Surface>
  );
}
