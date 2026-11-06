import { TopAppBar } from "@/core/ui/picket-ui";
import { paperControl , paperShape, paperSpace } from "@/core/theme/paper-foundations";
import { PicketScrollView as ScrollView } from "@/core/ui/picket-scroll-view";
import { PicketText as Text } from "@/core/ui/picket-text";

import { useTranslation } from "react-i18next";
import { createRestoreRunner, backupValidationMessage, refreshRestoredProviders } from "@/core/export/restore-attempt";
import { withLocalOwnerAccess } from "@/core/sync/offline-cache";
import { useBills } from "@/features/bills/bills-context";
import { useSubscriptions } from "@/features/subscriptions/subscriptions-context";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import type { FinanceExportEnvelope, FinanceImportSummary } from "@picket/domain";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { Redirect, router } from "expo-router";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { PicketTextInput as TextInput } from "@/core/ui/picket-text-input";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { picketApi } from "@/core/api/client";
import { decryptEncryptedBackup, decryptGuestBackup, restoreEncryptedBackup, restoreGuestBackup, type DecryptedBackup } from "@/core/export/flutter-compatible-backup";
import type { GuestBackupPayload } from "@/core/export/guest-backup-model";
import { convertLegacyBackupToGuest } from "@/core/export/legacy-to-guest";
import { useGuestFinance } from "@/core/local/guest-finance-context";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { routes } from "@/core/navigation/routes";
import { useAccounts } from "@/features/accounts/accounts-context";
import { useAuth } from "@/features/auth/auth-context";
import { useBudgets } from "@/features/budgets/budgets-context";
import { useProfile } from "@/features/profile/profile-context";
import { useTransactions } from "@/features/transactions/transactions-context";

const MAX_IMPORT_BYTES = 11_000_000;

interface PendingRestore {
  exported: FinanceExportEnvelope | null;
  encrypted: DecryptedBackup | null;
  guest: GuestBackupPayload | null;
  summary: FinanceImportSummary;
  currentRevision: number;
  fileName: string;
}

export default function RestoreScreen() {
  const {t}=useTranslation("restore");
  const { colors, styles } = useMobileStyles(createStyles);
  const { session, localMode } = useAuth();
  const guest = useGuestFinance();
  const owner=session?.user.id??(localMode?"device-guest":null);
  const currentOwner=useRef(owner),mounted=useRef(true),operationBusy=useRef(false);
  useLayoutEffect(()=>{currentOwner.current=owner;return()=>{currentOwner.current=null;};},[owner]);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  const isCurrent=()=>mounted.current&&currentOwner.current===owner;
  const restoreRunner=useRef(createRestoreRunner());
  const [awaitingReload,setAwaitingReload]=useState(false);
  const {refresh:refreshBills}=useBills();
  const {refresh:refreshSubscriptions}=useSubscriptions();
  const { refresh: refreshProfile } = useProfile();
  const { refresh: refreshAccounts } = useAccounts();
  const { refresh: refreshTransactions } = useTransactions();
  const { refresh: refreshBudgets } = useBudgets();
  const [pending, setPending] = useState<PendingRestore | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!session && !localMode) return <Redirect href={routes.login} />;

  async function chooseBackup() {
    if(operationBusy.current||!isCurrent())return;
    if (!localMode && (!session || !picketApi)) return setMessage("loginRequired");
    operationBusy.current=true;restoreRunner.current=createRestoreRunner();setAwaitingReload(false);
    setBusy(true);
    setMessage(null);
    setPending(null);
    setConfirmation("");
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        type: "*/*",
      });
      if (!isCurrent() || result.canceled) return;
      const file = result.assets[0];
      if (!file) throw new Error("fileUnreadable");
      const encrypted = file.name.toLowerCase().endsWith(".picket");
      if(encrypted&&!password)throw new Error("passwordRequired");
      const maxBytes = encrypted ? 100_000_000 : MAX_IMPORT_BYTES;
      if (file.size !== undefined && file.size > maxBytes) {
        throw new Error("fileTooLarge");
      }
      const raw = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      if (new TextEncoder().encode(raw).length > maxBytes) {
        throw new Error("fileTooLarge");
      }
      if(!isCurrent())return;
      if (localMode) {
        if (!encrypted) throw new Error("guestFormatOnly");
        const backupFormat = (JSON.parse(raw) as { format?: unknown }).format;
        const decodedGuest = backupFormat === "picket-backup-v1"
          ? convertLegacyBackupToGuest(await decryptEncryptedBackup(raw, password))
          : await decryptGuestBackup(raw, password);
        if(!isCurrent())return;
        setPending({ exported:null, encrypted:null, guest:decodedGuest, currentRevision:0, fileName:file.name,
          summary:{ valid:true, wallets:decodedGuest.finance.accounts.length, entries:decodedGuest.finance.transactions.length,
            budgets:decodedGuest.finance.budgets.length, bills:decodedGuest.finance.bills.length,
            keepsakes:decodedGuest.keepsakes.length, subscriptions:decodedGuest.finance.subscriptions.length } });
        setMessage("valid");
        return;
      }
      const decoded = encrypted ? await decryptEncryptedBackup(raw, password) : null;
      const exported = encrypted ? null : JSON.parse(raw) as FinanceExportEnvelope;
      if(!isCurrent())return;
      const [summary, snapshot] = await Promise.all([
        exported ? picketApi!.validateFinanceImport(session!.access_token, exported) : Promise.resolve({
          valid: true as const, wallets: decoded!.data.wallets.length, entries: decoded!.data.entries.length,
          budgets: decoded!.data.budgets.length, bills: decoded!.data.bills.length,
          keepsakes: decoded!.data.keepsakes.length, subscriptions: decoded!.data.subscriptions.length,
        }),
        picketApi!.loadFinanceSnapshot(session!.access_token),
      ]);
      if(!isCurrent())return;
      setPending({
        exported,
        encrypted: decoded,
        guest: null,
        summary,
        currentRevision: snapshot.revision,
        fileName: file.name,
      });
      setMessage("valid");
    } catch (error) {
      if(isCurrent())setMessage(backupValidationMessage(error));
    } finally {
      operationBusy.current=false;if(isCurrent())setBusy(false);
    }
  }

  async function restore() {
    if(operationBusy.current||!isCurrent())return;
    if (!awaitingReload && confirmation !== "RESTORE") return setMessage("confirmationRequired");
    if (!pending || (!localMode && (!session || !picketApi))) return;
    operationBusy.current=true;setBusy(true);setMessage(null);
    try {
      const result=await restoreRunner.current({
        isCurrent,
        restore:async()=>{
          if(localMode&&pending.guest)await restoreGuestBackup(pending.guest,guest.replace);
          else if(pending.encrypted){
            const result=await restoreEncryptedBackup(session!.access_token,session!.user.id,pending.currentRevision,pending.encrypted);
            if(result?.restored!==true)throw new Error("Unconfirmed restore");
          }else if(pending.exported){
            const result=await withLocalOwnerAccess(session!.user.id,()=>picketApi!.restoreFinance(session!.access_token,{
              confirmation:"RESTORE",expectedRevision:pending.currentRevision,export:pending.exported!,
            }));
            if(result?.restored!==true)throw new Error("Unconfirmed restore");
          }else throw new Error("No prepared restore payload");
        },
        refresh:async()=>{if(!localMode)await refreshRestoredProviders([refreshProfile,refreshAccounts,refreshTransactions,refreshBudgets,refreshBills,refreshSubscriptions]);},
      });
      if(!isCurrent())return;
      if(result==="restored")router.replace(routes.home);
      else if(result==="refresh-failed"){setAwaitingReload(true);setMessage("refreshFailed");}
      else if(result==="unconfirmed"){setPending(null);setMessage("unconfirmed");}
    }finally{operationBusy.current=false;if(isCurrent())setBusy(false);}
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TopAppBar title={t("title")} backDisabled={busy} />
        <Text style={styles.description}>
          {localMode ? t("deviceDescription") : t("cloudDescription")}
        </Text>
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>{t("notice")}</Text>
          <Text style={styles.noticeText}>{localMode ? t("deviceNotice") : t("cloudNotice")}</Text>
        </View>
        <TextInput accessibilityLabel={t("password")} autoCapitalize="none" autoComplete="off" onChangeText={setPassword} placeholder={t("passwordPlaceholder")} editable={!busy} secureTextEntry style={styles.input} value={password} />
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => void chooseBackup()} style={styles.secondary}>
          {busy && !pending ? <ActivityIndicator accessibilityLabel={t("reading")} color={colors.link} /> : <Text style={styles.secondaryText}>{t("choose")}</Text>}
        </Pressable>
        {pending && (
          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>{pending.fileName}</Text>
            <Text style={styles.summaryText}>{t("wallets",{count:pending.summary.wallets})}</Text>
            <Text style={styles.summaryText}>{t("entries",{count:pending.summary.entries})}</Text>
            {localMode && <Text style={styles.summaryText}>{t("receipts",{count:pending.guest?.receipts.length ?? 0})}</Text>}
            <Text style={styles.summaryText}>{t("budgets",{count:pending.summary.budgets})}</Text>
            <Text style={styles.summaryText}>{t("bills",{count:pending.summary.bills})}</Text>
            <Text style={styles.summaryText}>{t("keepsakes",{count:pending.summary.keepsakes})}</Text>
            <Text style={styles.summaryText}>{t("subscriptions",{count:pending.summary.subscriptions})}</Text>
            {!localMode && <Text style={styles.revision}>{t("revision",{revision:pending.currentRevision})}</Text>}
          </View>
        )}
        {pending && (
          <>
            <Text style={styles.label}>{t("confirmation")}</Text>
            <TextInput
              accessibilityLabel={t("confirmationLabel")}
              autoCapitalize="characters"
              autoComplete="off"
              editable={!busy} onChangeText={setConfirmation}
              style={styles.input}
              value={confirmation}
            />
            <Pressable
              accessibilityRole="button"
              disabled={busy || (!awaitingReload && confirmation !== "RESTORE")}
              onPress={() => void restore()}
              style={[styles.primary, (busy || (!awaitingReload && confirmation !== "RESTORE")) && styles.disabled]}
            >
              {busy ? <ActivityIndicator accessibilityLabel={t("restoring")} color={colors.onPrimary} /> : <Text style={styles.primaryText}>{t(awaitingReload?"retryReload":"restore")}</Text>}
            </Pressable>
          </>
        )}
        {message && <Text accessibilityLiveRegion="polite" style={message==="valid" ? styles.success : styles.error}>{t(message)}</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: MobileThemeColors) => StyleSheet.create({
  safeArea: { backgroundColor: colors.cream, flex: 1 },
  content: { maxWidth: 720, width: "100%", alignSelf: "center", gap: 16, padding: paperSpace.screen, paddingBottom: 48 },
  back: { color: colors.link, fontSize: 15, fontWeight: "700" },
  title: { color: colors.ink, fontSize: 26, fontWeight: "700", lineHeight: 38 },
  description: { color: colors.muted, fontSize: 15, lineHeight: 23 },
  notice: { backgroundColor: colors.white, borderColor: colors.peach, borderRadius: paperShape.card, borderWidth: 1, gap: 5, padding: 16 },
  noticeTitle: { color: colors.ink, fontSize: 15, fontWeight: "700" },
  noticeText: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  secondary: { alignItems: "center", borderColor: colors.primaryOutline, borderRadius: paperShape.button, borderWidth: 1, justifyContent: "center", minHeight: paperControl.height },
  secondaryText: { color: colors.link, fontSize: 15, fontWeight: "700" },
  summary: { backgroundColor: colors.white, borderRadius: paperShape.card, gap: 6, padding: 18 },
  summaryTitle: { color: colors.ink, fontSize: 16, fontWeight: "700", marginBottom: 4 },
  summaryText: { color: colors.ink, fontSize: 14 },
  revision: { color: colors.muted, fontSize: 12, marginTop: 6 },
  label: { color: colors.ink, fontSize: 14, fontWeight: "700" },
  input: { backgroundColor: colors.white, borderColor: colors.primaryOutline, borderRadius: paperShape.input, borderWidth: 1, color: colors.ink, fontSize: 17, minHeight: paperControl.height, paddingHorizontal: 16 },
  primary: { alignItems: "center", backgroundColor: colors.mauve, borderRadius: paperShape.button, justifyContent: "center", minHeight: paperControl.height },
  primaryText: { color: colors.onPrimary, fontSize: 15, fontWeight: "700" },
  disabled: { opacity: 0.45 },
  error: { color: colors.danger, fontSize: 14, lineHeight: 20 },
  success: { color: colors.income, fontSize: 14, fontWeight: "700", lineHeight: 20 },
});
