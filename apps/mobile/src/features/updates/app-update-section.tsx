import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, AppState, StyleSheet, Text, View } from "react-native";
import { colors } from "@picket/design-tokens";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { AppIcon } from "@/core/ui/app-icon";
import { SectionTitle, Surface } from "@/core/ui/picket-ui";
import { androidAppUpdates, getInstalledAppInfo } from "./android-app-updates";
import { createAppUpdateController, type UpdateSnapshot } from "./app-update-controller";
import { installedVersionLabel } from "./app-update-policy";

export function InstalledVersion() {
  const [installed] = useState(getInstalledAppInfo);
  return <Text selectable style={styles.footer}>{installedVersionLabel(installed)}</Text>;
}
export function AppUpdateSection() {
  const [state, setState] = useState<UpdateSnapshot>({ phase: "idle", progress: 0 });
  const [controller] = useState(() => createAppUpdateController(androidAppUpdates, setState));
  useEffect(() => {
    controller.activate();
    const listener = AppState.addEventListener("change", next => { if (next === "active") controller.refreshPermission(); });
    return () => { listener.remove(); controller.dispose(); };
  }, [controller]);
  const busy = state.phase === "checking" || state.phase === "downloading" || state.phase === "opening-installer";
  const description = {
    idle: "Kiểm tra và tải bản mới ngay trong Picket.", checking: "Đang kiểm tra phiên bản…",
    current: "Phiên bản đang cài không cần cập nhật.", unsupported: "Chưa có bản cập nhật phù hợp với thiết bị hoặc bản cài này.",
    "play-store": "Bản cài từ Google Play được cập nhật qua Google Play.",
    available: `Có phiên bản ${state.release?.version}. Dung lượng khoảng ${((state.release?.bytes ?? 0) / 1_000_000).toFixed(1).replace(".", ",")} MB.`,
    downloading: "Đang tải và kiểm tra bản cập nhật…", ready: "Bản cập nhật đã được kiểm tra. Android sẽ yêu cầu bạn xác nhận cài đặt.",
    permission: "Cho phép Picket cài bản cập nhật trong Cài đặt Android, rồi quay lại đây. Không cần gỡ ứng dụng.",
    "opening-installer": "Đang mở trình cài đặt Android…",
    "installer-opened": "Hãy hoàn tất xác nhận trên Android. Phiên bản mới sẽ hiện ở cuối trang sau khi bạn mở lại Picket.",
    error: "Chưa thể kiểm tra hoặc cài bản cập nhật. Kiểm tra kết nối và thử lại.",
  }[state.phase];
  const permissions = () => Alert.alert("Cho phép cài bản cập nhật", "Android cần bạn cho phép Picket cài bản cập nhật từ ứng dụng này. Các giao dịch và dữ liệu được giữ nguyên khi cập nhật đúng bản ký.", [
    { text: "Để sau", style: "cancel" }, { text: "Mở Cài đặt", onPress: () => void controller.openSettings() },
  ]);
  return <>
    <SectionTitle title="Ứng dụng" />
    <Surface>
      <View style={styles.heading}><AppIcon name="cellphone-arrow-down" /><Text accessibilityRole="header" style={styles.title}>Cập nhật ứng dụng</Text></View>
      <Text accessibilityLiveRegion="polite" style={styles.description}>{description}</Text>
      {busy && <ActivityIndicator color={colors.mauve} accessibilityLabel={state.phase === "checking" ? "Đang kiểm tra cập nhật" : state.phase === "opening-installer" ? "Đang mở trình cài đặt" : "Đang tải cập nhật"} />}
      {state.phase === "downloading" && <View accessibilityRole="progressbar" accessibilityLabel="Tiến trình tải bản cập nhật" accessibilityValue={{ min: 0, max: 100, now: state.progress }}><Text style={styles.percent}>{state.progress}%</Text></View>}
      {state.phase === "available" && <Action label="Tải bản cập nhật" onPress={() => void controller.download()} />}
      {state.phase === "downloading" && <Action label="Hủy tải" secondary onPress={() => controller.cancel()} />}
      {state.phase === "permission" && <Action label="Cho phép cài cập nhật" onPress={permissions} />}
      {["ready", "installer-opened"].includes(state.phase) && <Action label={state.phase === "ready" ? "Cài bản cập nhật" : "Mở lại trình cài đặt"} onPress={() => void controller.install()} />}
      {state.phase === "play-store" && <Action label="Mở Google Play" onPress={() => void controller.openStore()} />}
      <Action label={state.phase === "idle" ? "Kiểm tra cập nhật" : "Kiểm tra lại"} secondary disabled={busy} onPress={() => void controller.check()} />
    </Surface>
  </>;
}
function Action({ label, onPress, secondary = false, disabled = false }: { label: string; onPress(): void; secondary?: boolean; disabled?: boolean }) {
  return <Pressable disabled={disabled} onPress={onPress} style={[styles.button, secondary && styles.secondary, disabled && styles.disabled]}><Text style={[styles.buttonText, secondary && styles.secondaryText]}>{label}</Text></Pressable>;
}
const styles = StyleSheet.create({
  heading: { flexDirection: "row", alignItems: "center", gap: 10 }, title: { flex: 1, color: colors.ink, fontSize: 17, fontWeight: "700" },
  description: { color: colors.muted, fontSize: 14, lineHeight: 22, marginVertical: 12 }, percent: { textAlign: "center", color: colors.mauve, fontSize: 14, marginBottom: 8 },
  button: { backgroundColor: colors.mauve, borderRadius: 28, paddingHorizontal: 18, paddingVertical: 14, minHeight: 52, alignItems: "center", justifyContent: "center", marginTop: 8 },
  buttonText: { color: colors.white, fontSize: 15, fontWeight: "700", textAlign: "center" }, secondary: { backgroundColor: colors.cream }, secondaryText: { color: colors.mauve }, disabled: { opacity: 0.5 },
  footer: { color: colors.muted, fontSize: 13, textAlign: "center", paddingVertical: 20, paddingHorizontal: 16 },
});
