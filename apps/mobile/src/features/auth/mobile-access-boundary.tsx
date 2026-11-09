import { useEffect, useRef, useState, type PropsWithChildren } from "react";
import { AppState, Linking, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import { useTranslation } from "react-i18next";
import { ApiError } from "@picket/api-client";
import { picketApi } from "@/core/api/client";
import { PicketText } from "@/core/ui/picket-text";
import { AccessiblePressable } from "@/core/ui/accessible-pressable";
import { useAppTheme } from "@/features/settings/appearance-provider";
import { useAuth } from "./auth-context";
import {
  mobileAccessAllowed,
  cachedMobileAccessAllowed,
} from "./mobile-access-policy";

/** Resume re-verification interval; within it, returning to the app is instant. */
export const ACCESS_RECHECK_MS = 10 * 60 * 1000;

/** Must wrap all owner data providers, including Billing and background sync. */
export function MobileAccessBoundary({ children }: PropsWithChildren) {
  const { session, signOut } = useAuth();
  const { t } = useTranslation("auth");
  const { colors } = useAppTheme();
  const [verifiedToken, setVerifiedToken] = useState<string | null>(null);
  const [verifiedOwner, setVerifiedOwner] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const signOutRef = useRef(signOut);
  useEffect(() => {
    signOutRef.current = signOut;
  }, [signOut]);
  const token = session?.access_token;
  const owner = session?.user.id;
  // Last successful verification (owner + time). Short trips to the home screen,
  // the camera, the photo picker or a biometric prompt all fire AppState
  // "active"; re-verifying (and hiding the app) on each one felt like a reload.
  const lastVerified = useRef<{ owner: string; at: number } | null>(null);
  const ownerRef = useRef(owner);
  useEffect(() => {
    ownerRef.current = owner;
  }, [owner]);
  useEffect(() => {
    const listener = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      const last = lastVerified.current;
      if (last && last.owner === ownerRef.current) {
        // Already verified in this session: re-check quietly (at most every
        // ACCESS_RECHECK_MS). Revocation still signs out; the app is never
        // covered by the verification screen after unlocking or returning.
        if (Date.now() - last.at >= ACCESS_RECHECK_MS) setAttempt((value) => value + 1);
        return;
      }
      setChecking(true);
      setFailed(false);
      setAttempt((value) => value + 1);
    });
    return () => listener.remove();
  }, []);
  useEffect(() => {
    let active = true;
    if (!token || !owner) return;
    const cacheKey = `picket_mobile_access_v1_${owner}`;
    let quiet = lastVerified.current?.owner === owner;
    void (async () => {
      // Cold start: an unexpired allowance for this owner (saved by the last
      // successful check) opens the app at once; the server check below still
      // runs and an explicit "not allowed" answer signs out.
      if (!quiet) {
        try {
          const cached: unknown = JSON.parse((await SecureStore.getItemAsync(cacheKey)) ?? "null");
          if (active && cachedMobileAccessAllowed(cached, owner, Date.now())) {
            lastVerified.current = { owner, at: (cached as { checkedAt: number }).checkedAt };
            setVerifiedOwner(owner);
            setVerifiedToken(token);
            setFailed(false);
            setBlocked(false);
            setChecking(false);
            quiet = true;
          }
        } catch {
          /* No usable allowance: verify before mounting. */
        }
      }
      try {
        if (!picketApi) throw new Error("API unavailable");
        const access = await picketApi.accountAccess(token);
        if (!active) return;
        setFailed(false);
        if (mobileAccessAllowed(access)) {
          lastVerified.current = { owner, at: Date.now() };
          setVerifiedOwner(owner);
          setVerifiedToken(token);
          setBlocked(false);
          await SecureStore.setItemAsync(
            cacheKey,
            JSON.stringify({ owner, allowed: true, checkedAt: Date.now() }),
          );
        } else {
          setVerifiedOwner(null);
          await SecureStore.deleteItemAsync(cacheKey);
          setBlocked(true);
          await signOutRef.current();
        }
      } catch (error) {
        if (!active) return;
        if (
          error instanceof ApiError &&
          (error.status === 0 || error.status >= 500)
        ) {
          try {
            const cached = JSON.parse(
              (await SecureStore.getItemAsync(cacheKey)) ?? "null",
            );
            if (
              active &&
              cachedMobileAccessAllowed(cached, owner, Date.now())
            ) {
              setVerifiedOwner(owner);
              setVerifiedToken(token);
              setFailed(false);
              setBlocked(false);
              return;
            }
          } catch {
            /* No verified allowance. */
          }
        }
        // A quiet re-check that cannot reach the server keeps the verified
        // owner's app open; only an explicit "not allowed" answer blocks it.
        if (active && !quiet) setFailed(true);
      } finally {
        if (active) setChecking(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [token, owner, attempt]);
  if (!blocked && !session) return children;
  const canMount = !blocked && verifiedOwner === owner;
  // A Supabase token refresh for the same owner is verified in the background
  // (revocation still signs out); only an owner change or a stale resume hides
  // the app.
  const refreshing = verifiedToken !== token && verifiedOwner === owner && !checking;
  const canUse = canMount && (verifiedToken === token || refreshing) && !checking && !failed;
  return (
    <View style={{ flex: 1 }}>
      {/* Keep the authorized owner's navigator mounted during revalidation.
          Removing it resets routes, drafts and the biometric background timer. */}
      <View
        style={{ flex: 1, display: canUse ? "flex" : "none" }}
        pointerEvents={canUse ? "auto" : "none"}
        importantForAccessibility={canUse ? "auto" : "no-hide-descendants"}
      >
        {canMount ? children : null}
      </View>
      {!canUse && (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            padding: 28,
            gap: 18,
            backgroundColor: colors.canvas,
          }}
        >
          <PicketText
            style={{ fontSize: 24, fontWeight: "700", color: colors.text }}
          >
            {blocked
              ? t("Quản trị Picket trên web")
              : failed
                ? t("Chưa xác minh được quyền truy cập")
                : t("Đang xác minh tài khoản")}
          </PicketText>
          <PicketText style={{ color: colors.text }}>
            {blocked
              ? t("Tài khoản quản trị chỉ dùng trên website. Hãy dùng tài khoản cá nhân khác để đăng nhập ứng dụng.")
              : t("Kết nối mạng để xác minh tài khoản trước khi mở dữ liệu. Chế độ dùng trên thiết bị vẫn có ở màn bắt đầu.")}
          </PicketText>
          {blocked && (
            <AccessiblePressable
              accessibilityRole="link"
              onPress={() => {
                void Linking.openURL("https://app.picketfinance.com/admin");
              }}
            >
              <PicketText style={{ color: colors.link, paddingVertical: 12 }}>
                {t("Mở trang quản trị web")}
              </PicketText>
            </AccessiblePressable>
          )}
          {(blocked || failed) && (
            <AccessiblePressable
              accessibilityRole="button"
              onPress={() => {
                if (blocked) {
                  void signOutRef
                    .current()
                    .then(() => {
                      setBlocked(false);
                      setFailed(false);
                    })
                    .catch(() => setFailed(true));
                } else {
                  setChecking(true);
                  setFailed(false);
                  setAttempt((value) => value + 1);
                }
              }}
            >
              <PicketText style={{ color: colors.link, paddingVertical: 12 }}>
                {blocked ? t("Dùng tài khoản khác") : t("Thử lại")}
              </PicketText>
            </AccessiblePressable>
          )}
          {!blocked && failed && (
            <AccessiblePressable
              accessibilityRole="button"
              onPress={() => {
                void signOutRef.current();
              }}
            >
              <PicketText style={{ color: colors.link, paddingVertical: 12 }}>
                {t("Về màn đăng nhập")}
              </PicketText>
            </AccessiblePressable>
          )}
        </View>
      )}
    </View>
  );
}
