import { PicketText as Text } from "@/core/ui/picket-text";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, Linking, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AccessiblePressable as Pressable } from "./accessible-pressable";
import { IconButton } from "./picket-ui";
import { PaperArt } from "./paper-art";

export function ReceiptCamera({
  onCapture,
  onLibrary,
  onCancel,
  onManual,
  disabled = false,
}: {
  onCapture(uri: string): void;
  onLibrary(): void;
  onCancel(): void;
  onManual(): void;
  disabled?: boolean;
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

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => {
        setFocused(false);
        setReady(false);
      };
    }, []),
  );

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
      const photo = await camera.current.takePictureAsync({
        quality: 1,
        skipProcessing: true,
        shutterSound: false,
      });
      if (!photo?.uri) throw new Error("missing photo");
      onCapture(photo.uri);
    } catch {
      setError("Chưa chụp được ảnh. Hãy thử lại hoặc chọn từ thư viện.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <IconButton icon="close" label="Đóng camera" onPress={onCancel} />
        <Text accessibilityRole="header" style={styles.title}>Quét hóa đơn</Text>
        <IconButton
          icon={torch ? "flash" : "flash-off"}
          label={torch ? "Tắt đèn" : "Bật đèn"}
          onPress={() => setTorch(!torch)}
          disabled={!permission?.granted}
        />
      </View>

      <View style={styles.preview}>
        {permission?.granted && focused && active && !error ? (
          <CameraView
            ref={camera}
            style={StyleSheet.absoluteFill}
            facing="back"
            mode="picture"
            autofocus="on"
            enableTorch={torch}
            onCameraReady={() => setReady(true)}
            onMountError={() => {
              setReady(false);
              setError("Không mở được camera. Bạn có thể thử lại hoặc chọn ảnh từ thư viện.");
            }}
          />
        ) : (
          <View style={styles.permissionBackdrop}>
            <View style={styles.permissionCard}>
              <View style={styles.permissionIconBadge}>
                <PaperArt id="security" style={{ width: 44, height: 44 }} />
              </View>

              <Text style={styles.dialogTitle}>
                {permission?.granted ? "Camera đang chuẩn bị" : "Cấp quyền camera để quét hóa đơn"}
              </Text>

              <Text style={styles.dialogSubtitle}>
                {error ?? (permission
                  ? "Picket sử dụng máy ảnh để nhận diện hóa đơn tự động và bảo mật ngay trên điện thoại."
                  : "Đang chuẩn bị camera…")}
              </Text>

              {permission && !permission.granted && (
                <View style={styles.stackedButtons}>
                  {permission.canAskAgain ? (
                    <>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => void requestPermission()}
                        style={[styles.actionPill, styles.primaryPill]}
                      >
                        <Text style={styles.primaryPillText}>Cấp quyền camera</Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        onPress={onManual}
                        style={[styles.actionPill, styles.secondaryPill]}
                      >
                        <Text style={styles.secondaryPillText}>Nhập thủ công</Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        onPress={onCancel}
                        style={[styles.actionPill, styles.outlinePill]}
                      >
                        <Text style={styles.outlinePillText}>Để sau</Text>
                      </Pressable>
                    </>
                  ) : (
                    <>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => void Linking.openSettings()}
                        style={[styles.actionPill, styles.primaryPill]}
                      >
                        <Text style={styles.primaryPillText}>Mở Cài đặt thiết bị</Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        onPress={onManual}
                        style={[styles.actionPill, styles.secondaryPill]}
                      >
                        <Text style={styles.secondaryPillText}>Nhập thủ công</Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        onPress={onCancel}
                        style={[styles.actionPill, styles.outlinePill]}
                      >
                        <Text style={styles.outlinePillText}>Đóng</Text>
                      </Pressable>
                    </>
                  )}
                </View>
              )}

              {error && (
                <Pressable
                  onPress={() => {
                    setError(null);
                    setReady(false);
                  }}
                  style={[styles.actionPill, styles.secondaryPill, { marginTop: 12 }]}
                >
                  <Text style={styles.secondaryPillText}>Thử lại camera</Text>
                </Pressable>
              )}
            </View>
          </View>
        )}

        {permission?.granted && !error && (
          <View pointerEvents="none" style={styles.frame}>
            {[styles.tl, styles.tr, styles.bl, styles.br].map((corner, i) => (
              <View key={i} style={[styles.corner, corner]} />
            ))}
          </View>
        )}
      </View>

      <View style={styles.controls}>
        <IconButton
          icon="image-outline"
          label="Chọn ảnh từ thư viện"
          onPress={onLibrary}
          disabled={busy || disabled}
        />
        <Pressable
          accessibilityLabel="Chụp hóa đơn"
          accessibilityState={{ disabled: !ready || busy || disabled, busy }}
          disabled={!ready || busy || disabled}
          onPress={() => void shoot()}
          style={[styles.shutter, (!ready || busy || disabled) && { opacity: 0.5 }]}
        >
          {busy ? (
            <ActivityIndicator accessibilityLabel="Đang chụp hóa đơn" color={colors.link} />
          ) : (
            <View style={styles.shutterInner} />
          )}
        </Pressable>
        <View style={{ width: 48 }} />
      </View>

      <Pressable onPress={onManual} disabled={busy}>
        <Text style={styles.manual}>Nhập thông tin thủ công</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const createStyles = (colors: MobileThemeColors) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.cream,
      paddingHorizontal: 20,
      paddingBottom: 12,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    title: {
      color: colors.ink,
      fontSize: 20,
      fontWeight: "700",
    },
    preview: {
      flex: 1,
      minHeight: 180,
      borderRadius: 24,
      overflow: "hidden",
      backgroundColor: colors.peach,
    },
    permissionBackdrop: {
      flex: 1,
      backgroundColor: "rgba(30, 24, 34, 0.45)",
      alignItems: "center",
      justifyContent: "center",
      padding: 18,
    },
    permissionCard: {
      width: "100%",
      maxWidth: 340,
      backgroundColor: colors.surface,
      borderRadius: 24,
      paddingVertical: 24,
      paddingHorizontal: 20,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 4,
    },
    permissionIconBadge: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: colors.pocketLilac,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 14,
    },
    dialogTitle: {
      color: colors.ink,
      fontSize: 17,
      fontWeight: "700",
      textAlign: "center",
      lineHeight: 24,
      marginBottom: 8,
    },
    dialogSubtitle: {
      color: colors.muted,
      fontSize: 13,
      textAlign: "center",
      lineHeight: 19,
      marginBottom: 20,
      paddingHorizontal: 6,
    },
    stackedButtons: {
      width: "100%",
      gap: 10,
    },
    actionPill: {
      width: "100%",
      height: 46,
      borderRadius: 23,
      overflow: "hidden",
      alignItems: "center",
      justifyContent: "center",
    },
    primaryPill: {
      backgroundColor: colors.mauve,
    },
    primaryPillText: {
      color: colors.onPrimary,
      fontSize: 14,
      fontWeight: "700",
    },
    secondaryPill: {
      backgroundColor: colors.cream,
      borderWidth: 1,
      borderColor: colors.border,
    },
    secondaryPillText: {
      color: colors.ink,
      fontSize: 14,
      fontWeight: "600",
    },
    outlinePill: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: colors.border,
    },
    outlinePillText: {
      color: colors.muted,
      fontSize: 14,
      fontWeight: "600",
    },
    frame: {
      position: "absolute",
      top: "8%",
      bottom: "8%",
      left: "8%",
      right: "8%",
    },
    corner: {
      position: "absolute",
      width: 36,
      height: 36,
      borderColor: colors.onCamera,
    },
    tl: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4 },
    tr: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4 },
    bl: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4 },
    br: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4 },
    controls: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-around",
      marginTop: 20,
      marginBottom: 10,
    },
    shutter: {
      width: 78,
      height: 78,
      borderRadius: 39,
      borderWidth: 3,
      borderColor: colors.primaryOutline,
      padding: 5,
      alignItems: "center",
      justifyContent: "center",
    },
    shutterInner: {
      width: 62,
      height: 62,
      borderRadius: 31,
      backgroundColor: colors.camera,
    },
    manual: {
      color: colors.link,
      textAlign: "center",
      fontSize: 14,
      fontWeight: "700",
      paddingVertical: 6,
    },
  });
