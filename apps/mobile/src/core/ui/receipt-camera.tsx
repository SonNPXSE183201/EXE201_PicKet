import { colors } from "@picket/design-tokens";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, Linking, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AccessiblePressable as Pressable } from "./accessible-pressable";
import { AppIcon } from "./app-icon";
import { IconButton } from "./picket-ui";

export function ReceiptCamera({ onCapture, onLibrary, onCancel, onManual }: { onCapture(uri: string): void; onLibrary(): void; onCancel(): void; onManual(): void }) {
  const camera = useRef<CameraView>(null);
  const [focused, setFocused] = useState(false);
  const [permission, requestPermission, getPermission] = useCameraPermissions();
  const [active, setActive] = useState(AppState.currentState === "active");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [torch, setTorch] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useFocusEffect(useCallback(() => { setFocused(true); return () => { setFocused(false); setReady(false); }; }, []));
  useEffect(() => { const listener = AppState.addEventListener("change", (state) => { setActive(state === "active"); setReady(false); if (state === "active") void getPermission(); }); return () => listener.remove(); }, [getPermission]);
  async function shoot() {
    if (!ready || busy || !camera.current) return;
    setBusy(true); setError(null);
    try { const photo = await camera.current.takePictureAsync({ quality: 0.85 }); if (!photo?.uri) throw new Error("missing photo"); onCapture(photo.uri); }
    catch { setError("Chưa chụp được ảnh. Hãy thử lại hoặc chọn từ thư viện."); }
    finally { setBusy(false); }
  }
  return <SafeAreaView style={styles.safe}><View style={styles.header}><IconButton icon="close" label="Đóng camera" onPress={onCancel} /><Text accessibilityRole="header" style={styles.title}>Quét hóa đơn</Text><IconButton icon={torch ? "flash" : "flash-off"} label={torch ? "Tắt đèn" : "Bật đèn"} onPress={() => setTorch(!torch)} disabled={!permission?.granted} /></View>
    <Text style={styles.hint}>Đặt toàn bộ hóa đơn trong khung, giữ máy ổn định.</Text>
    <View style={styles.preview}>
      {permission?.granted && focused && active && !error ? <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" mode="picture" autofocus="on" enableTorch={torch} onCameraReady={() => setReady(true)} onMountError={() => { setReady(false); setError("Không mở được camera. Bạn có thể thử lại hoặc chọn ảnh từ thư viện."); }} /> : <View style={styles.permission}><AppIcon name="camera-outline" size={42} /><Text style={styles.permissionText}>{error ?? (permission ? "Cho phép dùng camera để chụp hóa đơn. Ảnh chỉ được lưu khi bạn xác nhận." : "Đang chuẩn bị camera…")}</Text>{permission && !permission.granted && <Pressable onPress={() => { if (permission.canAskAgain) void requestPermission(); else void Linking.openSettings(); }} style={styles.permissionButton}><Text style={styles.buttonText}>{permission.canAskAgain ? "Cho phép camera" : "Mở cài đặt"}</Text></Pressable>}{error && <Pressable onPress={() => { setError(null); setReady(false); }}><Text style={styles.link}>Thử lại camera</Text></Pressable>}</View>}
      {permission?.granted && !error && <View pointerEvents="none" style={styles.frame}>{[styles.tl, styles.tr, styles.bl, styles.br].map((corner, i) => <View key={i} style={[styles.corner, corner]} />)}</View>}
    </View>
    <View style={styles.controls}><IconButton icon="image-outline" label="Chọn ảnh từ thư viện" onPress={onLibrary} disabled={busy} /><Pressable accessibilityLabel="Chụp hóa đơn" accessibilityState={{ disabled: !ready || busy, busy }} disabled={!ready || busy} onPress={() => void shoot()} style={[styles.shutter, (!ready || busy) && { opacity: 0.5 }]}>{busy ? <ActivityIndicator accessibilityLabel="Đang chụp hóa đơn" color={colors.mauve} /> : <View style={styles.shutterInner} />}</Pressable><View style={{ width: 48 }} /></View>
    <Pressable onPress={onLibrary} disabled={busy} style={styles.library}><AppIcon name="image-multiple-outline" size={20} /><Text style={styles.link}>Chọn từ thư viện</Text></Pressable><Pressable onPress={onManual} disabled={busy}><Text style={styles.manual}>Nhập thông tin thủ công</Text></Pressable>
  </SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.cream, paddingHorizontal: 20, paddingBottom: 12 }, header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, title: { color: colors.ink, fontSize: 20, fontWeight: "700" }, hint: { color: colors.muted, textAlign: "center", lineHeight: 21, marginVertical: 16 }, preview: { flex: 1, minHeight: 180, borderRadius: 28, overflow: "hidden", backgroundColor: colors.peach }, permission: { flex: 1, padding: 24, gap: 16, alignItems: "center", justifyContent: "center" }, permissionText: { color: colors.ink, textAlign: "center", lineHeight: 22 }, permissionButton: { backgroundColor: colors.mauve, paddingHorizontal: 20, borderRadius: 28 }, buttonText: { color: colors.white, fontWeight: "700" }, frame: { position: "absolute", top: "8%", bottom: "8%", left: "8%", right: "8%" }, corner: { position: "absolute", width: 36, height: 36, borderColor: colors.peach }, tl: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4 }, tr: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4 }, bl: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4 }, br: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4 }, controls: { flexDirection: "row", alignItems: "center", justifyContent: "space-around", marginTop: 24, marginBottom: 14 }, shutter: { width: 78, height: 78, borderRadius: 39, borderWidth: 3, borderColor: colors.mauve, padding: 5, alignItems: "center", justifyContent: "center" }, shutterInner: { width: 62, height: 62, borderRadius: 31, backgroundColor: colors.mauve }, library: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, alignSelf: "center", paddingHorizontal: 20, borderRadius: 28, backgroundColor: colors.peach }, link: { color: colors.mauve, fontWeight: "700" }, manual: { color: colors.muted, textAlign: "center", fontSize: 13 } });
