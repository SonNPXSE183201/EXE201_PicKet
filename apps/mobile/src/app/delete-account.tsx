import { colors, radii } from "@picket/design-tokens";
import { Redirect, router } from "expo-router";
import { useState } from "react";
import { PicketTextInput as TextInput } from "@/core/ui/picket-text-input";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { picketApi } from "@/core/api/client";
import { routes } from "@/core/navigation/routes";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { useAuth } from "@/features/auth/auth-context";

export default function DeleteAccountScreen() {
  const { session, signOut } = useAuth();
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!session) return <Redirect href={routes.login} />;

  async function remove() {
    if (confirmation !== "DELETE") return setMessage("Hãy nhập chính xác DELETE để xác nhận.");
    if (!session || !picketApi) return setMessage("Chưa thực hiện được lúc này. Hãy đăng nhập và thử lại.");
    setBusy(true);
    setMessage(null);
    try {
      await picketApi.deleteAccount(session.access_token);
      await signOut();
      router.replace(routes.login);
    } catch {
      setMessage("Không thể xóa tài khoản. Hãy đăng xuất, đăng nhập lại rồi thử trong vòng 5 phút.");
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <Pressable accessibilityRole="button" onPress={() => router.back()}><Text style={styles.back}>‹ Quay lại</Text></Pressable>
        <Text accessibilityRole="header" style={styles.title}>Xóa tài khoản?</Text>
        <Text style={styles.description}>Ảnh riêng tư, dữ liệu tài chính và tài khoản đăng nhập sẽ bị xóa vĩnh viễn. Bạn cần vừa đăng nhập lại trong vòng 5 phút.</Text>
        <Text style={styles.label}>Nhập DELETE để xác nhận</Text>
        <TextInput accessibilityLabel="Xác nhận xóa tài khoản" autoCapitalize="characters" autoComplete="off" onChangeText={setConfirmation} style={styles.input} value={confirmation} />
        {message && <Text accessibilityLiveRegion="polite" style={styles.error}>{message}</Text>}
        <Pressable accessibilityRole="button" disabled={busy || confirmation !== "DELETE"} onPress={() => void remove()} style={[styles.deleteButton, confirmation !== "DELETE" && styles.disabled]}>{busy ? <ActivityIndicator accessibilityLabel="Đang xóa vĩnh viễn tài khoản" color={colors.white} /> : <Text style={styles.deleteText}>Xóa vĩnh viễn tài khoản</Text>}</Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.cream, flex: 1 }, content: { flex: 1, gap: 18, justifyContent: "center", padding: 26 }, back: { color: colors.mauve, fontSize: 15, fontWeight: "700" }, title: { color: colors.ink, fontSize: 34, fontWeight: "700" }, description: { color: colors.muted, fontSize: 15, lineHeight: 24 }, label: { color: colors.ink, fontSize: 14, fontWeight: "700" }, input: { backgroundColor: colors.white, borderColor: colors.expense, borderRadius: radii.small, borderWidth: 1, color: colors.ink, fontSize: 17, minHeight: 54, paddingHorizontal: 16 }, error: { color: colors.expense, fontSize: 14, lineHeight: 20 }, deleteButton: { alignItems: "center", backgroundColor: colors.expense, borderRadius: radii.small, justifyContent: "center", minHeight: 54 }, disabled: { opacity: 0.45 }, deleteText: { color: colors.white, fontSize: 15, fontWeight: "700" },
});
