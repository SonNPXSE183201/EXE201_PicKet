import { colors, radii } from "@picket/design-tokens";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { PicketTextInput as TextInput } from "@/core/ui/picket-text-input";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { recognizeReceipt } from "@/core/ocr/mlkit-receipt-ocr";
import { receiptImagePickerOptions } from "@/core/ocr/image-picker-policy";
import { captureJournal, persistCaptureImage, restoreCaptureImage } from "@/core/ocr/capture-storage";
import { restoreCaptureSnapshot, type CaptureSnapshot } from "@/core/ocr/capture-journal";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { AppIcon } from "@/core/ui/app-icon";
import { ReceiptCamera } from "@/core/ui/receipt-camera";
import { TopAppBar } from "@/core/ui/picket-ui";
import type { ReceiptDraftLine } from "@/core/ocr/receipt-parser";
import { parseServerOcrResult } from "@/core/ocr/server-result";
import {
  pollServerOcrFallback,
  queueServerOcrFallback,
} from "@/core/ocr/server-fallback";
import { savePendingReceiptDraft } from "@/core/receipts/pending-receipt";
import { guestOwnerId } from "@/core/local/guest-finance";
import { useAuth } from "@/features/auth/auth-context";
import { receiptCalendarDate, receiptCaptureDate } from "@/core/ui/receipt-flow-policy";
import { calendarReceiptDay } from "@/core/ui/receipt-calendar";

const serverFallbackEnabled =
  process.env.EXPO_PUBLIC_OCR_FALLBACK_ENABLED === "true";

export default function CaptureReceiptScreen() {
  const { session, localMode } = useAuth();
  const ownerId = session?.user.id ?? (localMode ? guestOwnerId : null);
  const params = useLocalSearchParams<{ date?: string }>();
  const explicitDate = useRef(receiptCalendarDate(params.date));
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
  const [purchasedAt, setPurchasedAt] = useState(() => receiptCaptureDate(params.date, null));
  const [provider, setProvider] = useState<"ml-kit" | "pp-ocr" | "manual">("manual");
  const [fallbackStoragePath, setFallbackStoragePath] = useState<string | null>(null);
  const [attachReceipt, setAttachReceipt] = useState(true);
  const [isContinuing, setIsContinuing] = useState(false);
  const [hydratedOwner, setHydratedOwner] = useState<string | null>(null);
  const hydrated = ownerId !== null && hydratedOwner === ownerId;
  const [restoreError, setRestoreError] = useState(false);
  const [restoreRevision, setRestoreRevision] = useState(0);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const captureRef = useRef<{ id: string; imageRef: string } | null>(null);
  const imageGeneration = useRef(0);
  const mounted = useRef(true);
  const activeOwner = useRef(ownerId);

  useEffect(() => {
    activeOwner.current = ownerId;
    imageGeneration.current++;
    pollingController.current?.abort();
    if (!ownerId) return;
    let active = true;
    void captureJournal.load(ownerId).then(async saved => {
      if (!active) return;
      setIsRecognizing(false);
      setIsQueueingFallback(false);
      setIsContinuing(false);
      setFallbackStatus(null);
      setCameraOpen(false);
      setRestoreError(false);
      if (saved) {
        const restored = await restoreCaptureSnapshot(ownerId, saved, restoreCaptureImage);
        if (!active) return;
        captureRef.current = { id: saved.id, imageRef: saved.imageRef };
        setHasDraft(true);
        explicitDate.current = saved.explicitDate;
        setImageUri(restored.imageUri); setTitle(saved.title); setAmount(saved.amount);
        setPurchasedAt(saved.purchasedAt); setAttachReceipt(saved.attachReceipt);
        setProvider(saved.provider); setLocalConfidence(saved.localConfidence);
        setNeedsFallback(saved.needsFallback); setRawText(saved.rawText);
        setLineItems(saved.lineItems); setFallbackStoragePath(saved.fallbackStoragePath);
        setMessage(restored.imageUnavailable
          ? "Không mở được ảnh bản nháp. Nội dung và ngày vẫn được giữ. Hãy chụp lại hoặc chọn ảnh khác trước khi tiếp tục."
          : "Đã khôi phục bản nháp trên thiết bị. Bạn có thể tiếp tục chỉnh sửa.");
      } else {
        captureRef.current = null; setImageUri(null); setTitle(""); setAmount("");
        setHasDraft(false);
        setRawText(null); setLineItems([]); setAttachReceipt(true);
        setFallbackStoragePath(null); setProvider("manual"); setNeedsFallback(false); setLocalConfidence(0);
      }
      setHydratedOwner(ownerId);
    }).catch(() => { if (active) setRestoreError(true); });
    return () => { active = false; };
  }, [ownerId, restoreRevision]);

  useEffect(() => {
    if (!hydrated || !ownerId || !captureRef.current || isRecognizing || isQueueingFallback) return;
    const snapshot: CaptureSnapshot = {
      version: 1, ...captureRef.current, title, amount, purchasedAt,
      explicitDate: explicitDate.current, attachReceipt, provider,
      localConfidence, needsFallback, rawText, lineItems, fallbackStoragePath,
    };
    void captureJournal.save(ownerId, snapshot).catch(() => {
      if (mounted.current && activeOwner.current === ownerId) setMessage("Chưa lưu được thay đổi bản nháp. Giữ màn hình này và thử lại trước khi thoát.");
    });
  }, [hydrated, ownerId, imageUri, title, amount, purchasedAt, attachReceipt, provider, localConfidence, needsFallback, rawText, lineItems, fallbackStoragePath, isRecognizing, isQueueingFallback]);

  useEffect(
    () => { mounted.current = true; return () => {
      mounted.current = false;
      pollingController.current?.abort();
    }; },
    [],
  );

  async function acceptImage(uri: string) {
    if (!ownerId || activeOwner.current !== ownerId) return;
    const generation = ++imageGeneration.current;
    pollingController.current?.abort();
    setIsQueueingFallback(false);
    setIsRecognizing(true);
    try {
      const managed = await persistCaptureImage(ownerId, uri);
      if (!mounted.current || activeOwner.current !== ownerId || generation !== imageGeneration.current) return;
      await captureJournal.save(ownerId, {
        version: 1, ...managed, title: "", amount: "",
        purchasedAt: receiptCaptureDate(explicitDate.current, null), explicitDate: explicitDate.current,
        attachReceipt: true, provider: "manual", localConfidence: 0,
        needsFallback: false, rawText: null, lineItems: [], fallbackStoragePath: null,
      });
      if (!mounted.current || activeOwner.current !== ownerId || generation !== imageGeneration.current) return;
      captureRef.current = managed;
      setHasDraft(true);
      setImageUri(uri); setCameraOpen(false); setAttachReceipt(true);
      setFallbackStatus(null); setFallbackStoragePath(null);
      await runOcr(uri, generation);
    } catch {
      if (mounted.current && activeOwner.current === ownerId && generation === imageGeneration.current) setMessage("Chưa lưu được ảnh bản nháp. Ảnh cũ vẫn được giữ; hãy thử lại.");
    } finally {
      if (mounted.current && activeOwner.current === ownerId && generation === imageGeneration.current) setIsRecognizing(false);
    }
  }

  async function runOcr(uri: string, generation: number) {
    setIsRecognizing(true);
    setMessage("Đang nhận diện trực tiếp trên điện thoại…");
    setOcrDurationMs(null);
    setTitle("");
    setAmount("");
    setNeedsFallback(false);
    setLocalConfidence(0);
    setRawText(null);
    setLineItems([]);
    setPurchasedAt(receiptCaptureDate(explicitDate.current, null));
    setProvider("manual");

    try {
      const result = await recognizeReceipt(uri);
      if (!mounted.current || activeOwner.current !== ownerId || generation !== imageGeneration.current) return;
      const { draft } = result;
      setOcrDurationMs(result.durationMs);
      setNeedsFallback(draft.needsReview);
      setLocalConfidence(draft.amountConfidence ?? 0);
      setRawText(draft.rawText || null);
      setLineItems(draft.lineItems);
      setPurchasedAt(receiptCaptureDate(explicitDate.current, draft.date));
      setProvider("ml-kit");
      if (draft.merchant) setTitle(draft.merchant);
      if (draft.amount) setAmount(String(draft.amount));
      setMessage(
        draft.needsReview
          ? `${draft.reviewReason ?? "Kết quả cần được kiểm tra."} Hãy sửa thông tin trước khi lưu.`
          : `Đã nhận diện ${draft.recognizedLineCount} dòng. Hãy kiểm tra lại trước khi lưu.`,
      );
    } catch {
      if (!mounted.current || activeOwner.current !== ownerId || generation !== imageGeneration.current) return;
      setMessage(
        "Chưa đọc được hóa đơn. Hãy thử ảnh khác hoặc nhập thông tin bên dưới.",
      );
    } finally {
      if (mounted.current && activeOwner.current === ownerId && generation === imageGeneration.current) setIsRecognizing(false);
    }
  }

  async function choose(source: "camera" | "library") {
    const generation = imageGeneration.current;
    // Keep the current draft intact until a new image was actually selected.
    try {
      // Keep the native picker lazy so a stale development-client rebuild never
      // prevents login, finance, or offline data from starting.
      const ImagePicker = await import("expo-image-picker");
      const permission =
        source === "camera"
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (activeOwner.current !== ownerId || generation !== imageGeneration.current) return;
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
      if (activeOwner.current !== ownerId || generation !== imageGeneration.current) return;
      if (result.canceled) return;

      const uri = result.assets[0]?.uri;
      if (!uri) {
        setMessage("Không đọc được ảnh đã chọn.");
        return;
      }
      await acceptImage(uri);
    } catch {
      if (activeOwner.current !== ownerId || generation !== imageGeneration.current) return;
      setMessage(
        "Chưa mở được camera. Bạn có thể chọn ảnh từ thư viện hoặc thử lại.",
      );
    }
  }

  async function rotateImage() {
    if (!imageUri || isRecognizing || isQueueingFallback) return;
    const generation = imageGeneration.current;
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

      if (activeOwner.current !== ownerId || generation !== imageGeneration.current) return;
      await acceptImage(rotated.uri);
    } catch {
      if (activeOwner.current !== ownerId) return;
      setMessage(
        "Chưa xoay được ảnh. Hãy thử lại hoặc chọn ảnh khác.",
      );
    } finally {
      if (activeOwner.current === ownerId) setIsRecognizing(false);
    }
  }

  function confirmServerFallback() {
    if (!imageUri || !session) {
      setMessage("Bạn cần đăng nhập và chọn ảnh trước khi dùng OCR nâng cao.");
      return;
    }
    const generation = imageGeneration.current;
    const current = () => mounted.current && activeOwner.current === ownerId && generation === imageGeneration.current;
    Alert.alert(
      "Gửi ảnh để nhận diện nâng cao?",
      "Ảnh sẽ được tải vào vùng riêng tư của tài khoản và đưa vào hàng đợi OCR máy chủ.",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Đồng ý tải ảnh",
          onPress: () => {
            if (!current()) return;
            setIsQueueingFallback(true);
            setMessage("Đang tải ảnh hóa đơn lên vùng riêng tư…");
            void queueServerOcrFallback({
              accessToken: session.access_token,
              userId: session.user.id,
              imageUri,
              localConfidence,
            })
              .then(async (job) => {
                if (!current()) return;
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
                  onStatus: (jobStatus) => { if (current()) setFallbackStatus(jobStatus.status); },
                });
                if (!current()) return;
                if (completed.status === "completed" && completed.result) {
                  const parsed = parseServerOcrResult(completed.result);
                  if (parsed.merchant) setTitle(parsed.merchant);
                  if (parsed.amount) setAmount(String(parsed.amount));
                  setRawText(parsed.rawText || null);
                  setLineItems(parsed.lineItems);
                  setPurchasedAt(receiptCaptureDate(explicitDate.current, parsed.date));
                  setProvider("pp-ocr");
                  setLocalConfidence(parsed.confidence ?? 0);
                  setNeedsFallback(parsed.needsReview);
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
                if (!current()) return;
                if (error instanceof Error && error.name === "AbortError") {
                  return;
                }
                setMessage("Chưa nhận diện được. Hãy thử lại khi có kết nối hoặc nhập thông tin bên dưới.");
              })
              .finally(() => {
                if (!current()) return;
                pollingController.current = null;
                setIsQueueingFallback(false);
              });
          },
        },
      ],
    );
  }

  async function continueToTransaction() {
    const generation = imageGeneration.current;
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
      if (!attachReceipt && !localMode) {
        router.push({
          pathname: "/transactions/new",
          params: { title: title.trim(), amount: String(parsedAmount), occurredAt: purchasedAt, fromCapture: "1", captureDraftId: captureRef.current?.id },
        });
        return;
      }
      const draft = await savePendingReceiptDraft({
        id: captureRef.current?.id,
        userId: session?.user.id ?? guestOwnerId,
        imageUri,
        merchant: title.trim(),
        amount: parsedAmount,
        purchasedAt,
        confidence: provider === "manual" ? null : localConfidence,
        provider,
        reviewRequired: needsFallback,
        rawText,
        lineItems,
        // Server OCR objects expire after processing. The transaction flow
        // uploads its own durable receipt image from this local original.
        storagePath: null,
        transactionId: null,
      });
      if (activeOwner.current !== ownerId || generation !== imageGeneration.current) return;
      router.push({
        pathname: "/transactions/new",
        params: {
          title: title.trim(),
          amount: String(parsedAmount),
          receiptDraftId: draft.id,
          captureDraftId: captureRef.current?.id,
        },
      });
    } catch {
      if (activeOwner.current === ownerId) setMessage("Không lưu được bản nháp hóa đơn trên thiết bị. Hãy thử lại.");
    } finally {
      if (activeOwner.current === ownerId) setIsContinuing(false);
    }
  }

  if (!hydrated) return <SafeAreaView style={styles.safe}><View style={styles.content}><TopAppBar title="Quét hóa đơn" />{restoreError ? <><Text style={styles.message}>Chưa mở được bản nháp. Dữ liệu cũ chưa bị xóa.</Text><Pressable accessibilityRole="button" onPress={() => setRestoreRevision(value => value + 1)} style={styles.secondary}><Text style={styles.secondaryText}>Thử mở lại bản nháp</Text></Pressable></> : <ActivityIndicator accessibilityLabel="Đang mở bản nháp hóa đơn" color={colors.mauve} />}</View></SafeAreaView>;
  if (isRecognizing && (!imageUri || cameraOpen)) return <SafeAreaView style={styles.safe}><ActivityIndicator accessibilityLabel="Đang lưu ảnh bản nháp" color={colors.mauve} /></SafeAreaView>;
  if ((!imageUri && !hasDraft) || cameraOpen) return <ReceiptCamera onCancel={() => { if (hasDraft) setCameraOpen(false); else router.back(); }} onLibrary={() => void choose("library")} onManual={() => router.replace("/transactions/new")} onCapture={(uri) => { void acceptImage(uri); }} />;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <TopAppBar title="Quét hóa đơn" />
        <Text style={styles.subtitle}>
          Chụp rõ toàn bộ hóa đơn. Picket sẽ điền thông tin để bạn kiểm tra trước khi lưu.
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
            <AppIcon name="line-scan" size={64} />
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
            onPress={() => { pollingController.current?.abort(); setCameraOpen(true); }}
            style={[styles.primary, isRecognizing && styles.disabled]}
          >
            <AppIcon name="camera-outline" color={colors.white} /><Text style={styles.primaryText}>Chụp ảnh</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: isRecognizing }}
            disabled={isRecognizing}
            onPress={() => void choose("library")}
            style={[styles.secondary, isRecognizing && styles.disabled]}
          >
            <AppIcon name="image-outline" /><Text style={styles.secondaryText}>Chọn từ thư viện</Text>
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
            <Text style={styles.progressText}>Đang đọc hóa đơn…</Text>
          </View>
        )}

        <Text style={styles.label}>Ngày hóa đơn</Text>
        <TextInput date accessibilityLabel="Ngày hóa đơn" value={calendarReceiptDay({ purchasedAt }) ?? ""} onChangeText={(day) => { explicitDate.current = receiptCalendarDate(day); setPurchasedAt(receiptCaptureDate(day, null)); }} style={styles.input} />
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
        <TextInput money
          accessibilityLabel="Tổng tiền hóa đơn"
          value={amount}
          onChangeText={setAmount}
          keyboardType="number-pad"
          placeholder="Ví dụ: 45000"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />

        {message && <Text accessibilityLiveRegion="polite" role="alert" style={styles.message}>{message}</Text>}
        {__DEV__ && ocrDurationMs !== null && (
          <Text style={styles.metric}>Thời gian OCR: {ocrDurationMs} ms</Text>
        )}
        {lineItems.length > 0 && (
          <Text style={styles.metric}>
            Đã nhận diện {lineItems.length} sản phẩm. Bạn có thể sửa từng dòng
            sau khi lưu hóa đơn.
          </Text>
        )}

        {serverFallbackEnabled && !localMode && needsFallback && fallbackStatus === null && (
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
                : "Nhận diện nâng cao"}
            </Text>
          </Pressable>
        )}
        {fallbackStatus && (
          <Text style={styles.metric}>{fallbackStatus === "completed" ? "Đã nhận diện xong" : fallbackStatus === "failed" || fallbackStatus === "expired" ? "Chưa nhận diện được, bạn có thể nhập tay" : "Đang nhận diện nâng cao…"}</Text>
        )}

        {!localMode && <Pressable
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
        </Pressable>}

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
          Nhận diện cơ bản hoạt động cả khi không có mạng. Bạn luôn có thể sửa thông tin trước khi lưu.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  content: { padding: 22, gap: 14, paddingBottom: 48 },
  back: { color: colors.mauve, fontWeight: "700" },
  title: { color: colors.ink, fontSize: 30, fontWeight: "700" },
  subtitle: { color: colors.muted, lineHeight: 21 },
  placeholder: {
    height: 300,
    backgroundColor: colors.peach,
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
    fontWeight: "700",
    fontSize: 16,
    textAlign: "center",
    marginTop: 12,
  },
  image: { height: 340, borderRadius: radii.large, backgroundColor: colors.white },
  actions: { gap: 10 },
  primary: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    backgroundColor: colors.mauve,
    borderRadius: 28,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 14,
  },
  primaryText: { color: colors.white, fontWeight: "700", fontSize: 16 },
  secondary: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    backgroundColor: colors.white,
    borderColor: colors.peach,
    borderWidth: 1,
    borderRadius: radii.small,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 14,
  },
  secondaryText: { color: colors.mauve, fontWeight: "700", fontSize: 16 },
  disabled: { opacity: 0.55 },
  progress: { flexDirection: "row", alignItems: "center", gap: 10 },
  progressText: { color: colors.muted, fontWeight: "700" },
  label: { color: colors.ink, fontWeight: "700", marginTop: 4 },
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
  consentTitle: { color: colors.ink, fontWeight: "700" },
  consentText: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  privacy: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 8,
  },
});
