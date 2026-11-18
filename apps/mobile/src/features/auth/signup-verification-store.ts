import * as SecureStore from "expo-secure-store";
import { useEffect, useMemo, useSyncExternalStore } from "react";

import { picketApi } from "@/core/api/client";
import { firebasePhoneAuthAvailable } from "./firebase-phone-driver";
import {
  availableSignupMethods,
  createSignupVerificationLoader,
  emailOnlyVerification,
  type SignupMethod,
} from "./signup-channels";

const storageKey = "picket_signup_channels_v1";

const loadVerification = createSignupVerificationLoader(Date.now, undefined, {
  read: () => SecureStore.getItemAsync(storageKey),
  write: (value) => SecureStore.setItemAsync(storageKey, value),
});

/** Called when an auth screen first mounts so the register screen opens with the right method. */
export function prefetchSignupMethods(): void {
  loadVerification.prefetch(picketApi);
}

/**
 * Sign-up methods chosen by admins: the last good settings at once, refreshed in
 * the background. Email only on the very first run until the settings load or on any error.
 */
export function useSignupMethods(): { methods: SignupMethod[]; loading: boolean } {
  const verification = useSyncExternalStore(loadVerification.subscribe, loadVerification.peek, loadVerification.peek);
  useEffect(() => {
    void loadVerification(picketApi);
  }, []);
  return useMemo(() => ({
    methods: availableSignupMethods(verification ?? emailOnlyVerification, verification !== null && firebasePhoneAuthAvailable()),
    loading: verification === null,
  }), [verification]);
}
