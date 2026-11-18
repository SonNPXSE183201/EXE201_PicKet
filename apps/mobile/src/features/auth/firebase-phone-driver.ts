import type * as FirebaseAppModule from "@react-native-firebase/app";
import type * as FirebaseAuthModule from "@react-native-firebase/auth";

import { timed } from "./perf-log";
import type { PhoneAuthDriver, PhoneAuthEvent } from "./phone-signup-session";

type Modules = { app: typeof FirebaseAppModule; auth: typeof FirebaseAuthModule };

let loaded: Modules | null | undefined;

/**
 * Firebase is optional: Expo Go, older installs and builds made before
 * google-services.json was provided have no configured default app. In that
 * case SMS sign-up is hidden instead of crashing.
 */
function loadFirebase(): Modules | null {
  if (loaded !== undefined) return loaded;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- optional native module
    const app = require("@react-native-firebase/app") as typeof FirebaseAppModule;
    if (!app.getApps().length) {
      console.warn("[PicketFirebase] no default Firebase app; SMS sign-up hidden");
      loaded = null;
      return loaded;
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- optional native module
    const auth = require("@react-native-firebase/auth") as typeof FirebaseAuthModule;
    auth.getAuth();
    loaded = { app, auth };
  } catch (error) {
    // Logged so a hidden SMS option can be diagnosed from logcat on QA devices.
    console.warn("[PicketFirebase] unavailable; SMS sign-up hidden:", error instanceof Error ? error.message : String(error));
    loaded = null;
  }
  return loaded;
}

export function firebasePhoneAuthAvailable(): boolean {
  return loadFirebase() !== null;
}

let driver: PhoneAuthDriver | null | undefined;

export function firebasePhoneDriver(): PhoneAuthDriver | null {
  if (driver !== undefined) return driver;
  const modules = loadFirebase();
  if (!modules) {
    driver = null;
    return driver;
  }
  const { auth: firebase } = modules;
  driver = {
    verifyPhoneNumber(phone, timeoutSeconds, forceResend, onEvent, onError) {
      try {
        firebase
          .verifyPhoneNumber(firebase.getAuth(), phone, timeoutSeconds, forceResend)
          .on(
            "state_changed",
            (snapshot) => {
              const event: PhoneAuthEvent = {
                state: snapshot.state,
                verificationId: snapshot.verificationId ?? null,
                code: snapshot.code ?? null,
                error: snapshot.error ?? undefined,
              };
              onEvent(event);
            },
            (error) => onError(error),
          )
          .catch?.(onError);
      } catch (error) {
        onError(error);
      }
    },
    async signInWithCode(verificationId, code) {
      const instance = firebase.getAuth();
      const credential = firebase.PhoneAuthProvider.credential(verificationId, code);
      const result = await timed("firebase-sign-in", () => firebase.signInWithCredential(instance, credential));
      // The sign-in just minted this token: forcing a refresh here cost an extra
      // securetoken.googleapis.com round trip before the OTP screen could move on.
      return firebase.getIdToken(result.user);
    },
    async currentIdToken() {
      const user = firebase.getAuth().currentUser;
      // Not forced: Firebase refreshes the cached token only when it is (nearly) expired.
      return user ? firebase.getIdToken(user) : null;
    },
    async instantIdToken(phone) {
      // RNFirebase may already have signed in after Android instant verification.
      const user = firebase.getAuth().currentUser;
      if (!user) return null;
      const phoneSignIn = user.phoneNumber === phone
        || user.providerData.some((provider) => provider.providerId === "phone" && provider.phoneNumber === phone);
      return phoneSignIn ? firebase.getIdToken(user) : null;
    },
    async cleanup() {
      const instance = firebase.getAuth();
      const user = instance.currentUser;
      if (user) await firebase.deleteUser(user).catch(() => undefined);
      await firebase.signOut(instance).catch(() => undefined);
    },
  };
  return driver;
}
