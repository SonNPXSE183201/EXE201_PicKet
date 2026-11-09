import { ActionSheet } from "@/core/ui/picket-ui";
import { FigmaButton, ReceiptDivider, ReceiptSheet } from "@/core/ui/figma-ui";
import { AppIcon } from "@/core/ui/app-icon";
import { FieldRow, FigmaHeader, GroupLabel, NoticeCard, PaperGroup } from "@/features/settings/settings-figma";
import { backupCopy } from "@/features/settings/backup-copy";
import { useAppTheme } from "@/features/settings/appearance-provider";
import { exportAndShareFinance } from "@/core/export/export-finance";
import { exportEncryptedBackup, exportFinanceCsv, exportGuestBackup } from "@/core/export/flutter-compatible-backup";
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
import { ActivityIndicator, Animated, StyleSheet, View } from "react-native";
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
  const { language } = useAppTheme();
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
  const { refresh: refreshAccounts, accounts } = useAccounts();
  const { refresh: refreshTransactions, transactions } = useTransactions();
  const { refresh: refreshBudgets, budgets } = useBudgets();
  const [pending, setPending] = useState<PendingRestore | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [backupPw, setBackupPw] = useState("");
  const [backupPw2, setBackupPw2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupNote, setBackupNote] = useState<{ ok: boolean; text: string } | null>(null);

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

  const bc = backupCopy(language);
  const stats = [
    { label: bc.wallets, value: localMode ? guest.data.accounts.length : accounts.length },
    { label: bc.entries, value: localMode ? guest.data.transactions.length : transactions.length },
    { label: bc.pockets, value: localMode ? guest.data.budgets.length : budgets.length },
  ];
  const sheetReady = backupPw.length >= 12 && backupPw === backupPw2;
  const needsConfirm = !awaitingReload && confirmation !== "RESTORE";

  async function createBackup(kind: "csv" | "picket" | "json") {
    if (busy || backupBusy) return;
    setBackupBusy(true);
    setMessage(null);
    try {
      if (localMode) await exportGuestBackup(guest.data, backupPw);
      else if (kind === "json") await exportAndShareFinance(session!.access_token, session!.user.id);
      else if (kind === "csv") await exportFinanceCsv(session!.access_token, session!.user.id);
      else await exportEncryptedBackup(session!.access_token, session!.user.id, backupPw);
      if (mounted.current) { setBackupNote({ ok: true, text: localMode ? bc.madeLocal : bc.madeFile }); setSheetOpen(false); setBackupPw(""); setBackupPw2(""); }
    } catch {
      if (mounted.current) setBackupNote({ ok: false, text: bc.failed });
    } finally {
      if (mounted.current) setBackupBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <FigmaHeader title={bc.title} backDisabled={busy || backupBusy} />
        <View style={styles.statusRow}>
          <View style={styles.statusTile}><AppIcon name="check" size={22} color={colors.success} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.statusTitle}>{localMode ? bc.localState : bc.synced}</Text>
            <Text style={styles.statusMeta}>{localMode ? bc.localStateMeta : bc.syncedMeta}</Text>
          </View>
        </View>

        <View style={styles.block}>
          <GroupLabel muted>{bc.createLabel}</GroupLabel>
          <ReceiptSheet style={{ gap: 12, padding: 16 }}>
            <View style={styles.statsRow}>
              {stats.map((stat) => (
                <View key={stat.label} style={styles.stat}>
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>
            <ReceiptDivider />
            <Text style={styles.noteText}>{bc.encryptedNote}</Text>
            {backupBusy ? <BackupProgress /> : null}
            <FigmaButton label={backupBusy ? bc.creating : bc.create} disabled={busy || (localMode && guest.loading)} busy={backupBusy} onPress={() => setSheetOpen(true)} fullWidth />
            {!localMode && (
              <View style={styles.exportRow}>
                <FigmaButton variant="text" size="medium" label={bc.exportJson} disabled={busy || backupBusy} onPress={() => void createBackup("json")} />
                <FigmaButton variant="text" size="medium" label={bc.exportCsv} disabled={busy || backupBusy} onPress={() => void createBackup("csv")} />
              </View>
            )}
          </ReceiptSheet>
          {backupNote && <Text accessibilityLiveRegion="polite" style={backupNote.ok ? styles.success : styles.error}>{backupNote.text}</Text>}
        </View>

        <View style={styles.block}>
          <GroupLabel muted>{bc.restoreLabel}</GroupLabel>
          <PaperGroup>
            <FieldRow icon="lock-outline" meta={bc.filePassword} title={password ? "•".repeat(Math.min(password.length, 12)) : " "} trailing="none">
              <TextInput accessibilityLabel={t("password")} autoCapitalize="none" autoComplete="off" onChangeText={setPassword} placeholder={t("passwordPlaceholder")} editable={!busy} secureTextEntry style={styles.inlineInput} value={password} />
            </FieldRow>
            <FieldRow
              icon="format-list-bulleted"
              meta={bc.pickMeta}
              title={bc.pickFile}
              disabled={busy}
              onPress={() => void chooseBackup()}
              accessibilityLabel={t("choose")}
              trailing={busy && !pending ? <ActivityIndicator accessibilityLabel={t("reading")} color={colors.primary} /> : <Text style={styles.openText}>{bc.open}</Text>}
            />
          </PaperGroup>
        </View>

        {pending && (
          <View style={styles.block}>
            <GroupLabel muted>{pending.fileName}</GroupLabel>
            <PaperGroup>
              <FieldRow icon="wallet-outline" title={t("wallets", { count: pending.summary.wallets })} trailing="none" />
              <FieldRow icon="format-list-bulleted" title={t("entries", { count: pending.summary.entries })} trailing="none" />
              {localMode && <FieldRow icon="image-outline" title={t("receipts", { count: pending.guest?.receipts.length ?? 0 })} trailing="none" />}
              <FieldRow icon="shopping-outline" title={t("budgets", { count: pending.summary.budgets })} trailing="none" />
              <FieldRow icon="flash-outline" title={t("bills", { count: pending.summary.bills })} trailing="none" />
              <FieldRow icon="heart-outline" title={t("keepsakes", { count: pending.summary.keepsakes })} trailing="none" />
              <FieldRow icon="calendar-month-outline" title={t("subscriptions", { count: pending.summary.subscriptions })} trailing="none" />
            </PaperGroup>
            {!localMode && <Text style={styles.noteText}>{t("revision", { revision: pending.currentRevision })}</Text>}
            <Text style={styles.noteText}>{t("confirmation")}</Text>
            <PaperGroup>
              <FieldRow icon="lock-outline" meta={t("confirmation")} title={confirmation || " "} trailing="none" tone="warning">
                <TextInput accessibilityLabel={t("confirmationLabel")} autoCapitalize="characters" autoComplete="off" editable={!busy} onChangeText={setConfirmation} style={styles.inlineInput} value={confirmation} />
              </FieldRow>
            </PaperGroup>
            <FigmaButton label={t(awaitingReload ? "retryReload" : "restore")} busy={busy} disabled={busy || needsConfirm} onPress={() => void restore()} fullWidth />
          </View>
        )}

        {message && <Text accessibilityLiveRegion="polite" style={message==="valid" ? styles.success : styles.error}>{t(message)}</Text>}

        <NoticeCard icon="format-list-bulleted">{localMode ? t("deviceNotice") : t("cloudNotice")}</NoticeCard>
        <Text style={styles.noteText}>{bc.restoreNote}</Text>
      </ScrollView>

      <ActionSheet title={bc.sheetTitle} visible={sheetOpen} onClose={() => { if (!backupBusy) setSheetOpen(false); }}>
        <NoticeCard icon="lock-outline">{bc.sheetWarning}</NoticeCard>
        <View style={{ height: 16 }} />
        <PaperGroup>
          <FieldRow icon="lock-outline" meta={bc.password} title="" trailing={<EyeToggle shown={showPw} label={showPw ? bc.hide : bc.show} onPress={() => setShowPw(!showPw)} />}>
            <TextInput accessibilityLabel={bc.password} autoCapitalize="none" autoComplete="off" onChangeText={setBackupPw} secureTextEntry={!showPw} style={styles.inlineInput} value={backupPw} />
          </FieldRow>
          <FieldRow icon="lock-outline" meta={bc.confirmPassword} title="" trailing={<EyeToggle shown={showPw} label={showPw ? bc.hide : bc.show} onPress={() => setShowPw(!showPw)} />}>
            <TextInput accessibilityLabel={bc.confirmPassword} autoCapitalize="none" autoComplete="off" onChangeText={setBackupPw2} secureTextEntry={!showPw} style={styles.inlineInput} value={backupPw2} />
          </FieldRow>
        </PaperGroup>
        <Text style={[styles.noteText, { marginVertical: 12 }]}>{sheetReady || backupPw.length === 0 ? bc.forgetNote : bc.minNote}</Text>
        <FigmaButton label={bc.save} disabled={!sheetReady} busy={backupBusy} onPress={() => void createBackup("picket")} fullWidth />
      </ActionSheet>
    </SafeAreaView>
  );
}

function EyeToggle({ shown, label, onPress }: { shown: boolean; label: string; onPress(): void }) {
  const { colors } = useMobileStyles(createStyles);
  return <Pressable accessibilityRole="button" accessibilityLabel={label} hitSlop={12} onPress={onPress}><AppIcon name={shown ? "eye-off-outline" : "eye-outline"} size={22} color={colors.muted} /></Pressable>;
}

/** Indeterminate progress bar while the encrypted backup is being written. */
function BackupProgress() {
  const { styles } = useMobileStyles(createStyles);
  const [value] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([Animated.timing(value, { toValue: 1, duration: 1100, useNativeDriver: false }), Animated.timing(value, { toValue: 0, duration: 0, useNativeDriver: false })]));
    loop.start();
    return () => loop.stop();
  }, [value]);
  return <View accessible={false} style={styles.progressTrack}><Animated.View style={[styles.progressFill, { width: value.interpolate({ inputRange: [0, 1], outputRange: ["8%", "100%"] }) }]} /></View>;
}

const createStyles = (colors: MobileThemeColors) => StyleSheet.create({
  safeArea: { backgroundColor: colors.canvas, flex: 1 },
  content: { maxWidth: 720, width: "100%", alignSelf: "center", gap: 24, paddingHorizontal: 20, paddingBottom: 48 },
  block: { gap: 10 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  statusTile: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.successSurface, alignItems: "center", justifyContent: "center" },
  statusTitle: { color: colors.text, fontSize: 14, fontWeight: "800", lineHeight: 21 },
  statusMeta: { color: colors.muted, fontSize: 12, fontWeight: "600", lineHeight: 18 },
  statsRow: { flexDirection: "row", justifyContent: "space-between" },
  stat: { alignItems: "center", flex: 1 },
  statValue: { color: colors.text, fontSize: 22, fontWeight: "800", lineHeight: 28 },
  statLabel: { color: colors.muted, fontSize: 11, fontWeight: "700", lineHeight: 16 },
  noteText: { color: colors.muted, fontSize: 12, fontWeight: "600", lineHeight: 18 },
  exportRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center" },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: colors.elevated, overflow: "hidden" },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: colors.primary },
  inlineInput: { color: colors.text, fontSize: 14, fontWeight: "700", lineHeight: 21, minHeight: 24, padding: 0 },
  openText: { color: colors.primary, fontSize: 12, fontWeight: "700", lineHeight: 18 },
  error: { color: colors.danger, fontSize: 14, lineHeight: 20 },
  success: { color: colors.income, fontSize: 14, fontWeight: "700", lineHeight: 20 },
});
