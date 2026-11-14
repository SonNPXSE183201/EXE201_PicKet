"use client";

import type { FirebaseApp } from "firebase/app";
import type { Auth, ConfirmationResult, RecaptchaVerifier, User } from "firebase/auth";

import type { FirebaseWebConfig } from "@/core/firebase/config";

/* Firebase Phone Auth is only used to prove the phone number: the ID token goes to the
   Picket API (POST /v1/auth/phone-signup), which creates the Supabase account. The SDK is
   loaded lazily so email-only visitors never download it. */
const APP_NAME = "picket-phone-signup";

async function firebaseAuth(config: FirebaseWebConfig): Promise<Auth> {
  const [{ initializeApp, getApps }, { getAuth }] = await Promise.all([import("firebase/app"), import("firebase/auth")]);
  const app: FirebaseApp = getApps().find((a) => a.name === APP_NAME) ?? initializeApp(config, APP_NAME);
  const auth = getAuth(app);
  auth.languageCode = "vi";
  return auth;
}

let activeVerifier: RecaptchaVerifier | undefined;

/** Sends the 6-digit SMS behind an invisible reCAPTCHA rendered into `container` (an empty element). */
export async function sendPhoneCode(config: FirebaseWebConfig, phone: string, container: HTMLElement): Promise<ConfirmationResult> {
  const auth = await firebaseAuth(config);
  const { RecaptchaVerifier: Verifier, signInWithPhoneNumber } = await import("firebase/auth");
  // A resend needs a fresh widget in the same container.
  activeVerifier?.clear();
  activeVerifier = undefined;
  let verifier: RecaptchaVerifier | undefined;
  try {
    verifier = new Verifier(auth, container, { size: "invisible" });
    activeVerifier = verifier;
    const confirmation = await signInWithPhoneNumber(auth, phone, verifier);
    return confirmation;
  } catch (error) {
    verifier?.clear();
    activeVerifier = undefined;
    throw error;
  }
}

/** Confirms the code and returns a fresh ID token plus the temporary Firebase user. */
export async function confirmPhoneCode(confirmation: ConfirmationResult, code: string): Promise<{ idToken: string; user: User }> {
  const { user } = await confirmation.confirm(code);
  return { idToken: await user.getIdToken(true), user };
}

/** The Firebase user is only a proof; remove it once Picket has its own account. */
export async function discardFirebaseUser(config: FirebaseWebConfig, user: User | undefined): Promise<void> {
  try {
    const { deleteUser, signOut } = await import("firebase/auth");
    activeVerifier?.clear();
    activeVerifier = undefined;
    if (user) await deleteUser(user).catch(() => {});
    await signOut(await firebaseAuth(config)).catch(() => {});
  } catch {
    /* Best effort only. */
  }
}
