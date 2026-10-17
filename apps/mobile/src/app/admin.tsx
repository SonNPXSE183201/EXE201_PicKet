import { colors } from "@picket/design-tokens";
import type { AdminUserActionRequest } from "@picket/domain";
import { Redirect, router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { PicketTextInput as TextInput } from "@/core/ui/picket-text-input";
import { Alert, StyleSheet, Switch, Text, View } from "react-native";

import { routes } from "@/core/navigation/routes";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { TopAppBar, ChoiceChip, EmptyState, PicketScreen, PrimaryAction, SectionTitle, Surface } from "@/core/ui/picket-ui";
import { useAuth } from "@/features/auth/auth-context";
import {
  isSafeHttpsUrl, isStaff, loadStaffLedger, loadStaffOverview,
  performStaffAction, savePartnerAd, saveStaffSettings,
  type StaffOverview,
} from "@/features/admin/admin-mobile";

type Tab = "users" | "ocr" | "partners" | "settings" | "audit";
const tabs: Array<[Tab, string]> = [["users", "Người dùng"], ["ocr", "OCR"], ["partners", "Đối tác"], ["settings", "Cài đặt"], ["audit", "Nhật ký"]];
const emptyAd = { id: null as string | null, title: "", body: "", url: "", active: false };

export default function AdminScreen() {
  const { session } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [overview, setOverview] = useState<StaffOverview | null>(null);
  const [page, setPage] = useState(0);
  const [tab, setTab] = useState<Tab>("users");
  const [search, setSearch] = useState("");
  const [maskEmail, setMaskEmail] = useState(true);
  const [maintenance, setMaintenance] = useState(false);
  const [notice, setNotice] = useState("");
  const [ad, setAd] = useState<typeof emptyAd | null>(null);
  const [ledger, setLedger] = useState<{ title?: string; date?: string; category?: string; amount?: number }[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const reload = useCallback(async () => {
    if (!session) return;
    setBusy(true);
    try {
      const staff = await isStaff();
      setAllowed(staff);
      if (!staff) return;
      const next = await loadStaffOverview(page);
      setOverview(next);
      setMaintenance(next.settings.maintenance);
      setNotice(next.settings.notice);
      setMessage(null);
    } catch { setMessage("Không tải được quản trị. Kiểm tra mạng và quyền nhân viên."); }
    finally { setBusy(false); }
  }, [page, session]);
  useEffect(() => {
    const timer = setTimeout(() => { void reload(); }, 0);
    return () => clearTimeout(timer);
  }, [reload]);

  if (!session) return <Redirect href={routes.login} />;
  const users = overview?.users.filter((user) => `${user.email} ${user.id}`.toLowerCase().includes(search.toLowerCase())) ?? [];
  const userAction = (userId: string, request: AdminUserActionRequest, label: string) => {
    Alert.alert("Xác nhận quản trị", `${label} cho tài khoản ${userId}? Thao tác sẽ được ghi vào nhật ký.`, [
      { text: "Hủy", style: "cancel" },
      { text: "Xác nhận", style: "destructive", onPress: () => void (async () => {
        setBusy(true);
        try { await performStaffAction(session.access_token, userId, request); await reload(); setMessage("Đã hoàn thành thao tác quản trị."); }
        catch { setMessage("Không thực hiện được thao tác quản trị."); }
        finally { setBusy(false); }
      })() },
    ]);
  };
  async function viewLedger(userId: string) {
    setBusy(true);
    try { setLedger((await loadStaffLedger(userId))?.entries ?? []); }
    catch { setMessage("Không đọc được sổ đã đồng bộ."); }
    finally { setBusy(false); }
  }
  async function persistSettings() {
    setBusy(true);
    try { await saveStaffSettings(maintenance, notice); await reload(); setMessage("Đã lưu cài đặt hệ thống."); }
    catch { setMessage("Không lưu được cài đặt."); }
    finally { setBusy(false); }
  }
  async function persistAd() {
    if (!ad) return;
    if (!isSafeHttpsUrl(ad.url)) return setMessage("Liên kết đối tác phải là HTTPS hợp lệ.");
    setBusy(true);
    try { await savePartnerAd(ad); setAd(null); await reload(); setMessage("Đã lưu nội dung đối tác."); }
    catch { setMessage("Không lưu được nội dung đối tác."); }
    finally { setBusy(false); }
  }
  return <PicketScreen>
    <TopAppBar title="Quản trị Picket" />
    {busy && <Text accessibilityLiveRegion="polite" style={styles.muted}>Đang xử lý…</Text>}
    {message && <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text>}
    {allowed === false ? <EmptyState title="Không có quyền quản trị" description="Màn hình này chỉ dành cho nhân viên Picket." /> : !overview ?
      <EmptyState title="Đang tải quản trị" description="Dữ liệu chỉ mở khi máy chủ xác nhận quyền nhân viên." action="Thử lại" onAction={() => void reload()} /> : <>
      <View style={styles.tabs}>{tabs.map(([value, label]) => <ChoiceChip checked={tab === value} key={value} label={label} onPress={() => setTab(value)} />)}</View>
      {tab === "users" && <>
        <Surface peach><Text style={styles.title}>{overview.total_users} tài khoản · {overview.total_ledgers} sổ legacy</Text></Surface>
        <TextInput accessibilityLabel="Tìm tài khoản trong trang" onChangeText={setSearch} placeholder="Tìm email hoặc ID trong trang" style={styles.input} value={search} />
        <View style={styles.row}><Text style={styles.title}>Che email</Text><Switch accessibilityLabel="Che email" hitSlop={12} onValueChange={setMaskEmail} value={maskEmail} /></View>
        {users.map((user) => <Surface key={user.id}>
          <Text style={styles.title}>{maskEmail ? `Tài khoản ${user.id.slice(0, 8)}` : user.email}</Text>
          <Text style={styles.muted}>{user.entry_count} giao dịch · {new Date(user.created_at).toLocaleDateString("vi-VN")}</Text>
          <Text style={styles.muted}>{user.banned_until && new Date(user.banned_until) > new Date() ? "Đã khóa" : "Hoạt động"} · revision {user.revision ?? "—"}</Text>
          <View style={styles.actions}>
            <ChoiceChip checked={false} label="Xem sổ" onPress={() => void viewLedger(user.id)} />
            {user.banned_until && new Date(user.banned_until) > new Date() ?
              <ChoiceChip checked={false} label="Mở khóa" onPress={() => userAction(user.id, { action:"restore", confirmation:"RESTORE" }, "Mở khóa")} /> :
              <ChoiceChip checked={false} label="Tạm khóa" onPress={() => userAction(user.id, { action:"suspend", confirmation:"SUSPEND" }, "Tạm khóa")} />}
            <ChoiceChip checked={false} label="Đặt lại mật khẩu" onPress={() => userAction(user.id, { action:"reset_password", confirmation:"RESET" }, "Gửi email đặt lại mật khẩu")} />
            {(["free", "plus", "pro"] as const).map((tier) => <ChoiceChip checked={false} key={tier} label={tier === "free" ? "Thu hồi ưu đãi" : `Tặng ${tier.toUpperCase()} 30 ngày`} onPress={() => userAction(user.id, { action:"grant_plan", confirmation:"GRANT", tier }, `Đổi ưu đãi ${tier}`)} />)}
          </View>
        </Surface>)}
        <View style={styles.row}><Pressable accessibilityRole="button" disabled={page === 0 || busy} onPress={() => setPage((value) => value - 1)}><Text style={styles.link}>Trang trước</Text></Pressable><Text>Trang {page + 1}</Text><Pressable accessibilityRole="button" disabled={overview.users.length < 25 || busy} onPress={() => setPage((value) => value + 1)}><Text style={styles.link}>Trang sau</Text></Pressable></View>
      </>}
      {tab === "ocr" && <><SectionTitle title="OCR trong 30 ngày" /><Text style={styles.muted}>Chỉ thống kê lượt và thời gian, không hiển thị ảnh hoặc nội dung hóa đơn.</Text>{overview.ocr.map((row) => <Surface key={row.day}><Text style={styles.title}>{new Date(row.day).toLocaleDateString("vi-VN")}</Text><Text style={styles.muted}>{row.successful}/{row.scans} thành công · trung bình {row.average_ms} ms</Text></Surface>)}</>}
      {tab === "partners" && <>
        <PrimaryAction label="Thêm nội dung đối tác" onPress={() => setAd({ ...emptyAd })} />
        {overview.ads.map((item) => <Pressable accessibilityRole="button" key={item.id} onPress={() => setAd({ id:item.id, title:item.title, body:item.body, url:item.url, active:item.active })}><Surface><Text style={styles.title}>{item.title}</Text><Text style={styles.muted}>{item.active ? "Đang hiển thị" : "Đang ẩn"} · {item.url}</Text></Surface></Pressable>)}
        {ad && <Surface><SectionTitle title={ad.id ? "Sửa nội dung đối tác" : "Nội dung đối tác mới"} />
          <TextInput accessibilityLabel="Tiêu đề đối tác" maxLength={120} onChangeText={(title) => setAd((value) => value && ({ ...value, title }))} placeholder="Tiêu đề" style={styles.input} value={ad.title} />
          <TextInput accessibilityLabel="Nội dung đối tác" maxLength={500} multiline onChangeText={(body) => setAd((value) => value && ({ ...value, body }))} placeholder="Nội dung" style={styles.input} value={ad.body} />
          <TextInput accessibilityLabel="Liên kết HTTPS đối tác" autoCapitalize="none" keyboardType="url" onChangeText={(url) => setAd((value) => value && ({ ...value, url }))} placeholder="https://…" style={styles.input} value={ad.url} />
          <View style={styles.row}><Text style={styles.title}>Hiển thị</Text><Switch accessibilityLabel="Hiển thị nội dung đối tác" hitSlop={12} onValueChange={(active) => setAd((value) => value && ({ ...value, active }))} value={ad.active} /></View>
          <PrimaryAction busy={busy} label="Lưu nội dung" onPress={() => void persistAd()} />
          <Pressable accessibilityRole="button" onPress={() => setAd(null)}><Text style={styles.link}>Hủy</Text></Pressable>
        </Surface>}
      </>}
      {tab === "settings" && <Surface><View style={styles.row}><View style={styles.flex}><Text style={styles.title}>Bảo trì đồng bộ</Text><Text style={styles.muted}>Tạm dừng ghi lên máy chủ.</Text></View><Switch accessibilityLabel="Bảo trì đồng bộ" hitSlop={12} onValueChange={setMaintenance} value={maintenance} /></View><TextInput accessibilityLabel="Thông báo hệ thống" maxLength={1000} multiline onChangeText={setNotice} placeholder="Thông báo cho người dùng" style={styles.input} value={notice} /><PrimaryAction busy={busy} label="Lưu cài đặt" onPress={() => void persistSettings()} /></Surface>}
      {tab === "audit" && <><SectionTitle title="Nhật ký quản trị" />{overview.audit.map((item, index) => <Surface key={`${item.created_at}-${index}`}><Text style={styles.title}>{item.action}</Text><Text style={styles.muted}>{item.target ?? "Không có đối tượng"} · {new Date(item.created_at).toLocaleString("vi-VN")}</Text></Surface>)}</>}
      {ledger && <Surface peach><SectionTitle title="Giao dịch đã đồng bộ" /><Text style={styles.muted}>Lượt xem này được ghi vào nhật ký quản trị.</Text>{ledger.map((item, index) => <View key={index} style={styles.row}><View style={styles.flex}><Text style={styles.title}>{item.title ?? "Giao dịch"}</Text><Text style={styles.muted}>{item.date ?? ""} · {item.category ?? ""}</Text></View><Text>{item.amount ?? 0} đ</Text></View>)}<Pressable accessibilityRole="button" onPress={() => setLedger(null)}><Text style={styles.link}>Đóng</Text></Pressable></Surface>}
      <Pressable accessibilityRole="button" onPress={() => void reload()}><Text style={styles.link}>Tải lại dữ liệu quản trị</Text></Pressable>
    </>}
  </PicketScreen>;
}

const styles = StyleSheet.create({ heading:{color:colors.ink,fontSize:29,fontWeight:"800",marginVertical:14},tabs:{flexDirection:"row",flexWrap:"wrap",gap:8,marginBottom:14},title:{color:colors.ink,fontSize:15,fontWeight:"800"},muted:{color:colors.muted,fontSize:13,lineHeight:20,marginTop:4},message:{color:colors.expense,fontSize:13,marginBottom:12},link:{color:colors.mauve,fontSize:14,fontWeight:"800",marginVertical:12},input:{backgroundColor:colors.white,borderColor:colors.peach,borderRadius:12,borderWidth:1,color:colors.ink,fontSize:15,minHeight:50,marginVertical:8,paddingHorizontal:14},row:{alignItems:"center",flexDirection:"row",justifyContent:"space-between",gap:12,minHeight:52},flex:{flex:1},actions:{flexDirection:"row",flexWrap:"wrap",gap:8,marginTop:12} });
