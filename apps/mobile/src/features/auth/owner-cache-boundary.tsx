import { PicketScrollView as ScrollView } from "@/core/ui/picket-scroll-view";
import { PicketText as Text } from "@/core/ui/picket-text";
import { paperShape, paperSpace } from "@/core/theme/paper-foundations";
import { createContext, useContext, useCallback, useEffect, useRef, useState, type PropsWithChildren } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { bootstrapIntentGate } from "@/core/navigation/bootstrap-intent";
import { isOfflineCacheOwnerRetired, recoverOfflineCacheOwner } from "@/core/sync/offline-cache";
import { supabase } from "@/core/supabase/client";
import { useAppTheme } from "@/features/settings/appearance-provider";
import { AccessiblePressable } from "@/core/ui/accessible-pressable";
import { useAuth } from "./auth-context";
import { verifyCacheRecoveryOwner } from "./cache-recovery";
import { useDeviceLock } from "@/features/security/device-lock";

const OwnerRecoveryContext=createContext<(owner:string,confirmed?:boolean,failure?:"cleanupFailed")=>void>(()=>{});
export function useOwnerCacheRecovery(){return useContext(OwnerRecoveryContext);}

/** Runs before any account data provider or navigation screen can hydrate. */
export function OwnerCacheBoundary({ children }: PropsWithChildren) {
  const { session } = useAuth();
  if (!session) return children;
  return <SignedInOwnerCacheBoundary key={session.user.id} owner={session.user.id}>{children}</SignedInOwnerCacheBoundary>;
}

function SignedInOwnerCacheBoundary({ owner, children }: PropsWithChildren<{ owner: string }>) {
  const { session, signOut } = useAuth();
  const {refresh:refreshDeviceLock}=useDeviceLock();
  const { colors } = useAppTheme();
  const { t } = useTranslation("accountDeletion");
  const [phase, setPhase] = useState<"checking" | "retired" | "error" | "ready" | "deleted">("checking");
  const [busyAction,setBusyAction]=useState<"verify"|"signout"|null>(null);
  const busy=busyAction!==null;
  const [message, setMessage] = useState<string | null>(null);
  const alive = useRef(true), submitting = useRef(false);
  const currentOwner = useRef(session?.user.id);
  useEffect(() => {
    currentOwner.current = session?.user.id;
    return () => { currentOwner.current = undefined; };
  }, [session?.user.id]);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => { if (phase !== "ready") bootstrapIntentGate.notReady(); }, [phase]);
  useEffect(() => {
    let active = true;
    void isOfflineCacheOwnerRetired(owner).then(retired => {
      if (active) setPhase(retired ? "retired" : "ready");
    }).catch(() => { if (active) setPhase("error"); });
    return () => { active = false; };
  }, [owner]);
  const isCurrent = () => alive.current && currentOwner.current === owner;
  const requestOwnerRecovery=useCallback((requestedOwner:string,confirmed=false,failure?:"cleanupFailed")=>{
    if(alive.current&&currentOwner.current===owner&&requestedOwner===owner){
      setMessage(confirmed?null:failure??"remoteUnconfirmed");setPhase(confirmed?"deleted":"retired");
    }
  },[owner]);

  async function recover() {
    if (phase==="deleted" || submitting.current || !isCurrent() || !session || !supabase) return;
    submitting.current = true; setBusyAction("verify"); setMessage(null);
    const request = session;
    try {
      const restored = await recoverOfflineCacheOwner(owner,
        () => verifyCacheRecoveryOwner(supabase!.auth, request.access_token), isCurrent);
      if (!restored) {if(isCurrent())setMessage("verifyFailed");return;}
      if(!isCurrent())return;
      await refreshDeviceLock();
      if(isCurrent())setPhase("ready");
    } catch { if (isCurrent()) setMessage("verifyFailed"); }
    finally { submitting.current = false; if (isCurrent()) setBusyAction(null); }
  }

  async function leave() {
    if (submitting.current || !isCurrent()) return;
    submitting.current = true; setBusyAction("signout"); setMessage(null);
    try { await signOut(); }
    catch { if (isCurrent()) setMessage("recoverySignOutFailed"); }
    finally { submitting.current = false; if (isCurrent()) setBusyAction(null); }
  }

  if (phase === "ready") return <OwnerRecoveryContext.Provider value={requestOwnerRecovery}>{children}</OwnerRecoveryContext.Provider>;
  return <SafeAreaView style={[styles.root, { backgroundColor: colors.canvas }]}>
    <ScrollView contentContainerStyle={styles.content}>
      {phase === "checking" ? <ActivityIndicator accessibilityLabel={t("checkingAccount")} color={colors.link} /> : <>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>{t(phase==="deleted"?"deletedTitle":"recoveryTitle")}</Text>
        <Text style={[styles.description, { color: colors.muted }]}>{t(phase==="deleted"?"deletedSignOut":phase === "error" ? "recoveryStorageFailed" : "recoveryDescription")}</Text>
        {message && <Text accessibilityLiveRegion="polite" style={[styles.description, { color: colors.expense }]}>{t(message)}</Text>}
        {phase!=="deleted"&&<AccessiblePressable disabled={busy} onPress={() => void recover()} style={[styles.button, { backgroundColor: colors.primary }]}>
          {busyAction==="verify" ? <ActivityIndicator accessibilityLabel={t("checkingAccount")} color={colors.onPrimary} /> : <Text style={[styles.buttonText, { color: colors.onPrimary }]}>{t("verifyAccount")}</Text>}
        </AccessiblePressable>}
        <AccessiblePressable disabled={busy} onPress={() => void leave()} style={styles.button}>
          {busyAction==="signout"?<ActivityIndicator accessibilityLabel={t("signingOut")} color={colors.link}/>:<Text style={[styles.buttonText, { color: colors.link }]}>{t("finishSignOut")}</Text>}
        </AccessiblePressable>
      </>}
      <View style={styles.spacer} />
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  root: { flex: 1 }, content: { maxWidth: 720, width: "100%", alignSelf: "center", flexGrow: 1, justifyContent: "center", padding: paperSpace.screen, gap: 20 },
  title: { fontSize: 28, fontWeight: "700" }, description: { fontSize: 16, lineHeight: 25 },
  button: { alignItems: "center", justifyContent: "center", padding: 14, borderRadius: paperShape.button },
  buttonText: { fontSize: 15, fontWeight: "700", textAlign: "center" }, spacer: { height: 8 },
});
