import { PicketApiClient } from "@picket/api-client";
import { colors, radii } from "@picket/design-tokens";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ApiState = "checking" | "online" | "offline";

const fallbackApiUrl = Platform.select({
  android: "http://10.0.2.2:8080",
  default: "http://localhost:8080",
});

export default function HomeScreen() {
  const [apiState, setApiState] = useState<ApiState>("checking");
  const client = useMemo(
    () =>
      new PicketApiClient(
        process.env.EXPO_PUBLIC_API_URL ?? fallbackApiUrl ?? "",
      ),
    [],
  );

  const checkApi = () => {
    setApiState("checking");
    client
      .health()
      .then(() => setApiState("online"))
      .catch(() => setApiState("offline"));
  };

  useEffect(() => {
    let active = true;
    client
      .health()
      .then(() => active && setApiState("online"))
      .catch(() => active && setApiState("offline"));
    return () => {
      active = false;
    };
  }, [client]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.brandMark}>
            <Text style={styles.brandLetter}>P</Text>
          </View>
          <Text style={styles.brand}>Picket</Text>
        </View>

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>TÀI CHÍNH RÕ RÀNG</Text>
          <Text style={styles.title}>Mỗi hóa đơn, một quyết định tốt hơn.</Text>
          <Text style={styles.description}>
            Quét nhanh trên thiết bị, tự động đọc tổng tiền và chỉ dùng fallback
            khi ảnh thực sự khó.
          </Text>
        </View>

        <View style={styles.balanceCard}>
          <Text style={styles.label}>Số dư tháng này</Text>
          <Text style={styles.balance}>18.420.000 ₫</Text>
          <View style={styles.divider} />
          <View style={styles.moneyRow}>
            <View>
              <Text style={styles.label}>Thu nhập</Text>
              <Text style={styles.income}>24.800.000 ₫</Text>
            </View>
            <View style={styles.alignRight}>
              <Text style={styles.label}>Chi tiêu</Text>
              <Text style={styles.expense}>6.380.000 ₫</Text>
            </View>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={checkApi}
          style={({ pressed }) => [styles.apiCard, pressed && styles.pressed]}
        >
          <View
            style={[
              styles.statusDot,
              apiState === "online" && styles.online,
              apiState === "offline" && styles.offline,
            ]}
          />
          <View style={styles.apiCopy}>
            <Text style={styles.apiTitle}>
              {apiState === "checking"
                ? "Đang kiểm tra Dart API"
                : apiState === "online"
                  ? "Dart API đang hoạt động"
                  : "Chưa kết nối được Dart API"}
            </Text>
            <Text style={styles.apiHint}>Chạm để kiểm tra lại</Text>
          </View>
          {apiState === "checking" && (
            <ActivityIndicator color={colors.mauve} />
          )}
        </Pressable>

        <View style={styles.ocrNote}>
          <Text style={styles.ocrTitle}>OCR dành cho máy yếu</Text>
          <Text style={styles.ocrBody}>
            ML Kit chạy local là luồng chính. Ảnh có độ tin cậy thấp mới được gửi
            đến dịch vụ PP-OCR fallback, giúp thao tác thường ngày nhanh và tiết
            kiệm dữ liệu.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.cream },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 42 },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandMark: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.small,
    borderBottomLeftRadius: 5,
    backgroundColor: colors.mauve,
  },
  brandLetter: { color: colors.white, fontSize: 20, fontWeight: "800" },
  brand: { color: colors.ink, fontSize: 21, fontWeight: "800" },
  hero: { paddingTop: 52, paddingBottom: 34 },
  eyebrow: {
    color: colors.mauve,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.6,
  },
  title: {
    maxWidth: 430,
    marginTop: 14,
    color: colors.ink,
    fontSize: 42,
    fontWeight: "700",
    lineHeight: 46,
    letterSpacing: -1.7,
  },
  description: {
    maxWidth: 520,
    marginTop: 18,
    color: colors.muted,
    fontSize: 16,
    lineHeight: 25,
  },
  balanceCard: {
    padding: 24,
    borderRadius: radii.large,
    backgroundColor: colors.white,
    shadowColor: colors.ink,
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  label: { color: colors.muted, fontSize: 12 },
  balance: {
    marginTop: 7,
    color: colors.ink,
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -1,
  },
  divider: { height: 1, marginVertical: 23, backgroundColor: colors.cream },
  moneyRow: { flexDirection: "row", justifyContent: "space-between", gap: 16 },
  alignRight: { alignItems: "flex-end" },
  income: { marginTop: 7, color: colors.income, fontSize: 15, fontWeight: "700" },
  expense: { marginTop: 7, color: colors.expense, fontSize: 15, fontWeight: "700" },
  apiCard: {
    minHeight: 76,
    marginTop: 16,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    borderRadius: radii.medium,
    borderWidth: 1,
    borderColor: colors.peach,
    backgroundColor: "#FFFFFF99",
  },
  pressed: { opacity: 0.72 },
  statusDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#C99A5E" },
  online: { backgroundColor: colors.income },
  offline: { backgroundColor: colors.expense },
  apiCopy: { flex: 1 },
  apiTitle: { color: colors.ink, fontSize: 14, fontWeight: "700" },
  apiHint: { marginTop: 4, color: colors.muted, fontSize: 12 },
  ocrNote: { marginTop: 28, paddingHorizontal: 4 },
  ocrTitle: { color: colors.ink, fontSize: 18, fontWeight: "800" },
  ocrBody: { marginTop: 8, color: colors.muted, fontSize: 14, lineHeight: 22 },
});
