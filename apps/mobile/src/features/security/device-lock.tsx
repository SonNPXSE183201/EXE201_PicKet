import { colors } from "@picket/design-tokens";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState, StyleSheet, Text, View } from "react-native";

import { AccessiblePressable as Pressable } from "@/core/ui/accessible-pressable";
import { useAuth } from "@/features/auth/auth-context";

type LockContextValue = {
  enabled: boolean;
  busy: boolean;
  setEnabled(value: boolean): Promise<boolean>;
};
const LockContext = createContext<LockContextValue | null>(null);
const keyFor = (userId: string) => `picket_device_lock_${userId.replace(/[^a-zA-Z0-9]/g, "_")}`;
const LOCK_AFTER_BACKGROUND_MS = 30_000;

async function authenticate(): Promise<boolean> {
  const level = await LocalAuthentication.getEnrolledLevelAsync();
  if (level === LocalAuthentication.SecurityLevel.NONE) return false;
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: "Mở khóa Picket",
    promptDescription: "Xác thực bằng sinh trắc học hoặc mã khóa thiết bị.",
    disableDeviceFallback: false,
    biometricsSecurityLevel: "strong",
  });
  return result.success;
}

export function DeviceLockProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  return <DeviceLockSession key={session?.user.id ?? "anonymous"}>{children}</DeviceLockSession>;
}

function DeviceLockSession({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [enabled, setEnabledState] = useState(false);
  const [locked, setLocked] = useState(Boolean(session));
  const [busy, setBusy] = useState(Boolean(session));
  const [message, setMessage] = useState<string | null>(null);
  const backgroundAt = useRef<number | null>(null);
  useEffect(() => {
    let active = true;
    if (!userId) return;
    void SecureStore.getItemAsync(keyFor(userId)).then((value) => {
      if (!active) return;
      setEnabledState(value === "enabled");
      setLocked(value === "enabled");
    }).catch(() => {
      if (active) { setEnabledState(true); setLocked(true); setMessage("Không đọc được cài đặt khóa. Hãy xác thực để tiếp tục."); }
    }).finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [userId]);
  useEffect(() => {
    if (!enabled || !userId) return;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "background") backgroundAt.current = Date.now();
      if (state === "active" && backgroundAt.current !== null) {
        if (Date.now() - backgroundAt.current >= LOCK_AFTER_BACKGROUND_MS) setLocked(true);
        backgroundAt.current = null;
      }
    });
    return () => subscription.remove();
  }, [enabled, userId]);
  const unlock = useCallback(async () => {
    setBusy(true);
    setMessage(null);
    try {
      if (await authenticate()) setLocked(false);
      else setMessage("Chưa xác thực được. Kiểm tra khóa thiết bị và thử lại.");
    } catch { setMessage("Không mở được trình xác thực trên thiết bị này."); }
    finally { setBusy(false); }
  }, []);
  const value = useMemo<LockContextValue>(() => ({ enabled, busy,
    async setEnabled(next) {
      if (!session) return false;
      setBusy(true);
      try {
        if (!(await authenticate())) return false;
        if (next) await SecureStore.setItemAsync(keyFor(session.user.id), "enabled");
        else await SecureStore.deleteItemAsync(keyFor(session.user.id));
        setEnabledState(next);
        setLocked(false);
        return true;
      } catch { return false; }
      finally { setBusy(false); }
    },
  }), [enabled, busy, session]);
  return <LockContext.Provider value={value}>
    {session && (locked || busy && enabled) ? <View style={styles.root}>
      <Text accessibilityRole="header" style={styles.heading}>Picket đã khóa</Text>
      <Text style={styles.copy}>Xác thực trên thiết bị để xem thông tin tài chính của bạn.</Text>
      {message && <Text accessibilityLiveRegion="polite" style={styles.error}>{message}</Text>}
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => void unlock()} style={styles.button}><Text style={styles.buttonText}>{busy ? "Đang xác thực…" : "Mở khóa"}</Text></Pressable>
    </View> : children}
  </LockContext.Provider>;
}

export function useDeviceLock() {
  const value = useContext(LockContext);
  if (!value) throw new Error("useDeviceLock must be used inside DeviceLockProvider.");
  return value;
}

const styles = StyleSheet.create({ root:{alignItems:"center",backgroundColor:colors.cream,flex:1,justifyContent:"center",padding:28},heading:{color:colors.ink,fontSize:28,fontWeight:"800"},copy:{color:colors.muted,fontSize:15,lineHeight:22,marginTop:12,textAlign:"center"},error:{color:colors.expense,fontSize:13,marginTop:16,textAlign:"center"},button:{alignItems:"center",backgroundColor:colors.mauve,borderRadius:12,justifyContent:"center",marginTop:28,minHeight:52,minWidth:180},buttonText:{color:colors.white,fontWeight:"800"} });
