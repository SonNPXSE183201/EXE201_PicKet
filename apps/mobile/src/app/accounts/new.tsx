import { useMgmtCopy } from "@/features/management/management-copy";
import { figmaType } from "@picket/design-tokens";
import { PicketText as Text } from "@/core/ui/picket-text";
import { useManagementCopy } from "@/core/i18n/use-management-copy";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { TopAppBar, PicketScreen } from "@/core/ui/picket-ui";
import { FigmaButton, ReceiptEdge, ReceiptDivider, figmaShadow } from "@/core/ui/figma-ui";
import { FieldDivider, FieldOverline, FieldRow, PaperCard, TypeTile } from "@/features/management/management-ui";
import type { AccountKind } from "@picket/domain";
import { Redirect, router } from "expo-router";
import { useState } from "react";
import { PicketTextInput as TextInput } from "@/core/ui/picket-text-input";
import { StyleSheet, View } from "react-native";
import { routes } from "@/core/navigation/routes";
import { isOfflineQueuedError } from "@/core/sync/offline-queued-error";
import type { IconName } from "@/core/ui/app-icon";
import { useAccounts } from "@/features/accounts/accounts-context";
import { useAuth } from "@/features/auth/auth-context";

const kinds: { value: AccountKind; label: string; symbol: IconName }[] = [
  { value: "cash", label: "Tiền mặt", symbol: "cash-multiple" },
  { value: "bank", label: "Ngân hàng", symbol: "bank-outline" },
  { value: "ewallet", label: "Ví điện tử", symbol: "wallet-outline" },
  { value: "other", label: "Khác", symbol: "piggy-bank-outline" },
];

export default function NewAccountScreen() {
  const tx = useManagementCopy();
  const m = useMgmtCopy();
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
    <TopAppBar title={m.walletNew} backDisabled={busy} />
    <View style={styles.block}>
      <View style={[styles.sheet, figmaShadow("paper")]}>
        <View style={styles.sheetBody}>
          <FieldOverline>{tx("Số dư ban đầu")}</FieldOverline>
          <TextInput money accessibilityLabel={tx("Số dư ban đầu")} keyboardType="number-pad" onChangeText={setOpeningBalance} placeholder="0" placeholderTextColor={colors.muted} style={styles.amount} value={openingBalance} />
          <ReceiptDivider />
          <Text style={[figmaType.bodySmall, { color: colors.muted }]}>{tx("Số dư này là điểm bắt đầu để Picket tính tổng tiền hiện tại.")}</Text>
        </View>
        <ReceiptEdge direction="bottom" />
      </View>
    </View>
    <View style={styles.block}>
      <FieldOverline>{m.walletType}</FieldOverline>
      <View accessibilityRole="radiogroup" style={styles.types}>
        {kinds.map((item) => <TypeTile key={item.value} icon={item.symbol} label={tx(item.label)} selected={kind === item.value} onPress={() => setKind(item.value)} />)}
      </View>
    </View>
    <View style={styles.block}>
      <PaperCard>
        <FieldRow icon="wallet-outline" label={m.walletName}>
          <TextInput accessibilityLabel={tx("Tên tài khoản")} autoCapitalize="words" maxLength={80} onChangeText={setName} placeholder={tx("Ví dụ: Ví hàng ngày")} placeholderTextColor={colors.muted} style={styles.input} value={name} />
        </FieldRow>
        <FieldDivider />
        <FieldRow icon="cash" label={tx("Tiền tệ")}>
          <TextInput accessibilityLabel={tx("Mã tiền tệ")} autoCapitalize="characters" maxLength={3} onChangeText={(value) => setCurrencyCode(value.toUpperCase())} placeholder="VND" placeholderTextColor={colors.muted} style={styles.input} value={currencyCode} />
        </FieldRow>
      </PaperCard>
    </View>
    {message ? <Text accessibilityLiveRegion="polite" role="alert" style={[figmaType.bodyStrong, { color: colors.danger, marginBottom: 12 }]}>{tx(message)}</Text> : null}
    <FigmaButton fullWidth icon="check" busy={busy} disabled={busy} label={m.createWallet} onPress={() => void submit()} />
  </PicketScreen>;
}

const createStyles = (colors: MobileThemeColors) => StyleSheet.create({
  block: { marginTop: 20, gap: 10 },
  sheet: { alignSelf: "stretch" },
  sheetBody: { backgroundColor: colors.paper, borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingTop: 18, paddingBottom: 12, paddingHorizontal: 16, gap: 8, alignItems: "center" },
  amount: { ...figmaType.amountHero, color: colors.text, textAlign: "center", alignSelf: "stretch", padding: 0, minHeight: 42 },
  types: { flexDirection: "row", justifyContent: "space-between" },
  input: { ...figmaType.bodyStrong, color: colors.text, padding: 0, minHeight: 21 },
});
