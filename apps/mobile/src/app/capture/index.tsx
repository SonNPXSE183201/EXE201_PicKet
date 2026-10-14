import { colors, radii } from "@picket/design-tokens";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { recognizeReceipt } from "@/core/ocr/mlkit-receipt-ocr";
import { receiptImagePickerOptions } from "@/core/ocr/image-picker-policy";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import {
  parseReceiptText,
  type ReceiptDraftLine,
} from "@/core/ocr/receipt-parser";
import {
  pollServerOcrFallback,
  queueServerOcrFallback,
} from "@/core/ocr/server-fallback";
import { savePendingReceiptDraft } from "@/core/receipts/pending-receipt";
import { useAuth } from "@/features/auth/auth-context";

const serverFallbackEnabled =
  process.env.EXPO_PUBLIC_OCR_FALLBACK_ENABLED === "true";

export default function CaptureReceiptScreen() {
  const { session } = useAuth();
  const pollingController = useRef<AbortController | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [ocrDurationMs, setOcrDurationMs] = useState<number | null>(null);
  const [needsFallback, setNeedsFallback] = useState(false);
  const [localConfidence, setLocalConfidence] = useState(0);
  const [isQueueingFallback, setIsQueueingFallback] = useState(false);
  const [fallbackStatus, setFallbackStatus] = useState<string | null>(null);
  const [rawText, setRawText] = useState<string | null>(null);
  const [lineItems, setLineItems] = useState<ReceiptDraftLine[]>([]);
  const [purchasedAt, setPurchasedAt] = useState<string | null>(null);
  const [provider, setProvider] = useState<"ml-kit" | "pp-ocr" | "manual">("manual");
  const [fallbackStoragePath, setFallbackStoragePath] = useState<string | null>(null);
  const [attachReceipt, setAttachReceipt] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);

  useEffect(
    () => () => {
      pollingController.current?.abort();
    },
    [],
  );

  async function runOcr(uri: string) {
    setIsRecognizing(true);
    setMessage("Đang nhận diện trực tiếp trên điện thoại…");
    setOcrDurationMs(null);
    setTitle("");
    setAmount("");
    setNeedsFallback(false);
    setLocalConfidence(0);
    setRawText(null);
    setLineItems([]);
    setPurchasedAt(null);
    setProvider("manual");

    try {
      const result = await recognizeReceipt(uri);
      const { draft } = result;
      setOcrDurationMs(result.durationMs);
      setNeedsFallback(draft.needsReview);
      setLocalConfidence(draft.amountConfidence ?? 0);
      setRawText(draft.rawText || null);
      setLineItems(draft.lineItems);
      setPurchasedAt(draft.date);
      setProvider("ml-kit");
      if (draft.merchant) setTitle(draft.merchant);
      if (draft.amount) setAmount(String(draft.amount));
      setMessage(
        draft.needsReview
          ? `${draft.reviewReason ?? "Kết quả cần được kiểm tra."} Hãy sửa thông tin trước khi lưu.`
          : `Đã nhận diện ${draft.recognizedLineCount} dòng. Hãy kiểm tra lại trước khi lưu.`,
      );
    } catch {
      setMessage(
        "OCR chưa sẵn sàng trong development build này. Hãy cài lại APK native mới; bạn vẫn có thể nhập tay.",
      );
    } finally {
      setIsRecognizing(false);
    }
  }

  async function choose(source: "camera" | "library") {
    pollingController.current?.abort();
    setMessage(null);
    setFallbackStatus(null);
    setFallbackStoragePath(null);
    setAttachReceipt(false);
    setLineItems([]);
    try {
      // Keep the native picker lazy so a stale development-client rebuild never
      // prevents login, finance, or offline data from starting.
      const ImagePicker = await import("expo-image-picker");
      const permission =
        source === "camera"
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setMessage(
          source === "camera"
            ? "Cần quyền camera để chụp hóa đơn."
            : "Cần quyền thư viện để chọn ảnh.",
        );
        return;
      }

      const picker =
        source === "camera"
          ? ImagePicker.launchCameraAsync
          : ImagePicker.launchImageLibraryAsync;
      const result = await picker(receiptImagePickerOptions);
      if (result.canceled) return;

      const uri = result.assets[0]?.uri;
      if (!uri) {
        setMessage("Không đọc được ảnh đã chọn.");
        return;
      }
      setImageUri(uri);
      await runOcr(uri);
    } catch {
      setMessage(
        "Camera chưa sẵn sàng trong development build này. Hãy cài lại APK native mới trước khi thử lại.",
      );
    }
  }

  async function rotateImage() {
    if (!imageUri || isRecognizing || isQueueingFallback) return;
    pollingController.current?.abort();
    setIsRecognizing(true);
    setMessage("Đang xoay ảnh sang phải…");
    try {
      const { ImageManipulator, SaveFormat } = await import(
        "expo-image-manipulator"
      );
      const context = ImageManipulator.manipulate(imageUri);
      context.rotate(90);
      const rendered = await context.renderAsync();
      const rotated = await rendered.saveAsync({
        compress: 0.85,
        format: SaveFormat.JPEG,
      });

      setImageUri(rotated.uri);
      setFallbackStatus(null);
      setFallbackStoragePath(null);
      setAttachReceipt(false);
      await runOcr(rotated.uri);
    } catch {
      setMessage(
        "Không xoay được ảnh trong development build này. Hãy cài lại APK native mới và thử lại.",
      );
    } finally {
      setIsRecognizing(false);
    }
  }

  function confirmServerFallback() {
    if (!imageUri || !session) {
      setMessage("Bạn cần đăng nhập và chọn ảnh trước khi dùng OCR nâng cao.");
      return;
    }
    Alert.alert(
      "Gửi ảnh để nhận diện nâng cao?",
      "Ảnh sẽ được tải vào vùng riêng tư của tài khoản và đưa vào hàng đợi OCR máy chủ.",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Đồng ý tải ảnh",
          onPress: () => {
            setIsQueueingFallback(true);
            setMessage("Đang tải ảnh hóa đơn lên vùng riêng tư…");
            void queueServerOcrFallback({
              accessToken: session.access_token,
              userId: session.user.id,
              imageUri,
              localConfidence,
            })
              .then(async (job) => {
                setFallbackStoragePath(job.storagePath);
                setFallbackStatus(job.status);
                setMessage(
                  "Ảnh đã vào hàng đợi OCR nâng cao. Đang chờ kết quả…",
                );
                const controller = new AbortController();
                pollingController.current = controller;
                const completed = await pollServerOcrFallback({
                  accessToken: session.access_token,
                  jobId: job.id,
                  signal: controller.signal,
                  onStatus: (current) => setFallbackStatus(current.status),
                });
                if (completed.status === "completed" && completed.result) {
                  const merchant = completed.result.merchant;
                  const detectedAmount = completed.result.amount;
                  if (typeof merchant === "string" && merchant.trim()) {
                    setTitle(merchant.trim());
                  }
                  if (
                    typeof detectedAmount === "number" &&
                    Number.isSafeInteger(detectedAmount) &&
                    detectedAmount > 0
                  ) {
                    setAmount(String(detectedAmount));
                  }
                  if (typeof completed.result.rawText === "string") {
                    setRawText(completed.result.rawText);
                    setLineItems(
                      parseReceiptText(completed.result.rawText).lineItems,
                    );
                  }
                  if (typeof completed.result.purchasedAt === "string") {
                    setPurchasedAt(completed.result.purchasedAt);
                  }
                  setProvider("pp-ocr");
                  setAttachReceipt(true);
                  setMessage(
                    "OCR nâng cao đã hoàn tất. Hãy kiểm tra kết quả trước khi lưu.",
                  );
                } else if (
                  completed.status === "failed" ||
                  completed.status === "expired"
                ) {
                  setMessage(
                    "OCR nâng cao không hoàn tất. Bạn vẫn có thể nhập thông tin thủ công.",
                  );
                } else {
                  setMessage(
                    "OCR nâng cao vẫn đang xử lý. Bạn có thể tiếp tục nhập tay.",
                  );
                }
              })
              .catch((error: unknown) => {
                if (error instanceof Error && error.name === "AbortError") {
                  return;
                }
                setMessage(
                  error instanceof Error
                    ? error.message
                    : "Không thể tạo yêu cầu OCR nâng cao.",
                );
              })
              .finally(() => {
                pollingController.current = null;
                setIsQueueingFallback(false);
              });
          },
        },
      ],
    );
  }

  async function continueToTransaction() {
    if (!imageUri) {
      setMessage("Hãy chụp hoặc chọn ảnh hóa đơn trước.");
      return;
    }
    const parsedAmount = Number.parseInt(amount, 10);
    if (!title.trim()) {
      setMessage("Nhập tên cửa hàng hoặc nội dung giao dịch.");
      return;
    }
    if (!/^\d+$/.test(amount) || parsedAmount <= 0) {
      setMessage("Nhập tổng tiền hợp lệ trước khi tiếp tục.");
      return;
    }
    setIsContinuing(true);
    setMessage(null);
    try {
      if (!attachReceipt || !session) {
        router.push({
          pathname: "/transactions/new",
          params: { title: title.trim(), amount: String(parsedAmount) },
        });
        return;
      }
      const draft = await savePendingReceiptDraft({
        userId: session.user.id,
        imageUri,
        merchant: title.trim(),
        amount: parsedAmount,
        purchasedAt,
        confidence: localConfidence || null,
        provider,
        reviewRequired: needsFallback,
        rawText,
        lineItems,
        storagePath: fallbackStoragePath,
        transactionId: null,
      });
      router.push({
        pathname: "/transactions/new",
        params: {
          title: title.trim(),
          amount: String(parsedAmount),
          receiptDraftId: draft.id,
        },
      });
    } catch {
      setMessage("Không lưu được bản nháp hóa đơn trên thiết bị. Hãy thử lại.");
    } finally {
      setIsContinuing(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable accessibilityRole="button" hitSlop={8} onPress={() => router.back()}>
          <Text style={styles.back}>‹ Quay lại</Text>
        </Pressable>
        <Text accessibilityRole="header" style={styles.title}>Quét hóa đơn</Text>
        <Text style={styles.subtitle}>
          ML Kit Latin nhận diện ngay trên máy. Ảnh chỉ được tải lên khi bạn chủ
          động đồng ý dùng OCR nâng cao và bạn luôn có thể sửa kết quả trước khi
          lưu.
        </Text>

        {imageUri ? (
          <Image
            key={imageUri}
            accessibilityLabel="Ảnh hóa đơn đang được kiểm tra"
            source={{ uri: imageUri }}
            style={styles.image}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderIcon}>▣</Text>
            <Text style={styles.placeholderTitle}>
              Đặt hóa đơn trên nền phẳng, đủ sáng
            </Text>
          </View>
        )}

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: isRecognizing }}
            disabled={isRecognizing}
            onPress={() => void choose("camera")}
            style={[styles.primary, isRecognizing && styles.disabled]}
          >
            <Text style={styles.primaryText}>Chụp ảnh</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: isRecognizing }}
            disabled={isRecognizing}
            onPress={() => void choose("library")}
            style={[styles.secondary, isRecognizing && styles.disabled]}
          >
            <Text style={styles.secondaryText}>Chọn từ thư viện</Text>
          </Pressable>
        </View>

        {imageUri && (
          <Pressable
            accessibilityLabel="Xoay ảnh hóa đơn 90 độ sang phải và nhận diện lại"
            accessibilityRole="button"
            accessibilityState={{
              busy: isRecognizing || isQueueingFallback,
              disabled: isRecognizing || isQueueingFallback,
            }}
            disabled={isRecognizing || isQueueingFallback}
            onPress={() => void rotateImage()}
            style={[
              styles.secondary,
              (isRecognizing || isQueueingFallback) && styles.disabled,
            ]}
          >
            <Text style={styles.secondaryText}>Xoay ảnh 90° sang phải</Text>
          </Pressable>
        )}

        {isRecognizing && (
          <View accessibilityLiveRegion="polite" style={styles.progress}>
            <ActivityIndicator accessibilityLabel="Đang nhận diện hóa đơn" color={colors.mauve} />
            <Text style={styles.progressText}>Đang chạy OCR cục bộ…</Text>
          </View>
        )}

        <Text style={styles.label}>Tên cửa hàng / nội dung</Text>
        <TextInput
          accessibilityLabel="Tên cửa hàng hoặc nội dung hóa đơn"
          value={title}
          onChangeText={setTitle}
          placeholder="Ví dụ: Cà phê sáng"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
        <Text style={styles.label}>Tổng tiền</Text>
        <TextInput
          accessibilityLabel="Tổng tiền hóa đơn"
          value={amount}
          onChangeText={setAmount}
          keyboardType="number-pad"
          placeholder="Ví dụ: 45000"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />

        {message && <Text accessibilityLiveRegion="polite" role="alert" style={styles.message}>{message}</Text>}
        {ocrDurationMs !== null && (
          <Text style={styles.metric}>Thời gian OCR: {ocrDurationMs} ms</Text>
        )}
        {lineItems.length > 0 && (
          <Text style={styles.metric}>
            Đã nhận diện {lineItems.length} sản phẩm. Bạn có thể sửa từng dòng
            sau khi lưu hóa đơn.
          </Text>
        )}

        {serverFallbackEnabled && needsFallback && fallbackStatus === null && (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ busy: isQueueingFallback, disabled: isRecognizing || isQueueingFallback }}
            disabled={isRecognizing || isQueueingFallback}
            onPress={confirmServerFallback}
            style={[
              styles.secondary,
              (isRecognizing || isQueueingFallback) && styles.disabled,
            ]}
          >
            <Text style={styles.secondaryText}>
              {isQueueingFallback
                ? "Đang tạo yêu cầu…"
                : "Thử OCR nâng cao trên máy chủ"}
            </Text>
          </Pressable>
        )}
        {fallbackStatus && (
          <Text style={styles.metric}>OCR máy chủ: {fallbackStatus}</Text>
        )}

        <Pressable
          accessibilityLabel="Đính kèm ảnh hóa đơn vào giao dịch"
          accessibilityRole="checkbox"
          accessibilityState={{ checked: attachReceipt }}
          onPress={() => setAttachReceipt((current) => !current)}
          style={styles.consent}
        >
          <View style={[styles.checkbox, attachReceipt && styles.checkboxSelected]}>
            {attachReceipt && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <View style={styles.consentCopy}>
            <Text style={styles.consentTitle}>Đính kèm ảnh vào giao dịch</Text>
            <Text style={styles.consentText}>
              Khi bật, ảnh sẽ được tải vào vùng riêng tư của tài khoản sau khi
              bạn xác nhận giao dịch.
            </Text>
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ busy: isContinuing, disabled: isRecognizing || isContinuing }}
          disabled={isRecognizing || isContinuing}
          onPress={() => void continueToTransaction()}
          style={[styles.primary, (isRecognizing || isContinuing) && styles.disabled]}
        >
          {isContinuing ? (
            <ActivityIndicator accessibilityLabel="Đang chuẩn bị giao dịch từ hóa đơn" color={colors.white} />
          ) : (
            <Text style={styles.primaryText}>Kiểm tra và tạo giao dịch</Text>
          )}
        </Pressable>
        <Text style={styles.privacy}>
          Model Latin được đóng gói cùng ứng dụng để lần quét đầu tiên vẫn hoạt
          động khi không có mạng. Kết quả OCR chỉ dùng để điền nháp.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  content: { padding: 22, gap: 14, paddingBottom: 48 },
  back: { color: colors.mauve, fontWeight: "800" },
  title: { color: colors.ink, fontSize: 30, fontWeight: "800" },
  subtitle: { color: colors.muted, lineHeight: 21 },
  placeholder: {
    height: 300,
    backgroundColor: "#F7E6D8",
    borderColor: colors.peach,
    borderWidth: 1,
    borderRadius: radii.large,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  placeholderIcon: { fontSize: 50, color: colors.mauve },
  placeholderTitle: {
    color: colors.ink,
    fontWeight: "800",
    fontSize: 16,
    textAlign: "center",
    marginTop: 12,
  },
  image: { height: 340, borderRadius: radii.large, backgroundColor: colors.white },
  actions: { gap: 10 },
  primary: {
    alignItems: "center",
    backgroundColor: colors.mauve,
    borderRadius: radii.small,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 14,
  },
  primaryText: { color: colors.white, fontWeight: "800", fontSize: 16 },
  secondary: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.peach,
    borderWidth: 1,
    borderRadius: radii.small,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 14,
  },
  secondaryText: { color: colors.mauve, fontWeight: "800", fontSize: 16 },
  disabled: { opacity: 0.55 },
  progress: { flexDirection: "row", alignItems: "center", gap: 10 },
  progressText: { color: colors.muted, fontWeight: "700" },
  label: { color: colors.ink, fontWeight: "800", marginTop: 4 },
  input: {
    backgroundColor: colors.white,
    borderColor: colors.peach,
    borderWidth: 1,
    borderRadius: radii.small,
    minHeight: 52,
    paddingHorizontal: 16,
    color: colors.ink,
  },
  message: { color: colors.ink, lineHeight: 20 },
  metric: { color: colors.muted, fontSize: 12 },
  consent: {
    alignItems: "flex-start",
    backgroundColor: colors.white,
    borderColor: colors.peach,
    borderRadius: radii.small,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 14,
  },
  checkbox: {
    alignItems: "center",
    borderColor: colors.mauve,
    borderRadius: 5,
    borderWidth: 2,
    height: 22,
    justifyContent: "center",
    marginTop: 1,
    width: 22,
  },
  checkboxSelected: { backgroundColor: colors.mauve },
  checkmark: { color: colors.white, fontSize: 14, fontWeight: "900" },
  consentCopy: { flex: 1 },
  consentTitle: { color: colors.ink, fontWeight: "800" },
  consentText: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  privacy: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 8,
  },
});
