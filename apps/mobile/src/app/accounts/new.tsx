import { paperControl , paperShape } from "@/core/theme/paper-foundations";
import { PicketText as Text } from "@/core/ui/picket-text";

import { useManagementCopy } from "@/core/i18n/use-management-copy";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { TopAppBar , PicketScreen, Surface } from "@/core/ui/picket-ui";
import type { AccountKind } from "@picket/domain";
import { Redirect, router } from "expo-router";
import { useState } from "react";
import { PicketTextInput as TextInput } from "@/core/ui/picket-text-input";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { routes } from "@/core/navigation/routes";
import { isOfflineQueuedError } from "@/core/sync/offline-queued-error";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { AppIcon, type IconName } from "@/core/ui/app-icon";
import { useAccounts } from "@/features/accounts/accounts-context";
import { useAuth } from "@/features/auth/auth-context";

const kinds: { value: AccountKind; label: string; symbol: IconName }[] = [
  { value: "cash", label: "Tiền mặt", symbol: "cash-multiple" },
  { value: "bank", label: "Ngân hàng", symbol: "bank-outline" },
  { value: "ewallet", label: "Ví điện tử", symbol: "wallet-outline" },
  { value: "other", label: "Khác", symbol: "dots-horizontal-circle-outline" },
];

export default function NewAccountScreen() {
  const tx=useManagementCopy();
  const { colors, styles } = useMobileStyles(createStyles);
  const { session, localMode } = useAuth();
  const { create } = useAccounts();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<AccountKind>("cash");
  const [currencyCode, setCurrencyCode] = useState("VND");
  const [openingBalance, setOpeningBalance] = useState("0");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  if (!session && !localMode) return <Redirect href={routes.login} />;
  async function submit() {
    if (!name.trim()) { setMessage("Hãy nhập tên tài khoản."); return; }
    if (!/^\d+$/.test(openingBalance)) { setMessage("Số dư chưa hợp lệ."); return; }
    if (!/^[A-Z]{3}$/.test(currencyCode)) { setMessage("Mã tiền tệ phải gồm 3 chữ cái."); return; }
    setBusy(true); setMessage(null);
    try { await create({ name: name.trim(), kind, currencyCode, openingBalance: Number.parseInt(openingBalance, 10) }); router.replace(routes.home); }
    catch (caught) { if (isOfflineQueuedError(caught)) { router.replace(routes.home); return; } setMessage("Không tạo được tài khoản. Hãy kiểm tra kết nối và thử lại."); }
    finally { setBusy(false); }
  }
  return <PicketScreen>
    <TopAppBar illustration="home" title={tx("Thêm tài khoản")} subtitle={tx("Gom tiền mặt, ngân hàng và ví điện tử vào cùng một nơi.")} backDisabled={busy} />
    <Surface>
      <Text style={styles.label}>{tx("Tên tài khoản")}</Text><TextInput accessibilityLabel={tx("Tên tài khoản")} autoCapitalize="words" onChangeText={setName} placeholder={tx("Ví dụ: Ví hàng ngày")} placeholderTextColor={colors.muted} style={styles.input} value={name} />
      <Text style={styles.label}>{tx("Loại tài khoản")}</Text><View accessibilityRole="radiogroup" style={styles.kindGrid}>{kinds.map((item) => { const selected=kind===item.value; return <Pressable accessibilityRole="radio" accessibilityState={{checked:selected}} key={item.value} onPress={() => setKind(item.value)} style={[styles.kind,selected&&styles.kindSelected]}><AppIcon name={item.symbol} color={selected ? colors.white : colors.mauve} size={24} /><Text style={[styles.kindLabel,selected&&styles.kindSelectedText]}>{tx(item.label)}</Text></Pressable>; })}</View>
      <View style={styles.twoColumns}><View style={styles.column}><Text style={styles.label}>{tx("Tiền tệ")}</Text><TextInput accessibilityLabel={tx("Mã tiền tệ")} autoCapitalize="characters" maxLength={3} onChangeText={(value)=>setCurrencyCode(value.toUpperCase())} placeholder="VND" placeholderTextColor={colors.muted} style={styles.input} value={currencyCode} /></View><View style={styles.wideColumn}><Text style={styles.label}>{tx("Số dư ban đầu")}</Text><TextInput money accessibilityLabel={tx("Số dư ban đầu")} keyboardType="number-pad" onChangeText={setOpeningBalance} placeholder="0" placeholderTextColor={colors.muted} style={styles.input} value={openingBalance} /></View></View>
      <Text style={styles.help}>{tx("Số dư này là điểm bắt đầu để Picket tính tổng tiền hiện tại.")}</Text>
      {message ? <Text accessibilityLiveRegion="polite" role="alert" style={styles.error}>{tx(message)}</Text> : null}
      <Pressable accessibilityRole="button" accessibilityState={{busy}} disabled={busy} onPress={() => void submit()} style={({pressed})=>[styles.primary,pressed&&styles.pressed]}>{busy?<ActivityIndicator accessibilityLabel={tx("Đang tạo tài khoản")} color={colors.onPrimary}/>:<Text style={styles.primaryText}>{tx("Tạo tài khoản")}</Text>}</Pressable>
    </Surface>
  </PicketScreen>;
}

const createStyles = (colors: MobileThemeColors) => StyleSheet.create({appBar:{justifyContent:"center",minHeight:52},back:{color:colors.link,fontSize:15,fontWeight:"700"},heading:{color:colors.ink,fontSize:26,fontWeight:"800",letterSpacing:-.8,marginTop:18},subtitle:{color:colors.muted,fontSize:15,lineHeight:22,marginBottom:22,marginTop:7},label:{color:colors.ink,fontSize:13,fontWeight:"700",marginBottom:8,marginTop:14},input:{backgroundColor:colors.white,borderColor:colors.controlBorder,borderRadius:paperShape.input,borderWidth:1,color:colors.ink,fontSize:16,minHeight:paperControl.height,paddingHorizontal:16},kindGrid:{flexDirection:"row",flexWrap:"wrap",gap:8},kind:{alignItems:"center",backgroundColor:colors.cream,borderColor:colors.peach,borderRadius:paperShape.chip,borderWidth:1,flexBasis:"47%",flexGrow:1,gap:6,minHeight:76,justifyContent:"center",padding:10},kindSelected:{backgroundColor:colors.mauve,borderColor:colors.primaryOutline},kindSymbol:{color:colors.link,fontSize:20,fontWeight:"700"},kindLabel:{color:colors.ink,fontSize:13,fontWeight:"700"},kindSelectedText:{color: colors.onPrimary},twoColumns:{flexDirection:"row",gap:10},column:{flex:.65},wideColumn:{flex:1.35},help:{color:colors.muted,fontSize:12,lineHeight:18,marginTop:8},error:{color:colors.danger,fontSize:13,fontWeight:"700",lineHeight:19,marginTop:14},primary:{alignItems:"center",backgroundColor:colors.mauve,borderRadius:paperShape.button,justifyContent:"center",marginTop:20,minHeight:paperControl.height},primaryText:{color: colors.onPrimary,fontSize:15,fontWeight:"700"},pressed:{opacity:.72}});
