import { useSyncExternalStore } from "react";

import { picketApi } from "@/core/api/client";
import { supabase } from "@/core/supabase/client";
import { firebasePhoneDriver } from "./firebase-phone-driver";
import { createPhoneResetSession, createPhoneSignupSession, type PhoneVerificationSession } from "./phone-signup-session";

/** One SMS sign-up at a time, shared by register → OTP → create-password. */
export const phoneSignup = createPhoneSignupSession({
  driver: firebasePhoneDriver,
  api: () => picketApi,
  async setSession(tokens) {
    if (!supabase) throw new Error("Supabase public configuration is missing.");
    const { error } = await supabase.auth.setSession(tokens);
    if (error) throw error;
  },
});

/** One SMS password recovery at a time, shared by forgot-password → OTP → new password. */
export const phoneReset = createPhoneResetSession({
  driver: firebasePhoneDriver,
  api: () => picketApi,
});

export type PhoneFlowPurpose = "signup" | "reset";

export function phoneFlow(purpose: PhoneFlowPurpose): PhoneVerificationSession {
  return purpose === "reset" ? phoneReset : phoneSignup;
}

export function usePhoneFlow(purpose: PhoneFlowPurpose) {
  const session = phoneFlow(purpose);
  return useSyncExternalStore(session.subscribe, session.snapshot, session.snapshot);
}

export function usePhoneSignup() {
  return usePhoneFlow("signup");
}
