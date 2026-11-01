import { paperControl, paperSpace } from "@/core/theme/paper-foundations";
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
  const { styles } = useMobileStyles(createStyles);
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.overlay}>
        {/* Master Design Screen 18 Modal Card */}
        <View style={styles.modalCard}>
          <View style={styles.dangerCircleBadge}>
            <AppIcon name="alert-circle-outline" color="#DC2626" size={28} />
          </View>

          <Text accessibilityRole="header" style={styles.modalTitle}>
            {t("title")}
          </Text>

          <Text style={styles.modalDescription}>
            {t("description")}
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{t("confirmation")}</Text>
            <TextInput
              accessibilityLabel={t("confirmationLabel")}
              editable={!busy && !remoteDeleted}
              autoCapitalize="characters"
              autoComplete="off"
              onChangeText={setConfirmation}
              placeholder="DELETE"
              placeholderTextColor="#FCA5A5"
              style={styles.input}
              value={confirmation}
            />
          </View>

          {message && (
            <Text accessibilityLiveRegion="polite" style={styles.error}>
              {t(message)}
            </Text>
          )}

          <View style={styles.modalButtonsRow}>
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => router.back()}
              style={styles.cancelBtn}
            >
              <Text style={styles.cancelText}>{t("back")}</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={busy || (!remoteDeleted && !isConfirmed)}
              onPress={() => void remove()}
              style={[
                styles.deleteBtn,
                !remoteDeleted && !isConfirmed && styles.deleteDisabled,
              ]}
            >
              {busy ? (
                <ActivityIndicator
                  accessibilityLabel={t(remoteDeleted ? "signingOut" : "deleting")}
                  color="#FFFFFF"
                />
              ) : (
                <Text style={styles.deleteText}>{remoteDeleted ? t("finishSignOut") : t("remove")}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: MobileThemeColors) =>
  StyleSheet.create({
    safeArea: { backgroundColor: "#1E293B", flex: 1 },
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.65)",
      alignItems: "center",
      justifyContent: "center",
      padding: paperSpace.screen,
    },
    modalCard: {
      backgroundColor: colors.surface,
      borderRadius: 24,
      padding: 24,
      width: "100%",
      maxWidth: 380,
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 10,
      elevation: 6,
    },
    dangerCircleBadge: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: "#FEE2E2",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 14,
    },
    modalTitle: {
      color: "#DC2626",
      fontSize: 20,
      fontWeight: "800",
      textAlign: "center",
      marginBottom: 10,
    },
    modalDescription: {
      color: colors.muted,
      fontSize: 13,
      lineHeight: 20,
      textAlign: "center",
      marginBottom: 18,
    },
    inputContainer: {
      width: "100%",
      marginBottom: 18,
    },
    inputLabel: {
      color: colors.ink,
      fontSize: 12,
      fontWeight: "700",
      marginBottom: 8,
    },
    input: {
      backgroundColor: colors.surface,
      borderColor: "#DC2626",
      borderWidth: 1.5,
      borderRadius: 14,
      color: "#DC2626",
      fontSize: 15,
      fontWeight: "700",
      minHeight: paperControl.height,
      paddingHorizontal: 16,
      textAlign: "center",
    },
    modalButtonsRow: {
      flexDirection: "row",
      gap: 12,
      width: "100%",
    },
    cancelBtn: {
      flex: 1,
      minHeight: 46,
      borderRadius: 23,
      backgroundColor: colors.cream,
      alignItems: "center",
      justifyContent: "center",
    },
    cancelText: {
      color: colors.ink,
      fontSize: 14,
      fontWeight: "700",
    },
    deleteBtn: {
      flex: 1,
      minHeight: 46,
      borderRadius: 23,
      backgroundColor: "#DC2626",
      alignItems: "center",
      justifyContent: "center",
    },
    deleteDisabled: {
      opacity: 0.45,
    },
    deleteText: {
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: "700",
    },
    error: {
      color: "#DC2626",
      fontSize: 13,
      textAlign: "center",
      marginBottom: 10,
    },
  });
