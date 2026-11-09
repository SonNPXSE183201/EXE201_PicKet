import { figmaColors, figmaType } from "@picket/design-tokens";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, Image, Linking, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { AppIcon, type IconName } from "@/core/ui/app-icon";
import { FigmaButton, figmaShadow } from "@/core/ui/figma-ui";
import { IconButton } from "@/core/ui/picket-ui";
import { PicketText as Text } from "@/core/ui/picket-text";
import { receiptArt } from "./capture-art";

const promises: { icon: IconName; label: string }[] = [
  { icon: "camera-outline", label: "Chỉ bật khi bạn bấm chụp" },
  { icon: "lock-outline", label: "Ảnh hoá đơn lưu riêng trên máy" },
  { icon: "shimmer", label: "Đọc trên máy, không cần mạng" },
];

/** Figma D0 (permission) + D1 (viewfinder). Drop-in for the shared core ReceiptCamera. */
export function ReceiptCamera({ onCapture, onLibrary, onCancel, onManual, disabled = false }: {
  onCapture(uri: string): void; onLibrary(): void; onCancel(): void; onManual(): void; disabled?: boolean;
}) {
  const { colors, styles } = useMobileStyles(createStyles);
  const camera = useRef<CameraView>(null);
  const [focused, setFocused] = useState(false);
  const [permission, requestPermission, getPermission] = useCameraPermissions();
  const [active, setActive] = useState(AppState.currentState === "active");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [torch, setTorch] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    setFocused(true);
    return () => { setFocused(false); setReady(false); };
  }, []));

  useEffect(() => {
    const listener = AppState.addEventListener("change", (state) => {
      setActive(state === "active");
      setReady(false);
      if (state === "active") void getPermission();
    });
    return () => listener.remove();
  }, [getPermission]);

  async function shoot() {
    if (!ready || busy || disabled || !camera.current) return;
    setBusy(true);
    setError(null);
    try {
      const photo = await camera.current.takePictureAsync({ quality: 1, skipProcessing: true, shutterSound: false });
      if (!photo?.uri) throw new Error("missing photo");
      onCapture(photo.uri);
    } catch {
      setError("Chưa chụp được ảnh. Hãy thử lại hoặc chọn từ thư viện.");
    } finally {
      setBusy(false);
    }
  }

  if (!permission || !permission.granted) {
    const canAsk = permission?.canAskAgain ?? true;
    return (
      <SafeAreaView style={styles.permissionSafe}>
        <View style={styles.permissionHeader}>
          <IconButton icon="arrow-left" label="Quay lại" variant="surface" onPress={onCancel} />
          <Text accessibilityRole="header" style={[figmaType.titleSection, styles.permissionHeaderTitle]}>Chụp hoá đơn</Text>
        </View>
        <View style={styles.art}>
          <View style={styles.artCircle} />
          <Image accessible={false} source={receiptArt} resizeMode="contain" style={styles.artImage} />
          <View style={[styles.cameraBadge, figmaShadow("camera")]}><AppIcon name="camera-outline" size={26} color={colors.onCamera} /></View>
        </View>
        <View style={styles.copy}>
          <Text style={[figmaType.display, { color: colors.text }]}>Cho Picket dùng camera</Text>
          <Text style={[figmaType.bodySmall, { color: colors.muted }]}>
            {error ?? "Chụp hoá đơn, Picket tự đọc tổng tiền và ngày. Bạn luôn xem lại trước khi lưu."}
          </Text>
        </View>
        <View style={[styles.promises, figmaShadow("paper")]}>
          {promises.map((item) => (
            <View key={item.label} style={styles.promiseRow}>
              <View style={styles.promiseTile}><AppIcon name={item.icon} size={18} color={colors.text} /></View>
              <Text style={[figmaType.bodyStrong, { color: colors.text, flex: 1 }]}>{item.label}</Text>
            </View>
          ))}
        </View>
        <View style={{ flex: 1 }} />
        {permission ? (
          <FigmaButton fullWidth label={canAsk ? "Cho phép dùng camera" : "Mở Cài đặt thiết bị"} onPress={() => (canAsk ? void requestPermission() : void Linking.openSettings())} />
        ) : (
          <ActivityIndicator accessibilityLabel="Đang chuẩn bị camera" color={colors.primary} />
        )}
        <View style={styles.permissionFooter}>
          <FigmaButton label="Nhập thủ công" variant="text" size="medium" onPress={onManual} />
          <FigmaButton label="Để sau" variant="text" size="medium" onPress={onCancel} />
        </View>
      </SafeAreaView>
    );
  }

  const shutterDisabled = !ready || busy || disabled;
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.top}>
        <Pressable accessibilityRole="button" accessibilityLabel="Đóng camera" onPress={onCancel} style={styles.roundButton}>
          <AppIcon name="close" size={22} color={colors.onCamera} />
        </Pressable>
        <Text accessibilityRole="header" style={[figmaType.bodyStrong, { color: colors.onCamera }]}>Chụp hoá đơn</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={torch ? "Tắt đèn" : "Bật đèn"} onPress={() => setTorch(!torch)} style={styles.roundButton}>
          <AppIcon name={torch ? "flash" : "flash-off"} size={22} color={colors.onCamera} />
        </Pressable>
      </View>
      <View style={styles.viewfinder}>
        {focused && active && !error ? (
          <CameraView
            ref={camera}
            style={StyleSheet.absoluteFill}
            facing="back"
            mode="picture"
            autofocus="on"
            enableTorch={torch}
            onCameraReady={() => setReady(true)}
            onMountError={() => { setReady(false); setError("Không mở được camera. Bạn có thể thử lại hoặc chọn ảnh từ thư viện."); }}
          />
        ) : (
          <View style={styles.errorBox}>
            <Text style={[figmaType.bodySmall, { color: colors.onCamera, textAlign: "center" }]}>{error ?? "Camera đang chuẩn bị"}</Text>
            {error ? <FigmaButton label="Thử lại camera" variant="secondary" size="medium" onPress={() => { setError(null); setReady(false); }} /> : null}
          </View>
        )}
        {!error && (
          <View pointerEvents="none" style={styles.frame}>
            {[styles.tl, styles.tr, styles.bl, styles.br].map((corner, index) => <View key={index} style={[styles.corner, corner]} />)}
          </View>
        )}
      </View>
      <View style={styles.hintRow}>
        <View style={styles.hint}><Text style={[figmaType.captionStrong, { color: colors.onCamera }]}>Đặt cả tờ hoá đơn trong khung</Text></View>
      </View>
      <View style={styles.controls}>
        <Pressable accessibilityRole="button" accessibilityLabel="Chọn ảnh từ thư viện" disabled={busy || disabled} onPress={onLibrary} style={styles.roundButton}>
          <AppIcon name="image-outline" size={22} color={colors.onCamera} />
        </Pressable>
        <Pressable
          accessibilityLabel="Chụp hóa đơn"
          accessibilityState={{ disabled: shutterDisabled, busy }}
          disabled={shutterDisabled}
          onPress={() => void shoot()}
          style={[styles.shutter, shutterDisabled && { opacity: 0.5 }]}
        >
          {busy ? <ActivityIndicator accessibilityLabel="Đang chụp hóa đơn" color={colors.primary} /> : <View style={styles.shutterInner} />}
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Nhập thông tin thủ công" disabled={busy} onPress={onManual} style={styles.manual}>
          <Text style={[figmaType.tabActive, { color: colors.onCamera, textAlign: "center" }]}>{"Nhập\ntay"}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: MobileThemeColors) => StyleSheet.create({
  permissionSafe: { flex: 1, backgroundColor: colors.canvas, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 12, gap: 16 },
  permissionHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  permissionHeaderTitle: { flex: 1, color: colors.text },
  art: { height: 220, alignSelf: "stretch", alignItems: "center", justifyContent: "center" },
  artCircle: { position: "absolute", width: 200, height: 200, borderRadius: 100, backgroundColor: colors.elevated },
  artImage: { width: 165, height: 165 },
  cameraBadge: { position: "absolute", right: "20%", bottom: 8, width: 56, height: 56, borderRadius: 28, borderWidth: 4, borderColor: colors.canvas, backgroundColor: colors.pocketCoral, alignItems: "center", justifyContent: "center" },
  copy: { gap: 6 },
  promises: { backgroundColor: colors.paper, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  promiseRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  promiseTile: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.elevated, alignItems: "center", justifyContent: "center" },
  permissionFooter: { flexDirection: "row", justifyContent: "center", gap: 8 },
  // Camera chrome is dark in both themes (Figma), so text on it stays onCamera white.
  safe: { flex: 1, backgroundColor: figmaColors.text, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 12, gap: 16 },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  roundButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" },
  viewfinder: { flex: 1, minHeight: 180, borderRadius: 12, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.08)" },
  errorBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  frame: { position: "absolute", top: 16, bottom: 16, left: 16, right: 16 },
  corner: { position: "absolute", width: 44, height: 44, borderColor: colors.onCamera },
  tl: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 14 },
  tr: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 14 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 14 },
  br: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 14 },
  hintRow: { alignItems: "center" },
  hint: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.16)" },
  controls: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12 },
  shutter: { width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: colors.onCamera, padding: 4, alignItems: "center", justifyContent: "center" },
  shutterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.onCamera },
  manual: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
});
