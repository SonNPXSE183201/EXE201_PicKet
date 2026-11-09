import { PicketScrollView as ScrollView } from "@/core/ui/picket-scroll-view";
import { PicketText as Text } from "@/core/ui/picket-text";

import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
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
import { ReceiptCamera } from "@/features/capture/capture-camera";
import { CaptureReading } from "@/features/capture/capture-reading";
import { receiptArt } from "@/features/capture/capture-art";
import { figmaType } from "@picket/design-tokens";
import { Chip, Overline, ReceiptDivider, ReceiptSheet, figmaShadow } from "@/core/ui/figma-ui";
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

  if (isRecognizing) return <CaptureReading statusLabel="Đang đọc hóa đơn…" onCancel={() => { pollingController.current?.abort(); localOcrController.current?.abort(); router.replace("/transactions/new"); }} />;

  const reviewCount = (currencyWarning ? 1 : 0) + (hasObservedDate ? 0 : 1) + (needsFallback ? 1 : 0);
  const busyAny = isRecognizing || isContinuing || isQueueingFallback;
  const pinnedPhoto = imageUri ? (
    <Image
      key={imageUri}
      accessibilityLabel="Ảnh hóa đơn đang được kiểm tra"
      source={{ uri: imageUri }}
      style={receiptEligible ? styles.pinnedImage : styles.bigImage}
      resizeMode="cover"
    />
  ) : <Image accessible={false} source={receiptArt} style={receiptEligible ? styles.pinnedArt : styles.bigArt} resizeMode="contain" />;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <TopAppBar title="Kiểm tra hoá đơn" />

        {!receiptEligible && (
          <View style={styles.notReceipt}>
            <View style={styles.bigPhoto}>{pinnedPhoto}</View>
            <View style={styles.tape} />
          </View>
        )}

        {message && <Text accessibilityLiveRegion="polite" role="alert" style={[figmaType.bodySmall, styles.message, !receiptEligible && styles.centerText]}>{message}</Text>}

        {!receiptEligible && (
          <>
            <ReceiptSheet style={styles.tips}>
              <Overline>Mẹo chụp lại</Overline>
              {["Đặt trọn tờ hoá đơn trong khung", "Đủ sáng, tránh bóng loá", "Giữ máy thẳng, không nghiêng"].map((tip) => (
                <View key={tip} style={styles.tip}>
                  <View style={styles.tipCheck}><AppIcon name="check" size={14} color={colors.success} /></View>
                  <Text style={[figmaType.bodySmall, { color: colors.text, flex: 1 }]}>{tip}</Text>
                </View>
              ))}
            </ReceiptSheet>
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: busyAny }}
                disabled={busyAny}
                onPress={() => { pollingController.current?.abort(); setCameraOpen(true); }}
                style={[styles.primary, busyAny && styles.disabled]}
              >
                <AppIcon name="camera-outline" size={20} color={colors.onPrimary} /><Text style={styles.primaryText}>Chụp lại</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: busyAny }}
                disabled={busyAny}
                onPress={() => void choose("library")}
                style={[styles.secondary, busyAny && styles.disabled]}
              >
                <AppIcon name="image-outline" size={20} color={colors.primary} /><Text style={styles.secondaryText}>Chọn từ thư viện</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => router.replace("/transactions/new")} style={styles.textButton}>
                <Text style={styles.secondaryText}>Nhập tay thay vì chụp</Text>
              </Pressable>
            </View>
          </>
        )}

        {currencyWarning && <Text role="alert" style={[figmaType.bodySmall, styles.message]}>{currencyWarning}</Text>}
        {receiptEligible && <>
        <View style={styles.intro}>
          {reviewCount > 0 && <Chip tone="warning" label={`${reviewCount} thông tin cần kiểm tra`} />}
          <Text style={[figmaType.bodySmall, { color: colors.muted }]}>Picket đã đọc xong. Xem lại một lượt trước khi lưu nhé.</Text>
        </View>

        <View style={styles.sheetWrap}>
        <ReceiptSheet style={styles.sheet}>
        <View style={styles.storeBlock}>
        <Text style={[figmaType.bodySmall, styles.fieldLabel]}>Tên cửa hàng / nội dung</Text>
        <TextInput
          accessibilityLabel="Tên cửa hàng hoặc nội dung hóa đơn"
          editable={receiptEligible}
          value={title}
          onChangeText={setTitle}
          placeholder="Ví dụ: Cà phê sáng"
          placeholderTextColor={colors.muted}
          style={styles.storeInput}
        />
        <Text style={[figmaType.bodySmall, styles.fieldLabel, currencyWarning && { color: colors.warning }]}>{currencyWarning ? "Số tiền đọc được (chưa xác nhận tiền tệ)" : "Tổng tiền (VND)"}</Text>
        <TextInput money
          accessibilityLabel="Tổng tiền hóa đơn"
          editable={receiptEligible}
          value={amount}
          onChangeText={setAmount}
          keyboardType="number-pad"
          placeholder="Ví dụ: 45000"
          placeholderTextColor={colors.muted}
          style={styles.amountInput}
        />
        </View>
        <ReceiptDivider />
        <Text style={[figmaType.bodySmall, styles.fieldLabel, !hasObservedDate && { color: colors.warning }]}>{typeof hasObservedDate === "boolean" && !hasObservedDate ? "Ngày hóa đơn (chưa đọc được trên ảnh — tạm điền hôm nay)" : "Ngày hóa đơn"}</Text>
        <TextInput date accessibilityLabel="Ngày hóa đơn" value={calendarReceiptDay({ purchasedAt }) ?? ""} onChangeText={(day) => { explicitDate.current = receiptCalendarDate(day); setHasObservedDate(Boolean(explicitDate.current)); setPurchasedAt(receiptCaptureDate(day, null)); }} style={[styles.input, !hasObservedDate && styles.inputWarning]} />
        <ReceiptDivider />

        {__DEV__ && ocrDurationMs !== null && (
          <Text style={figmaType.bodySmall}>Thời gian OCR: {ocrDurationMs} ms</Text>
        )}
        <Overline>Món trong hoá đơn</Overline>
        {lineItems.length > 0 && (
          <Text style={[figmaType.bodySmall, { color: colors.muted }]}>
            {lineItems.length} sản phẩm
          </Text>
        )}

        {lineItems.map((item, index) => (
          <View key={`${index}-${item.name}`} style={styles.item}>
            <View style={styles.itemRow}>
              <Text style={[figmaType.bodyStrong, { color: colors.text, flex: 1 }]}>{item.name}</Text>
              <Text style={[figmaType.amountRow, { color: colors.text }]}>{currencyWarning ? String(item.total) : formatMoney(item.total, "vi", "VND")}</Text>
            </View>
            <Text style={[figmaType.bodySmall, { color: colors.muted }]}>Số lượng: {item.quantity} · Đơn giá: {currencyWarning ? String(item.unitPrice) : formatMoney(item.unitPrice, "vi", "VND")}</Text>
            {item.confidence < 0.7 && <Text style={[figmaType.bodySmall, { color: colors.warning }]}>Số lượng hoặc đơn giá chưa chắc chắn. Hãy đối chiếu ảnh.</Text>}
          </View>
        ))}
        {lineItems.length === 0 && <Text style={[figmaType.bodySmall, { color: colors.muted }]}>Chưa đọc được chi tiết sản phẩm.</Text>}
        </ReceiptSheet>
        <View style={styles.pinned}>{pinnedPhoto}</View>
        <View style={styles.tapeSmall} />
        </View>

        {serverFallbackEnabled && receiptEligible && !localMode && needsFallback && !["completed", "failed", "cancelled", "expired"].includes(fallbackStatus ?? "") && (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ busy: isQueueingFallback, disabled: isRecognizing || isQueueingFallback }}
            disabled={isRecognizing || isQueueingFallback}
            onPress={confirmServerFallback}
            style={[styles.advanced, (isRecognizing || isQueueingFallback) && styles.disabled]}
          >
            <AppIcon name="shimmer" size={16} color={colors.primary} />
            <Text style={[figmaType.captionStrong, { color: colors.primary }]}>
              {isQueueingFallback
                ? "Đang tạo yêu cầu…"
                : "Đọc chưa đúng? Nhận diện nâng cao (cần mạng)"}
            </Text>
          </Pressable>
        )}
        {fallbackStatus && (
          <Text style={[figmaType.bodySmall, { color: colors.muted }]}>{fallbackStatus === "completed" ? "Đã nhận diện xong" : fallbackStatus === "failed" || fallbackStatus === "expired" ? "Chưa nhận diện được, bạn có thể nhập tay" : "Đang nhận diện nâng cao…"}</Text>
        )}

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: busyAny }}
            disabled={busyAny}
            onPress={() => { pollingController.current?.abort(); setCameraOpen(true); }}
            style={[styles.secondary, busyAny && styles.disabled]}
          >
            <AppIcon name="camera-outline" size={20} color={colors.primary} /><Text style={styles.secondaryText}>Chụp lại</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: busyAny }}
            disabled={busyAny}
            onPress={() => void choose("library")}
            style={[styles.secondary, busyAny && styles.disabled]}
          >
            <AppIcon name="image-outline" size={20} color={colors.primary} /><Text style={styles.secondaryText}>Chọn từ thư viện</Text>
          </Pressable>
        </View>

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
            <Text style={[figmaType.bodyStrong, { color: colors.text }]}>Đính kèm ảnh vào giao dịch</Text>
            <Text style={[figmaType.bodySmall, { color: colors.muted }]}>
              Chỉ tải ảnh khi bạn lưu giao dịch.
            </Text>
          </View>
        </Pressable>}
        </>}
      </ScrollView>
      {receiptEligible && (
        <View style={styles.sticky}>
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
        </View>
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: MobileThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { maxWidth: 720, width: "100%", alignSelf: "center", paddingHorizontal: 20, paddingTop: 8, gap: 20, paddingBottom: 124 },
  centerText: { textAlign: "center" },
  intro: { gap: 6, alignItems: "flex-start" },
  notReceipt: { height: 262, alignItems: "center", marginTop: 4 },
  bigPhoto: { width: 200, height: 250, marginTop: 10, borderRadius: 8, padding: 8, backgroundColor: colors.paper, transform: [{ rotate: "3deg" }], ...figmaShadow("paper") },
  bigImage: { flex: 1, borderRadius: 4, backgroundColor: colors.elevated },
  bigArt: { flex: 1, borderRadius: 4, backgroundColor: colors.elevated },
  tape: { position: "absolute", top: -2, alignSelf: "center", width: 54, height: 16, borderRadius: 3, backgroundColor: colors.pocketCoral, transform: [{ rotate: "-4deg" }] },
  tips: { gap: 12, backgroundColor: colors.surface },
  tip: { flexDirection: "row", alignItems: "center", gap: 10 },
  tipCheck: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.successSurface, alignItems: "center", justifyContent: "center" },
  sheetWrap: { paddingTop: 14 },
  sheet: { gap: 8, paddingHorizontal: 16, paddingTop: 18, paddingBottom: 14 },
  storeBlock: { gap: 2, paddingRight: 80 },
  fieldLabel: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  storeInput: { ...figmaType.titleSection, color: colors.text, paddingVertical: 0, minHeight: 28 },
  amountInput: { ...figmaType.amountHero, color: colors.text, paddingVertical: 0, minHeight: 42 },
  pinned: { position: "absolute", top: -7, right: 8, width: 91, height: 114, padding: 5, paddingBottom: 14, borderRadius: 6, backgroundColor: colors.paper, transform: [{ rotate: "-5deg" }], ...figmaShadow("paper") },
  pinnedImage: { width: 72, height: 88, borderRadius: 3, backgroundColor: colors.elevated },
  pinnedArt: { width: 72, height: 88, borderRadius: 3, backgroundColor: colors.elevated },
  tapeSmall: { position: "absolute", top: -6, right: 40, width: 46, height: 14, backgroundColor: colors.pocketCoral, transform: [{ rotate: "10deg" }] },
  item: { gap: 2 },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  actions: { gap: 8 },
  primary: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 24,
    justifyContent: "center",
    height: 48,
    paddingLeft: 16,
    paddingRight: 20,
  },
  primaryText: { ...figmaType.button, color: colors.onPrimary },
  secondary: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    backgroundColor: colors.selectedSurface,
    borderRadius: 24,
    justifyContent: "center",
    height: 40,
    paddingHorizontal: 16,
  },
  secondaryText: { ...figmaType.button, color: colors.primary },
  textButton: { alignItems: "center", justifyContent: "center", height: 40 },
  disabled: { opacity: 0.55 },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 44,
    paddingHorizontal: 12,
    ...figmaType.bodyStrong,
    color: colors.text,
  },
  inputWarning: { backgroundColor: colors.warningSurface, borderColor: colors.warningSurface },
  message: { color: colors.text },
  advanced: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start" },
  consent: {
    alignItems: "flex-start",
    backgroundColor: colors.paper,
    borderRadius: 18,
    flexDirection: "row",
    gap: 12,
    padding: 14,
    ...figmaShadow("paper"),
  },
  checkbox: {
    alignItems: "center",
    borderColor: colors.primary,
    borderRadius: 6,
    borderWidth: 2,
    height: 22,
    justifyContent: "center",
    marginTop: 1,
    width: 22,
  },
  checkboxSelected: { backgroundColor: colors.primary },
  checkmark: { color: colors.onPrimary, fontSize: 14, fontWeight: "800" },
  consentCopy: { flex: 1 },
  sticky: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: colors.canvas, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 },
});
