import { PicketScrollView as ScrollView } from "@/core/ui/picket-scroll-view";
import { FigmaButton } from "@/core/ui/figma-ui";
import { FieldRow, FigmaHeader, PaperGroup } from "@/features/settings/settings-figma";
import { deleteCopy } from "@/features/settings/delete-copy";
import { useAppTheme } from "@/features/settings/appearance-provider";
import { PicketText as Text } from "@/core/ui/picket-text";

import { useTranslation } from "react-i18next";
import { deleteAccountWithLocalRetirement } from "@/features/auth/account-delete-flow";
import { retireAccountLocalData } from "@/features/auth/account-local-retirement";
import { useOwnerCacheRecovery } from "@/features/auth/owner-cache-boundary";
import { useMobileStyles } from "@/core/theme/use-mobile-styles";
import type { MobileThemeColors } from "@/core/theme/mobile-theme-adapter";
import { Redirect, router } from "expo-router";
import { useState, useEffect, useRef } from "react";
import { PicketTextInput as TextInput } from "@/core/ui/picket-text-input";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { picketApi } from "@/core/api/client";
import { routes } from "@/core/navigation/routes";
import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { AppIcon } from "@/core/ui/app-icon";
import { useAuth } from "@/features/auth/auth-context";

export default function DeleteAccountScreen() {
  const { colors, styles } = useMobileStyles(createStyles);
  const { language } = useAppTheme();
  const { session, signOut } = useAuth();
  const { t } = useTranslation("accountDeletion");
  const requestOwnerRecovery = useOwnerCacheRecovery();
  const [remoteDeleted, setRemoteDeleted] = useState(false);
  const submitting = useRef(false);
  const mounted = useRef(true);
  const currentOwner = useRef(session?.user.id);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    currentOwner.current = session?.user.id;
    return () => {
      currentOwner.current = undefined;
    };
  }, [session?.user.id]);

  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!session && !remoteDeleted) return <Redirect href={routes.login} />;

  // Support both "DELETE" and "XÓA TÀI KHOẢN"
  const isConfirmed =
    confirmation.trim().toUpperCase() === "DELETE" ||
    confirmation.trim().toUpperCase() === "XÓA TÀI KHOẢN";

  async function remove() {
    if (submitting.current) return;
    if (!remoteDeleted && !isConfirmed) {
      setMessage("confirmError");
      return;
    }
    if (!remoteDeleted && (!session || !picketApi)) {
      setMessage("unavailable");
      return;
    }
    submitting.current = true;
    setBusy(true);
    setMessage(null);
    try {
      if(remoteDeleted){await signOut();if(mounted.current)router.replace(routes.login);return;}
      const request = session!;
      const owner = request.user.id;
      const result = await deleteAccountWithLocalRetirement({
        retireLocal: () => retireAccountLocalData(owner),
        deleteRemote: async () => {
          const result = await picketApi!.deleteAccount(request.access_token);
          if(result?.deleted!==true)throw new Error("Unconfirmed account deletion");
        },
        signOut,
        isCurrent: () => mounted.current && currentOwner.current === owner,
      });
      if (!mounted.current || (currentOwner.current && currentOwner.current !== owner)) return;
      if (result.status === "deleted") {
        setRemoteDeleted(true);
        if (result.signedOut) router.replace(routes.login);
        else {
          setMessage("deletedSignOut");
          requestOwnerRecovery(owner,true);
        }
      } else {
        if (result.status === "remote-unconfirmed") requestOwnerRecovery(owner);
        if (result.status === "local-cleanup-failed") requestOwnerRecovery(owner,false,"cleanupFailed");
        setMessage(
          result.status === "local-cleanup-failed"
            ? "cleanupFailed"
            : result.status === "remote-unconfirmed"
            ? "remoteUnconfirmed"
            : "sessionChanged",
        );
      }
    } catch {
      if (mounted.current) setMessage(remoteDeleted ? "deletedSignOut" : "remoteUnconfirmed");
    } finally {
      submitting.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  const dc = deleteCopy(language);
  const armed = remoteDeleted || isConfirmed;
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <FigmaHeader title={dc.header} backDisabled={busy} />
        <View style={styles.titleBlock}>
          <Text accessibilityRole="header" style={styles.pageTitle}>{t("title")}</Text>
          <Text style={styles.pageSub}>{t("description")}</Text>
        </View>
        <View style={styles.warnCard}>
          <Text style={styles.warnOverline}>{dc.warnTitle.toUpperCase()}</Text>
          {dc.items.map((item) => (
            <View key={item} style={styles.warnRow}>
              <AppIcon name="close" size={14} color={colors.warning} />
              <Text style={styles.warnText}>{item}</Text>
            </View>
          ))}
        </View>
        <View style={styles.tipRow}>
          <AppIcon name="information-outline" size={16} color={colors.muted} />
          <Text style={styles.tipText}>
            {dc.keepTip}{" "}
            <Text accessibilityRole="link" onPress={() => router.push(routes.restore)} style={styles.tipLink}>{dc.keepLink}</Text>
            {" "}{dc.keepTail}
          </Text>
        </View>
        <PaperGroup>
          <FieldRow icon="lock-outline" meta={t("confirmation")} title={confirmation || " "} trailing="none" tone="warning">
            <TextInput
              accessibilityLabel={t("confirmationLabel")}
              editable={!busy && !remoteDeleted}
              autoCapitalize="characters"
              autoComplete="off"
              onChangeText={setConfirmation}
              placeholder="DELETE"
              placeholderTextColor={colors.muted}
              style={styles.input}
              value={confirmation}
            />
          </FieldRow>
        </PaperGroup>
        {message && (
          <Text accessibilityLiveRegion="polite" style={styles.error}>
            {t(message)}
          </Text>
        )}
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: busy || !armed, busy }}
            disabled={busy || !armed}
            onPress={() => void remove()}
            style={[styles.deleteBtn, !armed && styles.deleteDisabled]}
          >
            {busy ? (
              <ActivityIndicator accessibilityLabel={t(remoteDeleted ? "signingOut" : "deleting")} color={colors.expense} />
            ) : (
              <Text style={styles.deleteText}>{remoteDeleted ? t("finishSignOut") : t("remove")}</Text>
            )}
          </Pressable>
          <FigmaButton variant="text" size="medium" disabled={busy} label={t("back")} onPress={() => router.back()} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: MobileThemeColors) =>
  StyleSheet.create({
    safeArea: { backgroundColor: colors.canvas, flex: 1 },
    content: { flexGrow: 1, gap: 16, paddingHorizontal: 20, paddingBottom: 32, maxWidth: 720, width: "100%", alignSelf: "center" },
    titleBlock: { gap: 4, marginTop: 8 },
    pageTitle: { color: colors.text, fontSize: 22, fontWeight: "800", letterSpacing: -0.3, lineHeight: 29 },
    pageSub: { color: colors.muted, fontSize: 12, fontWeight: "600", lineHeight: 18 },
    warnCard: { backgroundColor: colors.warningSurface, borderRadius: 24, gap: 10, padding: 16 },
    warnOverline: { color: colors.warning, fontSize: 11, fontWeight: "800", letterSpacing: 1.1, lineHeight: 16 },
    warnRow: { alignItems: "center", flexDirection: "row", gap: 10 },
    warnText: { color: colors.text, flex: 1, fontSize: 12, fontWeight: "600", lineHeight: 18 },
    tipRow: { alignItems: "center", flexDirection: "row", gap: 8 },
    tipText: { color: colors.muted, flex: 1, fontSize: 12, fontWeight: "600", lineHeight: 18 },
    tipLink: { color: colors.primary, fontWeight: "800" },
    input: { color: colors.text, fontSize: 14, fontWeight: "700", lineHeight: 21, minHeight: 24, padding: 0 },
    actions: { gap: 6, marginTop: "auto", paddingTop: 24 },
    deleteBtn: { alignItems: "center", borderColor: colors.expense, borderRadius: 24, borderWidth: 1, height: 48, justifyContent: "center", backgroundColor: colors.surface },
    deleteDisabled: { opacity: 0.45 },
    deleteText: { color: colors.expense, fontSize: 14, fontWeight: "800" },
    error: { color: colors.danger, fontSize: 13, textAlign: "center" },
  });
