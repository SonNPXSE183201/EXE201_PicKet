import { paperControl , paperShape } from "@/core/theme/paper-foundations";
import { PicketText as Text } from "@/core/ui/picket-text";

import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import * as Crypto from "expo-crypto";
import { ApiError } from "@picket/api-client";
import { Redirect, router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { PicketTextInput as TextInput } from "@/core/ui/picket-text-input";
import { Alert, StyleSheet, View } from "react-native";

import { routes } from "@/core/navigation/routes";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { ChoiceChip, EmptyState, IconButton, PicketScreen, PrimaryAction, TopAppBar } from "@/core/ui/picket-ui";
import { figmaType } from "@picket/design-tokens";
import { Chip, FigmaButton, Skeleton } from "@/core/ui/figma-ui";
import { ManagementEmpty } from "@/features/management/management-ui";
import { KeepsakePolaroid } from "@/features/keepsakes/keepsake-polaroid";
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
  const { colors, styles } = useMobileStyles(createStyles);
  const { session, localMode } = useAuth();
  const [items, setItems] = useState<DisplayKeepsake[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string | null>(null);
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
      if (!permission.granted) { setMessage("Cần quyền thư viện để chọn ảnh món đồ."); return; }
      const result = await picker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, quality: 0.85 });
      if (!result.canceled && result.assets[0]?.uri) setPickedPhotoUri(result.assets[0].uri);
    } catch { setMessage("Không chọn được ảnh. Hãy thử lại."); }
  }
  async function save() {
    if (!editing || busy || (!session && !localMode)) return;
    const amount = Number(fields.amount);
    if (!fields.title.trim() || !Number.isSafeInteger(amount) || amount < 0) { setMessage("Nhập tên và giá trị hợp lệ."); return; }
    const validDate = (value: string) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00`));
    if (!validDate(fields.warrantyUntil) || !validDate(fields.returnUntil)) { setMessage("Ngày phải theo dạng YYYY-MM-DD."); return; }
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
            ? "Đã giữ bản sửa trên điện thoại. Máy chủ chưa chấp nhận; hãy mở lại món đồ để kiểm tra và sửa."
            : "Đã lưu trên điện thoại. Kỷ vật và ảnh đang chờ xác nhận đồng bộ.");
        }
      }
      setEditing(null);
      await reload();
    } catch { setMessage("Không lưu được món đồ. Hãy thử lại."); }
    finally { setBusy(false); }
  }
  function confirmDelete(item: DisplayKeepsake) {
    if (!session && !localMode) return;
    const token = session?.access_token;
    Alert.alert("Xóa món đồ?", keepsakeDeleteMessage(localMode), [
      { text: "Hủy", style: "cancel" },
      { text: "Xóa", style: "destructive", onPress: () => void (async () => {
        try { if (localMode) await deleteKeepsake(item.id, guestOwnerId); else await archiveCloudKeepsake(token!, item); setEditing(null); await reload(); }
        catch { setMessage("Không xóa được món đồ."); }
      })() },
    ]);
  }
  const visible = items.filter((item) => (!filter || item.category === filter) && `${item.title} ${item.category} ${item.note}`.toLocaleLowerCase("vi-VN").includes(query.toLocaleLowerCase("vi-VN")));
  const usedCategories = itemCategories.filter((category) => items.some((item) => item.category === category));
  const collectionState = keepsakeCollectionState(loading, loadFailed, visible.length, query);
  return <PicketScreen>
    <TopAppBar title={editing ? editing === "new" ? "Một món đồ mới" : "Chỉnh sửa món đồ" : "Kỷ vật"} onBack={() => editing ? setEditing(null) : router.back()} backDisabled={busy} action={editing ? undefined : <IconButton icon="plus" label="Thêm món đồ" variant="surface" onPress={() => open("new")} />} />
    <Text style={[figmaType.bodySmall, { color: colors.muted, marginTop: 20 }]}>Những món đáng nhớ bạn đã mua, kèm hoá đơn và bảo hành.</Text>
    <Text style={styles.local}>{localMode ? "Món đồ và ảnh chỉ lưu trên điện thoại này; chưa có bản sao trên cloud." : "Món đồ mới được đồng bộ với tài khoản. Món đồ cũ trên thiết bị sẽ được chuyển lên khi có kết nối."}</Text>
    {message && <Text accessibilityLiveRegion="polite" style={styles.error}>{message}</Text>}
    {editing ? <View style={styles.form}>
      <Text style={styles.label}>Danh mục món đồ</Text><View style={styles.chips}>{itemCategories.map((category) => <ChoiceChip checked={fields.category === category} key={category} label={category} onPress={() => setFields((current) => ({ ...current, category }))} />)}</View>
      {((pickedPhotoUri ?? (editing === "new" ? null : editing.photoUri))) && <KeepsakePhoto owner={session?.user.id ?? guestOwnerId} picked={!!pickedPhotoUri} accessibilityLabel="Ảnh món đồ" uri={pickedPhotoUri ?? (editing === "new" ? "" : editing.photoUri ?? "")} style={styles.photo} />}
      <Pressable accessibilityRole="button" onPress={() => void choosePhoto()} style={styles.photoButton}><Text style={styles.link}>Chọn ảnh món đồ</Text></Pressable>
      <Text style={styles.label}>Tên món đồ</Text><TextInput accessibilityLabel="Tên món đồ" onChangeText={(title) => setFields((current) => ({ ...current, title }))} style={styles.input} value={fields.title} />
      <Text style={styles.label}>Giá trị</Text><TextInput money accessibilityLabel="Giá trị món đồ" keyboardType="numeric" onChangeText={(amount) => setFields((current) => ({ ...current, amount }))} style={styles.input} value={fields.amount} />
      <Text style={styles.label}>Ghi chú</Text><TextInput accessibilityLabel="Ghi chú món đồ" multiline onChangeText={(note) => setFields((current) => ({ ...current, note }))} style={[styles.input, styles.multiline]} value={fields.note} />
      <Text style={styles.label}>Hạn bảo hành</Text><TextInput date accessibilityLabel="Hạn bảo hành" onChangeText={(warrantyUntil) => setFields((current) => ({ ...current, warrantyUntil }))} style={styles.input} value={fields.warrantyUntil} />
      <Text style={styles.label}>Hạn đổi trả</Text><TextInput date accessibilityLabel="Hạn đổi trả" onChangeText={(returnUntil) => setFields((current) => ({ ...current, returnUntil }))} style={styles.input} value={fields.returnUntil} />
      <PrimaryAction busy={busy} label="Lưu món đồ" onPress={() => void save()} />
      {editing !== "new" && <Pressable accessibilityRole="button" onPress={() => confirmDelete(editing)} style={styles.photoButton}><Text style={styles.delete}>Xóa món đồ</Text></Pressable>}
    </View> : <>
      {items.length > 0 && <View style={styles.filters}>
        <Chip label="Tất cả" tone={filter === null ? "neutral" : "outline"} onPress={() => setFilter(null)} />
        {usedCategories.map((category) => <Chip key={category} label={category} tone={filter === category ? "neutral" : "outline"} onPress={() => setFilter(category)} />)}
      </View>}
      {items.length > 0 && <TextInput accessibilityLabel="Tìm món đồ" onChangeText={setQuery} placeholder="Tìm món đồ" style={[styles.input, { marginTop: 12 }]} value={query} />}
      {collectionState === "loading" && <View accessibilityLabel="Đang tải bộ sưu tập" style={styles.polaroids}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} width={144} height={176} radius={6} />)}</View>}
      {collectionState === "error" && <><Text accessibilityLiveRegion="polite" style={styles.error}>Chưa tải được bộ sưu tập.</Text><PrimaryAction label="Thử tải lại" onPress={() => void reload()} /></>}
      {collectionState === "empty" && <ManagementEmpty art="leisure" title="Bộ sưu tập còn trống" body={"Lưu món đồ đáng nhớ cùng hoá đơn\nvà hạn bảo hành."} action={<FigmaButton variant="outline" size="medium" label="Thêm kỷ vật đầu tiên" onPress={() => open("new")} />} />}
      {collectionState === "no-results" && <EmptyState illustration="shopping" title="Không tìm thấy món đồ" description="Thử tên, ghi chú hoặc danh mục khác." />}
      {collectionState === "items" && <View style={styles.polaroids}>{visible.map((item, index) => <KeepsakePolaroid key={item.id} item={item} index={index} onPress={() => open(item)} />)}</View>}
    </>}
  </PicketScreen>;
}

const createStyles = (colors: MobileThemeColors) => StyleSheet.create({
  filters:{flexDirection:"row",flexWrap:"wrap",gap:8,marginTop:20},polaroids:{flexDirection:"row",flexWrap:"wrap",columnGap:12,rowGap:20,paddingTop:6,marginTop:14},
  back:{color:colors.link,fontSize:15,fontWeight:"700",marginBottom:18},heading:{color:colors.ink,fontSize:26,fontWeight:"800"},subtitle:{color:colors.muted,fontSize:15,marginTop:7},local:{color:colors.muted,fontSize:12,lineHeight:18,marginBottom:18,marginTop:8},error:{color:colors.danger,fontSize:14,marginBottom:10},input:{backgroundColor:colors.white,borderColor:colors.controlBorder,borderRadius:paperShape.input,borderWidth:1,color:colors.ink,fontSize:16,minHeight:paperControl.height,paddingHorizontal:14},form:{gap:8},label:{color:colors.ink,fontSize:14,fontWeight:"700",marginTop:8},chips:{flexDirection:"row",flexWrap:"wrap",gap:8},photo:{borderRadius:14,height:220,marginVertical:8,width:"100%"},photoButton:{alignItems:"center",borderColor:colors.primaryOutline,borderRadius:paperShape.button,borderWidth:1,justifyContent:"center",minHeight:52},link:{color:colors.link,fontWeight:"700"},delete:{color:colors.danger,fontWeight:"700"},multiline:{minHeight:90,textAlignVertical:"top"},list:{gap:14,marginTop:18},itemTitle:{color:colors.ink,fontSize:20,fontWeight:"700"},meta:{color:colors.muted,fontSize:13,marginTop:7},
});
