import { useState } from "react";
import { Animated, Image, Modal, PanResponder, StyleSheet, View, type GestureResponderEvent } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useTranslation } from "react-i18next";
import { figmaColors, figmaType } from "@picket/design-tokens";
import { useAppTheme } from "@/features/settings/appearance-provider";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { AppIcon } from "@/core/ui/app-icon";
import { PicketText as Text } from "@/core/ui/picket-text";

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_TAP_MS = 280;

export function clampScale(value: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));
}

function touchDistance(event: GestureResponderEvent) {
  const [a, b] = event.nativeEvent.touches;
  if (!a || !b) return 0;
  return Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
}

/** Copies the receipt to a local file the Android share sheet can save. */
export async function shareableReceiptUri(uri: string, name: string) {
  const directory = FileSystem.cacheDirectory;
  if (!directory) throw new Error("Cache unavailable");
  const target = `${directory}${name.replace(/[^\w.-]+/g, "-")}.jpg`;
  if (uri.startsWith("file://")) return uri;
  if (uri.startsWith("data:")) {
    await FileSystem.writeAsStringAsync(target, uri.slice(uri.indexOf(",") + 1), { encoding: FileSystem.EncodingType.Base64 });
    return target;
  }
  const { uri: local } = await FileSystem.downloadAsync(uri, target);
  return local;
}

/** Pinch (two fingers), pan while zoomed, double-tap to toggle 2.5x. Built once per viewer. */
function createZoom() {
  const scale = new Animated.Value(1);
  const pan = new Animated.ValueXY();
  const g = { scale: 1, startScale: 1, startDistance: 0, x: 0, y: 0, lastTap: 0 };
  function reset() {
    Object.assign(g, { scale: 1, x: 0, y: 0 });
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
      Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true }),
    ]).start();
  }
  const responder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (event) => {
      g.startScale = g.scale;
      g.startDistance = touchDistance(event);
      const now = Date.now();
      if (event.nativeEvent.touches.length === 1 && now - g.lastTap < DOUBLE_TAP_MS) {
        g.lastTap = 0;
        if (g.scale > 1) reset();
        else { g.scale = 2.5; Animated.spring(scale, { toValue: 2.5, useNativeDriver: true }).start(); }
        return;
      }
      g.lastTap = now;
    },
    onPanResponderMove: (event, state) => {
      if (event.nativeEvent.touches.length >= 2) {
        const distance = touchDistance(event);
        if (!g.startDistance) { g.startDistance = distance; g.startScale = g.scale; return; }
        g.scale = clampScale(g.startScale * (distance / g.startDistance));
        scale.setValue(g.scale);
      } else if (g.scale > 1) {
        pan.setValue({ x: g.x + state.dx, y: g.y + state.dy });
      }
    },
    onPanResponderRelease: (_event, state) => {
      g.startDistance = 0;
      if (g.scale <= 1.02) { reset(); return; }
      g.x += state.dx;
      g.y += state.dy;
    },
  });
  return { scale, pan, responder, reset };
}

/** Figma S5 "Xem ảnh hoá đơn": full-screen, pinch or double-tap to zoom, save via the share sheet. */
export function ReceiptImageViewer({ uri, title, visible, onClose }: { uri: string | null; title: string; visible: boolean; onClose(): void }) {
  const { t } = useTranslation("common");
  const { colors } = useAppTheme();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [zoom] = useState(createZoom);
  const { scale, pan, responder, reset } = zoom;
  // Receipts photographed upside down or sideways can be turned for reading.
  const [turns, setTurns] = useState(0);

  async function save() {
    if (!uri || saving) return;
    setSaving(true);
    setMessage("");
    try {
      const local = await shareableReceiptUri(uri, `picket-${title}`);
      if (!(await Sharing.isAvailableAsync())) throw new Error("Sharing unavailable");
      await Sharing.shareAsync(local, { mimeType: "image/jpeg", dialogTitle: t("Lưu ảnh hoá đơn") });
    } catch {
      setMessage(t("Chưa lưu được ảnh. Hãy thử lại."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent onRequestClose={() => { reset(); setTurns(0); onClose(); }}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel={t("Đóng")} onPress={() => { reset(); setTurns(0); onClose(); }} style={styles.round}>
            <AppIcon name="close" size={22} color={figmaColors.text} />
          </Pressable>
          <Text numberOfLines={1} accessibilityRole="header" style={[figmaType.bodyStrong, styles.title]}>{title}</Text>
          {uri && (
            <Pressable accessibilityRole="button" accessibilityLabel={t("Xoay ảnh")} onPress={() => { reset(); setTurns((value) => (value + 1) % 4); }} style={styles.round}>
              <AppIcon name="rotate-right" size={22} color={figmaColors.text} />
            </Pressable>
          )}
        </View>
        <View style={styles.stage} {...responder.panHandlers}>
          {uri ? (
            <Animated.View style={[styles.paper, { transform: [{ translateX: pan.x }, { translateY: pan.y }, { scale }, { rotate: `${turns * 90}deg` }] }]}>
              <Image source={{ uri }} resizeMode="contain" style={styles.image} accessibilityLabel={t("Ảnh hoá đơn")} />
            </Animated.View>
          ) : (
            <Text style={[figmaType.bodySmall, { color: "#FFFFFF" }]}>{t("Không có ảnh hoá đơn")}</Text>
          )}
        </View>
        {!!message && <Text accessibilityRole="alert" style={[figmaType.captionStrong, styles.message]}>{message}</Text>}
        <View style={styles.footer}>
          <Text style={[figmaType.captionStrong, styles.hint]}>{t("Chụm hai ngón hoặc chạm hai lần để phóng to")}</Text>
          {uri && (
            <Pressable accessibilityRole="button" disabled={saving} onPress={() => void save()} style={[styles.save, { backgroundColor: colors.pocketCoral, opacity: saving ? 0.6 : 1 }]}>
              <Text style={[figmaType.button, { color: figmaColors.text }]}>{saving ? t("Đang chuẩn bị…") : t("Lưu ảnh")}</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: figmaColors.text, paddingTop: 40, paddingBottom: 28 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20 },
  round: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  title: { flex: 1, color: "#FFFFFF" },
  stage: { flex: 1, alignItems: "center", justifyContent: "center", overflow: "hidden", paddingHorizontal: 20 },
  paper: { width: "100%", height: "86%", backgroundColor: "#FFFFFF", borderRadius: 6, padding: 8 },
  image: { flex: 1, width: "100%" },
  message: { color: "#FFFFFF", textAlign: "center", paddingHorizontal: 20, paddingBottom: 8 },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingHorizontal: 20 },
  hint: { flex: 1, color: "rgba(255,255,255,0.8)" },
  save: { minHeight: 48, paddingHorizontal: 20, borderRadius: 999, alignItems: "center", justifyContent: "center" },
});
