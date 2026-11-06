import { paperControl , paperShape } from "@/core/theme/paper-foundations";
import { PicketText as Text } from "@/core/ui/picket-text";

import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import * as Crypto from "expo-crypto";
import { formatVnd } from "@picket/domain";
import { ApiError } from "@picket/api-client";
import { Redirect, router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { PicketTextInput as TextInput } from "@/core/ui/picket-text-input";
import { ActivityIndicator, Alert, StyleSheet, View } from "react-native";

import { routes } from "@/core/navigation/routes";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { ChoiceChip, EmptyState, PicketScreen, PrimaryAction, Surface, TopAppBar } from "@/core/ui/picket-ui";
import { useAuth } from "@/features/auth/auth-context";
import { archiveCloudKeepsake, loadKeepsakeCollection, saveCloudKeepsake, type DisplayKeepsake } from "@/features/keepsakes/cloud-keepsakes";
import { keepsakeDeleteMessage } from "@/features/keepsakes/delete-copy";
import { KeepsakePendingError } from "@/features/keepsakes/keepsake-media-policy";
import { collectKeepsakePhotoOrphans, deleteKeepsake, listKeepsakes, saveKeepsake } from "@/features/keepsakes/keepsake-store";
import { KeepsakePhoto } from "@/features/keepsakes/keepsake-photo";
import { guestOwnerId } from "@/core/local/guest-finance";
import { keepsakeCollectionState } from "@/features/keepsakes/keepsake-view-policy";

const itemCategories = ["Khác", "Công nghệ", "Trang phục", "Đồ dùng", "Kỷ niệm"];
const blank = { title: "", amount: "0", note: "", category: "Khác", warrantyUntil: "", returnUntil: "" };

export default function KeepsakesScreen() {
  const { t } = useTranslation("common");
  const { colors, styles } = useMobileStyles(createStyles);
  const { session, localMode } = useAuth();
  const [items, setItems] = useState<DisplayKeepsake[]>([]);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<DisplayKeepsake | "new" | null>(null);
  const [fields, setFields] = useState(blank);
  const [pickedPhotoUri, setPickedPhotoUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const loadRevision = useRef(0);
  const reload = useCallback(async () => {
    if (!session && !localMode) return;
    const revision = ++loadRevision.current;
    setLoading(true);
    setLoadFailed(false);
    try {
      const loaded = localMode ? await listKeepsakes(guestOwnerId) : await loadKeepsakeCollection(session!.access_token, session!.user.id);
      if (revision === loadRevision.current) setItems(loaded);
      void collectKeepsakePhotoOrphans(localMode ? guestOwnerId : session!.user.id).catch(() => undefined);
    } catch {
      if (revision === loadRevision.current) setLoadFailed(true);
    } finally {
      if (revision === loadRevision.current) setLoading(false);
    }
  }, [localMode, session]);
  useFocusEffect(useCallback(() => { void reload(); return () => { ++loadRevision.current; }; }, [reload]));
  if (!session && !localMode) return <Redirect href={routes.login} />;

  function open(item: DisplayKeepsake | "new") {
    setEditing(item);
    setFields(item === "new" ? blank : { title:item.title, amount:String(item.amount), note:item.note,
      category:item.category, warrantyUntil:item.warrantyUntil ?? "", returnUntil:item.returnUntil ?? "" });
    setPickedPhotoUri(null);
    setMessage(null);
  }
  async function choosePhoto() {
    try {
      const picker = await import("expo-image-picker");
      const permission = await picker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) { setMessage(t("Cần quyền thư viện để chọn ảnh món đồ.")); return; }
      const result = await picker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, quality: 0.85 });
      if (!result.canceled && result.assets[0]?.uri) setPickedPhotoUri(result.assets[0].uri);
    } catch { setMessage(t("Không chọn được ảnh. Hãy thử lại.")); }
  }
  async function save() {
    if (!editing || busy || (!session && !localMode)) return;
    const amount = Number(fields.amount);
    if (!fields.title.trim() || !Number.isSafeInteger(amount) || amount < 0) { setMessage(t("Nhập tên và giá trị hợp lệ.")); return; }
    const validDate = (value: string) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00`));
    if (!validDate(fields.warrantyUntil) || !validDate(fields.returnUntil)) { setMessage(t("Ngày phải theo dạng YYYY-MM-DD.")); return; }
    setBusy(true);
    setMessage(null);
    try {
      const input = { id: editing === "new" ? Crypto.randomUUID() : editing.id, userId: session?.user.id ?? guestOwnerId,
        title: fields.title.trim(), amount, date: editing === "new" ? new Date().toISOString() : editing.date,
        note: fields.note.trim(), photoUri: editing === "new" ? null : editing.photoUri,
        pickedPhotoUri, category: fields.category, warrantyUntil: fields.warrantyUntil || null,
        returnUntil: fields.returnUntil || null,
        version: editing === "new" ? undefined : editing.version,
        mediaPath: editing === "new" ? null : editing.mediaPath,
        photoUploadRequired: editing === "new" ? undefined : editing.photoUploadRequired };
      if (localMode || (editing !== "new" && !editing.version)) await saveKeepsake(input);
      else {
        try { await saveCloudKeepsake(session!.access_token, session!.user.id, input); }
        catch (error) {
          if (!(error instanceof KeepsakePendingError)) throw error;
          const rejected = error.cause instanceof ApiError && error.cause.status >= 400 && error.cause.status < 500;
          setMessage(rejected
            ? t("Đã giữ bản sửa trên điện thoại. Máy chủ chưa chấp nhận; hãy mở lại món đồ để kiểm tra và sửa.")
            : t("Đã lưu trên điện thoại. Kỷ vật và ảnh đang chờ xác nhận đồng bộ."));
        }
      }
      setEditing(null);
      await reload();
    } catch { setMessage(t("Không lưu được món đồ. Hãy thử lại.")); }
    finally { setBusy(false); }
  }
  function confirmDelete(item: DisplayKeepsake) {
    if (!session && !localMode) return;
    const token = session?.access_token;
    Alert.alert(t("Xóa món đồ?"), t(keepsakeDeleteMessage(localMode)), [
      { text: t("Hủy"), style: "cancel" },
      { text: t("Xóa"), style: "destructive", onPress: () => void (async () => {
        try { if (localMode) await deleteKeepsake(item.id, guestOwnerId); else await archiveCloudKeepsake(token!, item); setEditing(null); await reload(); }
        catch { setMessage(t("Không xóa được món đồ.")); }
      })() },
    ]);
  }
  const visible = items.filter((item) => `${item.title} ${item.category} ${item.note}`.toLocaleLowerCase("vi-VN").includes(query.toLocaleLowerCase("vi-VN")));
  const collectionState = keepsakeCollectionState(loading, loadFailed, visible.length, query);
  return <PicketScreen>
    <TopAppBar title={editing ? editing === "new" ? t("Một món đồ mới") : t("Chỉnh sửa món đồ") : t("Bộ sưu tập")} onBack={() => editing ? setEditing(null) : router.back()} backDisabled={busy} />
    <Text style={styles.subtitle}>{t("Một món đồ. Một câu chuyện. Chỉ riêng bạn.")}</Text>
    <Text style={styles.local}>{localMode ? t("Món đồ và ảnh chỉ lưu trên điện thoại này; chưa có bản sao trên cloud.") : t("Món đồ mới được đồng bộ với tài khoản. Món đồ cũ trên thiết bị sẽ được chuyển lên khi có kết nối.")}</Text>
    {message && <Text accessibilityLiveRegion="polite" style={styles.error}>{message}</Text>}
    {editing ? <View style={styles.form}>
      <Text style={styles.label}>{t("Danh mục món đồ")}</Text><View style={styles.chips}>{itemCategories.map((category) => <ChoiceChip checked={fields.category === category} key={category} label={t(category)} onPress={() => setFields((current) => ({ ...current, category }))} />)}</View>
      {((pickedPhotoUri ?? (editing === "new" ? null : editing.photoUri))) && <KeepsakePhoto owner={session?.user.id ?? guestOwnerId} picked={!!pickedPhotoUri} accessibilityLabel={t("Ảnh món đồ")} uri={pickedPhotoUri ?? (editing === "new" ? "" : editing.photoUri ?? "")} style={styles.photo} />}
      <Pressable accessibilityRole="button" onPress={() => void choosePhoto()} style={styles.photoButton}><Text style={styles.link}>{t("Chọn ảnh món đồ")}</Text></Pressable>
      <Text style={styles.label}>{t("Tên món đồ")}</Text><TextInput accessibilityLabel={t("Tên món đồ")} onChangeText={(title) => setFields((current) => ({ ...current, title }))} style={styles.input} value={fields.title} />
      <Text style={styles.label}>{t("Giá trị")}</Text><TextInput money accessibilityLabel={t("Giá trị món đồ")} keyboardType="numeric" onChangeText={(amount) => setFields((current) => ({ ...current, amount }))} style={styles.input} value={fields.amount} />
      <Text style={styles.label}>{t("Ghi chú")}</Text><TextInput accessibilityLabel={t("Ghi chú món đồ")} multiline onChangeText={(note) => setFields((current) => ({ ...current, note }))} style={[styles.input, styles.multiline]} value={fields.note} />
      <Text style={styles.label}>{t("Hạn bảo hành")}</Text><TextInput date accessibilityLabel={t("Hạn bảo hành")} onChangeText={(warrantyUntil) => setFields((current) => ({ ...current, warrantyUntil }))} style={styles.input} value={fields.warrantyUntil} />
      <Text style={styles.label}>{t("Hạn đổi trả")}</Text><TextInput date accessibilityLabel={t("Hạn đổi trả")} onChangeText={(returnUntil) => setFields((current) => ({ ...current, returnUntil }))} style={styles.input} value={fields.returnUntil} />
      <PrimaryAction busy={busy} label={t("Lưu món đồ")} onPress={() => void save()} />
      {editing !== "new" && <Pressable accessibilityRole="button" onPress={() => confirmDelete(editing)} style={styles.photoButton}><Text style={styles.delete}>{t("Xóa món đồ")}</Text></Pressable>}
    </View> : <>
      <TextInput accessibilityLabel={t("Tìm món đồ")} onChangeText={setQuery} placeholder={t("Tìm món đồ")} style={styles.input} value={query} />
      <PrimaryAction label={t("+ Thêm món đồ")} onPress={() => open("new")} />
      {collectionState === "loading" && <ActivityIndicator accessibilityLabel={t("Đang tải bộ sưu tập")} color={colors.link} />}
      {collectionState === "error" && <><Text accessibilityLiveRegion="polite" style={styles.error}>{t("Chưa tải được bộ sưu tập.")}</Text><PrimaryAction label={t("Thử tải lại")} onPress={() => void reload()} /></>}
      {collectionState === "empty" && <EmptyState illustration="gift" title={t("Góc kỷ niệm còn trống")} description={t("Thêm món đồ hoặc câu chuyện đầu tiên.")} />}
      {collectionState === "no-results" && <EmptyState illustration="shopping" title={t("Không tìm thấy món đồ")} description={t("Thử tên, ghi chú hoặc danh mục khác.")} />}
      {collectionState === "items" && <View style={styles.list}>{visible.map((item) => <Pressable accessibilityRole="button" key={item.id} onPress={() => open(item)}><Surface>{item.photoUri && <KeepsakePhoto owner={item.userId} accessibilityLabel={t("Ảnh {{title}}", { title: item.title })} uri={item.photoUri} style={styles.photo} />}<Text style={styles.itemTitle}>{item.title}</Text><Text style={styles.meta}>{formatVnd(item.amount)} · {new Date(item.date).toLocaleDateString("vi-VN")} · {t(item.category)}</Text>{item.warrantyUntil && <Text style={styles.meta}>{t("Bảo hành đến {{date}}", { date: item.warrantyUntil })}</Text>}{item.returnUntil && <Text style={styles.meta}>{t("Đổi trả đến {{date}}", { date: item.returnUntil })}</Text>}</Surface></Pressable>)}</View>}
    </>}
  </PicketScreen>;
}

const createStyles = (colors: MobileThemeColors) => StyleSheet.create({
  back:{color:colors.link,fontSize:15,fontWeight:"700",marginBottom:18},heading:{color:colors.ink,fontSize:26,fontWeight:"800"},subtitle:{color:colors.muted,fontSize:15,marginTop:7},local:{color:colors.expense,fontSize:12,lineHeight:18,marginBottom:18,marginTop:8},error:{color:colors.danger,fontSize:14,marginBottom:10},input:{backgroundColor:colors.white,borderColor:colors.controlBorder,borderRadius:paperShape.input,borderWidth:1,color:colors.ink,fontSize:16,minHeight:paperControl.height,paddingHorizontal:14},form:{gap:8},label:{color:colors.ink,fontSize:14,fontWeight:"700",marginTop:8},chips:{flexDirection:"row",flexWrap:"wrap",gap:8},photo:{borderRadius:14,height:220,marginVertical:8,width:"100%"},photoButton:{alignItems:"center",borderColor:colors.primaryOutline,borderRadius:paperShape.button,borderWidth:1,justifyContent:"center",minHeight:52},link:{color:colors.link,fontWeight:"700"},delete:{color:colors.danger,fontWeight:"700"},multiline:{minHeight:90,textAlignVertical:"top"},list:{gap:14,marginTop:18},itemTitle:{color:colors.ink,fontSize:20,fontWeight:"700"},meta:{color:colors.muted,fontSize:13,marginTop:7},
});
