import { paperControl , paperShape, paperSpace } from "@/core/theme/paper-foundations";
import { PicketScrollView as ScrollView } from "@/core/ui/picket-scroll-view";
import { PicketText as Text } from "@/core/ui/picket-text";

import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { radii } from "@/core/ui/mobile-palette";
import * as Crypto from "expo-crypto";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PicketTextInput as TextInput } from "@/core/ui/picket-text-input";
import { ActivityIndicator, Alert, Image, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { prepareCapture } from "@/core/ocr/capture-work";
import { recognizeReceipt } from "@/core/ocr/mlkit-receipt-ocr";
import { canAttachReceipt } from "@/core/ocr/receipt-eligibility";
import { receiptCurrencyWarning } from "@/core/ocr/receipt-currency";
import { receiptImagePickerOptions } from "@/core/ocr/image-picker-policy";
import { captureJournal, cleanupCaptureImages, persistCaptureImage, restoreCaptureImage, pickerRecovery } from "@/core/ocr/capture-storage";
import type { CaptureSnapshot } from "@/core/ocr/capture-journal";
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
import { formatMoney } from "@/core/i18n/formatters";
import { calendarReceiptDay } from "@/core/ui/receipt-calendar";

const serverFallbackEnabled =
  process.env.EXPO_PUBLIC_OCR_FALLBACK_ENABLED === "true";

export default function CaptureReceiptScreen() {
  const { colors, styles } = useMobileStyles(createStyles);
  const { session, localMode } = useAuth();
  const ownerId = session?.user.id ?? (localMode ? guestOwnerId : null);
  const params = useLocalSearchParams<{ date?: string }>();
  const explicitDate = useRef(receiptCalendarDate(params.date));
  const pollingController = useRef<AbortController | null>(null);
  const localOcrController = useRef<AbortController | null>(null);
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
  const [currencyEvidence, setCurrencyEvidence] = useState<string | null>(null);
  const [lineItems, setLineItems] = useState<ReceiptDraftLine[]>([]);
  const [purchasedAt, setPurchasedAt] = useState(() => receiptCaptureDate(params.date, null));
  const [hasObservedDate, setHasObservedDate] = useState(() => Boolean(params.date));
  const [provider, setProvider] = useState<"ml-kit" | "pp-ocr" | "manual">("manual");
  const [fallbackStoragePath, setFallbackStoragePath] = useState<string | null>(null);
  const [attachReceipt, setAttachReceipt] = useState(true);
  const [isContinuing, setIsContinuing] = useState(false);
  const [hydratedOwner, setHydratedOwner] = useState<string | null>(null);
  const hydrated = ownerId !== null && hydratedOwner === ownerId;
  const [cameraOpen, setCameraOpen] = useState(true);
  const [hasDraft, setHasDraft] = useState(false);
  const captureRef = useRef<{ id: string; imageRef: string } | null>(null);
  const imageGeneration = useRef(0);
  const pickerBusy = useRef(false);
  const mounted = useRef(true);
  const activeOwner = useRef(ownerId);
  const receiptEligible = useMemo(() => hasDraft && !isRecognizing && canAttachReceipt({ rawText }), [hasDraft, isRecognizing, rawText]);
  const currencyWarning = useMemo(() => receiptCurrencyWarning(rawText) ?? currencyEvidence, [rawText, currencyEvidence]);

  useFocusEffect(useCallback(() => {
    setCameraOpen(true); setIsRecognizing(false); setIsQueueingFallback(false);
    return () => {
      imageGeneration.current++;
      localOcrController.current?.abort();
      pollingController.current?.abort();
    };
  }, []));

  useEffect(() => {
    activeOwner.current = ownerId;
    imageGeneration.current++;
    pollingController.current?.abort();
    localOcrController.current?.abort();
    captureRef.current = null;
    const generation = imageGeneration.current;
    let active = true;
    void Promise.resolve().then(() => {
      if (!active || activeOwner.current !== ownerId || generation !== imageGeneration.current) return;
      setCameraOpen(true); setHasDraft(false); setImageUri(null);
      setTitle(""); setAmount(""); setRawText(null); setLineItems([]);
      setCurrencyEvidence(null);
      setIsRecognizing(false); setIsQueueingFallback(false); setIsContinuing(false);
      setNeedsFallback(false); setLocalConfidence(0); setProvider("manual");
      setFallbackStatus(null); setFallbackStoragePath(null); setMessage(null);
      setHydratedOwner(ownerId);
    });
    return () => { active = false; };
  }, [ownerId]);

  useEffect(() => {
    // Fallback requests have their own journal. Keep manual edits durable even
    // while a remote job is pending or polling; process death must not lose them.
    if (!hydrated || !ownerId || !captureRef.current || isRecognizing) return;
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
      localOcrController.current?.abort();
    }; },
    [],
  );

  async function acceptImage(uri: string) {
    if (!ownerId || activeOwner.current !== ownerId) return;
    const generation = ++imageGeneration.current;
    pollingController.current?.abort();
    setIsQueueingFallback(false);
    setIsRecognizing(true); setCameraOpen(false); setImageUri(uri);
    setHasDraft(false); captureRef.current = null;
    setAttachReceipt(true); setFallbackStatus(null); setFallbackStoragePath(null);
    try {
      const managed = await prepareCapture(
        () => runOcr(uri, generation),
        async () => {
          const stored = await persistCaptureImage(ownerId, uri);
          if (!mounted.current || activeOwner.current !== ownerId || generation !== imageGeneration.current) throw new Error("CAPTURE_CANCELLED");
          await captureJournal.save(ownerId, {
            version: 1, ...stored, title: "", amount: "",
            purchasedAt: receiptCaptureDate(explicitDate.current, null), explicitDate: explicitDate.current,
            attachReceipt: true, provider: "manual", localConfidence: 0,
            needsFallback: false, rawText: null, lineItems: [], fallbackStoragePath: null,
          });
          return stored;
        },
      );
      if (!mounted.current || activeOwner.current !== ownerId || generation !== imageGeneration.current) return;
      captureRef.current = managed; setHasDraft(true);
    } catch {
      if (mounted.current && activeOwner.current === ownerId && generation === imageGeneration.current) {
        setHasDraft(false);
        setMessage("Chưa lưu được ảnh. Hãy thử lại.");
      }
    } finally {
      if (mounted.current && activeOwner.current === ownerId && generation === imageGeneration.current) {
        setIsRecognizing(false);
        void cleanupCaptureImages(ownerId).catch(() => undefined);
      }
    }
  }

  async function runOcr(uri: string, generation: number) {
    localOcrController.current?.abort();
    const controller = new AbortController();
    localOcrController.current = controller;
    setIsRecognizing(true);
    setMessage(null);
    setOcrDurationMs(null);
    setTitle("");
    setAmount("");
    setNeedsFallback(false);
    setLocalConfidence(0);
    setRawText(null);
    setCurrencyEvidence(null);
    setLineItems([]);
    setPurchasedAt(receiptCaptureDate(explicitDate.current, null));
    setHasObservedDate(Boolean(explicitDate.current));
    setProvider("manual");

    try {
      const result = await recognizeReceipt(uri, controller.signal);
      if (!mounted.current || activeOwner.current !== ownerId || generation !== imageGeneration.current) return;
      const { draft } = result;
      setCurrencyEvidence(receiptCurrencyWarning(draft.rawText));
      if (!canAttachReceipt(draft)) {
        setRawText(draft.rawText || null);
        setAttachReceipt(false);
        setMessage("Không đọc được hóa đơn. Chụp lại hoặc chọn ảnh khác.");
        return;
      }
      setOcrDurationMs(result.durationMs);
      setNeedsFallback(draft.needsReview || !draft.date);
      setLocalConfidence(draft.amountConfidence ?? 0);
      setRawText(draft.rawText || null);
      setLineItems(draft.lineItems);
      setPurchasedAt(receiptCaptureDate(explicitDate.current, draft.date));
      setHasObservedDate(Boolean(explicitDate.current || draft.date));
      setProvider("ml-kit");
      if (draft.merchant) setTitle(draft.merchant);
      if (draft.amount) setAmount(String(draft.amount));
      setMessage(result.budgetExceeded ? "Chưa đọc hết ảnh. Hãy kiểm tra hoặc chụp lại."
        : draft.amount === null ? "Chưa đọc được tổng tiền."
        : draft.needsReview ? draft.reviewReason ?? "Có thông tin cần kiểm tra."
        : !draft.date ? "Chưa đọc được ngày hóa đơn." : null);
    } catch (error) {
      if (!mounted.current || activeOwner.current !== ownerId || generation !== imageGeneration.current) return;
      setMessage(
        String(error).includes("OCR_BUSY")
          ? "Lượt quét trước đang kết thúc."
          : "Chưa đọc được ảnh. Hãy thử lại.",
      );
    } finally {
      if (localOcrController.current === controller) localOcrController.current = null;
    }
  }

  async function choose(source: "camera" | "library") {
    if (pickerBusy.current || isContinuing || isRecognizing || isQueueingFallback) return;
    // A ref closes the gap before React renders or the native picker returns.
    // Rapid taps must not launch competing native activities or recovery rows.
    pickerBusy.current = true;
    const generation = imageGeneration.current;
    let pickerOperation: string | null = null;
    // Keep the current draft intact until a new image was actually selected.
    try {
      // Keep the native picker lazy so a stale development-client rebuild never
      // prevents login, finance, or offline data from starting.
      const ImagePicker = await import("expo-image-picker");
      // The system photo picker grants access to the selected URI. Broad
      // media-library permission is neither required nor declared by the APK.
      if (source === "camera") {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (activeOwner.current !== ownerId || generation !== imageGeneration.current) return;
        if (!permission.granted) {
          Alert.alert("Quyền camera", "Cần quyền camera để chụp hóa đơn.");
          return;
        }
      }

      const picker =
        source === "camera"
          ? ImagePicker.launchCameraAsync
          : ImagePicker.launchImageLibraryAsync;
      if (!ownerId) return;
      pickerOperation = Crypto.randomUUID();
      await pickerRecovery.begin(ownerId, pickerOperation);
      if (!mounted.current || activeOwner.current !== ownerId || generation !== imageGeneration.current) return;
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
      const errorMessage = source === "library" ? "Chưa mở được thư viện ảnh. Hãy thử lại." : "Chưa mở được camera. Bạn có thể chọn ảnh từ thư viện hoặc thử lại.";
      setMessage(errorMessage);
      Alert.alert("Quét hóa đơn", errorMessage);
    } finally {
      if (ownerId && pickerOperation) await pickerRecovery.complete(ownerId, pickerOperation).catch(() => undefined);
      pickerBusy.current = false;
    }
  }

  function confirmServerFallback() {
    if (isContinuing || isRecognizing || isQueueingFallback) return;
    if (!receiptEligible) return;
    const capture = captureRef.current;
    if (!imageUri || !session || !capture) {
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
            const controller = new AbortController();
            pollingController.current = controller;
            void restoreCaptureImage(session.user.id, capture.imageRef).then(restoredImage => queueServerOcrFallback({
              accessToken: session.access_token,
              userId: session.user.id,
              imageUri: restoredImage,
              localConfidence,
              captureId: capture.id,
              imageRef: capture.imageRef,
              baseline: { title, amount, purchasedAt },
              signal: controller.signal,
            }))
              .then(async ({ job, baseline }) => {
                if (!current()) return;
                setFallbackStoragePath(job.storagePath);
                setFallbackStatus(job.status);
                setMessage(
                  "Ảnh đã vào hàng đợi OCR nâng cao. Đang chờ kết quả…",
                );
                const completed = await pollServerOcrFallback({
                  accessToken: session.access_token,
                  jobId: job.id,
                  signal: controller.signal,
                  onStatus: (jobStatus) => { if (current()) setFallbackStatus(jobStatus.status); },
                });
                if (!current()) return;
                if (completed.status === "completed" && completed.result) {
                  const parsed = parseServerOcrResult(completed.result);
                  // Missing currency in a second reading cannot clear evidence
                  // already observed on this image while local amounts survive.
                  setCurrencyEvidence(current => current ?? receiptCurrencyWarning(parsed.rawText));
                  // A late server result is a suggestion, not permission to
                  // overwrite edits made during polling or after restart.
                  if (parsed.merchant) setTitle(current => current === baseline.title ? parsed.merchant! : current);
                  if (parsed.amount) setAmount(current => current === baseline.amount ? String(parsed.amount) : current);
                  setRawText(parsed.rawText || null);
                  setLineItems(parsed.lineItems);
                  // Fill only an unobserved default. A missing/late server date
                  // must not replace local OCR evidence or a user's edit.
                  if (parsed.date && !hasObservedDate && !explicitDate.current) {
                    setPurchasedAt(current => current === baseline.purchasedAt
                      ? receiptCaptureDate(null, parsed.date) : current);
                    setHasObservedDate(true);
                  }
                  setProvider("pp-ocr");
                  setLocalConfidence(parsed.confidence ?? 0);
                  setNeedsFallback(parsed.needsReview);
                  // OCR consent is separate from attaching an image to a
                  // transaction. Keep the user's current attachment choice.
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
    if (isContinuing || isRecognizing || isQueueingFallback) return;
    if (currencyWarning) { setMessage(currencyWarning); return; }
    if (!receiptEligible) { setMessage("Ảnh chưa được nhận diện là hóa đơn. Hãy chụp lại hoặc chọn ảnh khác."); return; }
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
      if (mounted.current && activeOwner.current === ownerId && generation === imageGeneration.current) setMessage("Không lưu được bản nháp hóa đơn trên thiết bị. Hãy thử lại.");
    } finally {
      if (mounted.current && activeOwner.current === ownerId && generation === imageGeneration.current) setIsContinuing(false);
    }
  }

  const cameraScreen = <ReceiptCamera
    disabled={!hydrated}
    onCancel={() => router.back()}
    onLibrary={() => void choose("library")}
    onManual={() => router.replace("/transactions/new")}
    onCapture={(uri) => { void acceptImage(uri); }}
  />;
  if (cameraOpen && !isRecognizing) return cameraScreen;
  if (!hydrated) return <SafeAreaView style={styles.safe}><ActivityIndicator accessibilityLabel="Đang mở camera" color={colors.link} /></SafeAreaView>;
  if (!imageUri && !hasDraft && !isRecognizing) return cameraScreen;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <TopAppBar title="Quét hóa đơn" />

        {isRecognizing && (
          <View accessibilityLiveRegion="polite" style={styles.progress}>
            <ActivityIndicator accessibilityLabel="Đang nhận diện hóa đơn" color={colors.link} />
            <Text style={styles.progressText}>Đang đọc hóa đơn…</Text>
          </View>
        )}

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

        {message && <Text accessibilityLiveRegion="polite" role="alert" style={styles.message}>{message}</Text>}

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: isRecognizing || isContinuing || isQueueingFallback }}
            disabled={isRecognizing || isContinuing || isQueueingFallback}
            onPress={() => { pollingController.current?.abort(); setCameraOpen(true); }}
            style={[styles.primary, (isRecognizing || isContinuing || isQueueingFallback) && styles.disabled]}
          >
            <AppIcon name="camera-outline" color={colors.onPrimary} /><Text style={styles.primaryText}>Chụp lại</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: isRecognizing || isContinuing || isQueueingFallback }}
            disabled={isRecognizing || isContinuing || isQueueingFallback}
            onPress={() => void choose("library")}
            style={[styles.secondary, (isRecognizing || isContinuing || isQueueingFallback) && styles.disabled]}
          >
            <AppIcon name="image-outline" /><Text style={styles.secondaryText}>Chọn từ thư viện</Text>
          </Pressable>
        </View>



        {currencyWarning && <Text role="alert" style={styles.message}>{currencyWarning}</Text>}
        {receiptEligible && <>

        <Text style={styles.label}>{typeof hasObservedDate === "boolean" && !hasObservedDate ? "Ngày hóa đơn (chưa đọc được trên ảnh — tạm điền hôm nay)" : "Ngày hóa đơn"}</Text>
        <TextInput date accessibilityLabel="Ngày hóa đơn" value={calendarReceiptDay({ purchasedAt }) ?? ""} onChangeText={(day) => { explicitDate.current = receiptCalendarDate(day); setHasObservedDate(Boolean(explicitDate.current)); setPurchasedAt(receiptCaptureDate(day, null)); }} style={styles.input} />
        <Text style={styles.label}>Tên cửa hàng / nội dung</Text>
        <TextInput
          accessibilityLabel="Tên cửa hàng hoặc nội dung hóa đơn"
          editable={receiptEligible}
          value={title}
          onChangeText={setTitle}
          placeholder="Ví dụ: Cà phê sáng"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
        <Text style={styles.label}>{currencyWarning ? "Số tiền đọc được (chưa xác nhận tiền tệ)" : "Tổng tiền (VND)"}</Text>
        <TextInput money
          accessibilityLabel="Tổng tiền hóa đơn"
          editable={receiptEligible}
          value={amount}
          onChangeText={setAmount}
          keyboardType="number-pad"
          placeholder="Ví dụ: 45000"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />

        {__DEV__ && ocrDurationMs !== null && (
          <Text style={styles.metric}>Thời gian OCR: {ocrDurationMs} ms</Text>
        )}
        {lineItems.length > 0 && (
          <Text style={styles.metric}>
            {lineItems.length} sản phẩm
          </Text>
        )}

        {lineItems.map((item, index) => (
          <View key={`${index}-${item.name}`}>
            <Text style={styles.label}>{item.name}</Text>
            <Text style={styles.metric}>Số lượng: {item.quantity} · Đơn giá: {currencyWarning ? String(item.unitPrice) : formatMoney(item.unitPrice, "vi", "VND")} · Thành tiền: {currencyWarning ? String(item.total) : formatMoney(item.total, "vi", "VND")}</Text>
            {item.confidence < 0.7 && <Text style={styles.message}>Số lượng hoặc đơn giá chưa chắc chắn. Hãy đối chiếu ảnh.</Text>}
          </View>
        ))}
        {lineItems.length === 0 && <Text style={styles.metric}>Chưa đọc được chi tiết sản phẩm.</Text>}

        {serverFallbackEnabled && receiptEligible && !localMode && needsFallback && !["completed", "failed", "cancelled", "expired"].includes(fallbackStatus ?? "") && (
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
                : "Nhận diện nâng cao (cần mạng)"}
            </Text>
          </Pressable>
        )}
        {fallbackStatus && (
          <Text style={styles.metric}>{fallbackStatus === "completed" ? "Đã nhận diện xong" : fallbackStatus === "failed" || fallbackStatus === "expired" ? "Chưa nhận diện được, bạn có thể nhập tay" : "Đang nhận diện nâng cao…"}</Text>
        )}

        {!localMode && <Pressable
          accessibilityLabel="Đính kèm ảnh hóa đơn vào giao dịch"
          accessibilityRole="checkbox"
          disabled={!receiptEligible}
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
              Chỉ tải ảnh khi bạn lưu giao dịch.
            </Text>
          </View>
        </Pressable>}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ busy: isContinuing, disabled: !receiptEligible || !!currencyWarning || isContinuing || isQueueingFallback }}
          disabled={!receiptEligible || !!currencyWarning || isContinuing || isQueueingFallback}
          onPress={() => void continueToTransaction()}
          style={[styles.primary, (isRecognizing || !!currencyWarning || isContinuing || isQueueingFallback) && styles.disabled]}
        >
          {isContinuing ? (
            <ActivityIndicator accessibilityLabel="Đang chuẩn bị giao dịch từ hóa đơn" color={colors.onPrimary} />
          ) : (
            <Text style={styles.primaryText}>Kiểm tra và tạo giao dịch</Text>
          )}
        </Pressable>
        </>}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: MobileThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  content: { maxWidth: 720, width: "100%", alignSelf: "center", padding: paperSpace.screen, gap: 14, paddingBottom: 48 },
  back: { color: colors.link, fontWeight: "700" },
  title: { color: colors.ink, fontSize: 26, fontWeight: "700" },
  subtitle: { color: colors.muted, lineHeight: 21 },
  placeholder: {
    height: 300,
    backgroundColor: colors.peach,
    borderColor: colors.peach,
    borderWidth: 1,
    borderRadius: paperShape.card,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  placeholderIcon: { fontSize: 50, color: colors.link },
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
    borderRadius: paperShape.button,
    justifyContent: "center",
    minHeight: paperControl.height,
    paddingHorizontal: 14,
  },
  primaryText: { color: colors.onPrimary, fontWeight: "700", fontSize: 15 },
  secondary: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    backgroundColor: colors.white,
    borderColor: colors.peach,
    borderWidth: 1,
    borderRadius: paperShape.button,
    justifyContent: "center",
    minHeight: paperControl.height,
    paddingHorizontal: 14,
  },
  secondaryText: { color: colors.link, fontWeight: "700", fontSize: 15 },
  disabled: { opacity: 0.55 },
  progress: { flexDirection: "row", alignItems: "center", gap: 10 },
  progressText: { color: colors.muted, fontWeight: "700" },
  label: { color: colors.ink, fontWeight: "700", marginTop: 4 },
  input: {
    backgroundColor: colors.white,
    borderColor: colors.controlBorder,
    borderWidth: 1,
    borderRadius: paperShape.input,
    minHeight: paperControl.height,
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
    borderColor: colors.primaryOutline,
    borderRadius: 5,
    borderWidth: 2,
    height: 22,
    justifyContent: "center",
    marginTop: 1,
    width: 22,
  },
  checkboxSelected: { backgroundColor: colors.mauve },
  checkmark: { color: colors.onPrimary, fontSize: 14, fontWeight: "900" },
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
