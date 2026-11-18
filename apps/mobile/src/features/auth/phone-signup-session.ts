/**
 * SMS sign-up state shared by the register, OTP and create-password screens.
 * Firebase only proves phone ownership: its auth state never drives
 * navigation, and the temporary Firebase user is deleted after the Picket
 * account exists.
 */
import { perfLog, perfStart, timed } from "./perf-log";

export type PhoneAuthEvent = {
  state: "sent" | "timeout" | "verified" | "error";
  /** Android instant verification can report null. */
  verificationId: string | null;
  code: string | null;
  error?: unknown;
};

export interface PhoneAuthDriver {
  /** Starts (or force-resends) verification; events follow Firebase PhoneAuthState. */
  verifyPhoneNumber(
    phone: string,
    timeoutSeconds: number,
    forceResend: boolean,
    onEvent: (event: PhoneAuthEvent) => void,
    onError: (error: unknown) => void,
  ): void;
  /**
   * signInWithCredential, then the ID token that sign-in just issued (no forced
   * refresh: a token minted by the sign-in is valid for an hour).
   */
  signInWithCode(verificationId: string, code: string): Promise<string>;
  /**
   * A valid ID token for the signed-in Firebase user, if any. Firebase refreshes it
   * only when it is expired or about to expire, so this is free while it is fresh.
   */
  currentIdToken(): Promise<string | null>;
  /**
   * Android instant verification (AUTO_VERIFIED without a code): a valid ID token
   * for a Firebase user already signed in with this phone, else null.
   */
  instantIdToken(phone: string): Promise<string | null>;
  /** deleteUser + signOut, best effort. */
  cleanup(): Promise<void>;
}

export interface PhoneSignupApi {
  phoneSignupStart(phone: string): Promise<unknown>;
  phoneSignupComplete(
    phone: string,
    idToken: string,
    password: string,
  ): Promise<{ access_token?: unknown; refresh_token?: unknown }>;
}

export interface PhoneResetApi {
  phoneResetStart(phone: string): Promise<unknown>;
  phoneReset(phone: string, idToken: string, password: string): Promise<unknown>;
}

/**
 * "sending": the API accepted the number and Firebase is still sending the SMS
 * (the OTP screen is already shown). "send-failed": Firebase refused (quota,
 * invalid number, too many requests); `sendError` holds the reason.
 */
export type PhoneSignupStep = "idle" | "sending" | "send-failed" | "code-sent" | "verified" | "completed";
export type PhoneSignupSnapshot = {
  step: PhoneSignupStep;
  phone: string | null;
  autoCode: string | null;
  sendError: unknown;
};

export const phoneAutoVerifyTimeoutSeconds = 60;

export class PhoneSignupStepError extends Error {
  constructor(readonly code: "no-phone" | "not-verified" | "invalid-session" | "instant-unavailable") {
    super(code);
  }
}

function unavailable(message: string, extra: Record<string, unknown>) {
  return Object.assign(new Error(message), extra);
}

export type PhoneCodeRequest = {
  verificationId: string | null;
  autoCode: string | null;
  /** AUTO_VERIFIED without a code: Firebase proved the number without an SMS. */
  instant: boolean;
};

/**
 * Resolves on the first CODE_SENT / AUTO_VERIFIED / TIMEOUT event; later auto codes go to
 * onAutoCode and a later instant verification (no code) to onInstant.
 */
export function requestPhoneCode(
  driver: PhoneAuthDriver,
  phone: string,
  options: {
    forceResend?: boolean;
    onAutoCode?: (code: string, verificationId: string | null) => void;
    onInstant?: (verificationId: string | null) => void;
  } = {},
): Promise<PhoneCodeRequest> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let autoDelivered = false;
    driver.verifyPhoneNumber(
      phone,
      phoneAutoVerifyTimeoutSeconds,
      options.forceResend === true,
      (event) => {
        if (event.state === "error") {
          if (!settled) {
            settled = true;
            reject(event.error ?? new Error("Phone verification failed"));
          }
          return;
        }
        if (!settled) {
          settled = true;
          const autoCode = event.state === "verified" ? event.code : null;
          const instant = event.state === "verified" && !event.code;
          if (event.state === "verified") autoDelivered = true;
          resolve({ verificationId: event.verificationId, autoCode, instant });
          return;
        }
        if (event.state === "verified" && !autoDelivered) {
          autoDelivered = true;
          if (event.code) options.onAutoCode?.(event.code, event.verificationId);
          else options.onInstant?.(event.verificationId);
        }
      },
      (error) => {
        if (settled) return;
        settled = true;
        reject(error);
      },
    );
  });
}

type FlowApi = {
  start(phone: string): Promise<unknown>;
  finish(phone: string, idToken: string, password: string): Promise<void>;
};

/** Shared state machine for SMS sign-up and SMS password recovery. */
function createPhoneVerificationSession(deps: {
  driver: () => PhoneAuthDriver | null;
  api: () => FlowApi | null;
}) {
  let phone: string | null = null;
  let verificationId: string | null = null;
  let idToken: string | null = null;
  let autoCode: string | null = null;
  let sendError: unknown = null;
  let step: PhoneSignupStep = "idle";
  let generation = 0;
  let confirming: Promise<string> | null = null;
  let completing: Promise<void> | null = null;
  let delivering: Promise<void> = Promise.resolve();
  let snapshot: PhoneSignupSnapshot = { step, phone, autoCode, sendError };
  const listeners = new Set<() => void>();
  const emit = () => {
    snapshot = { step, phone, autoCode, sendError };
    listeners.forEach((listener) => listener());
  };
  /** Firebase is (or was) working on this send: late events may still apply. */
  const awaitingCode = () => step === "sending" || step === "code-sent";

  function requireDriver() {
    const driver = deps.driver();
    if (!driver) throw unavailable("SMS unavailable", { code: "auth/operation-not-allowed" });
    return driver;
  }

  function requireApi(): FlowApi {
    const api = deps.api();
    if (!api) throw unavailable("API unavailable", { status: 0 });
    return api;
  }

  /**
   * Instant verification: Firebase proved the number without a code. A Firebase user
   * already signed in with this phone gives the ID token directly; otherwise sign in
   * with the credential only when both a verificationId and a code exist.
   */
  async function instantToken(driver: PhoneAuthDriver, verifiedPhone: string, id: string | null, code: string | null) {
    const token = await driver.instantIdToken(verifiedPhone).catch(() => null);
    if (token) return token;
    if (id && code) return driver.signInWithCode(id, code);
    return null;
  }

  function markVerified(token: string) {
    idToken = token;
    autoCode = null;
    sendError = null;
    step = "verified";
    emit();
  }

  /**
   * Firebase part of a send, after the API accepted the number. Runs while the OTP
   * screen is already visible; never rejects (failures become "send-failed").
   */
  async function deliver(driver: PhoneAuthDriver, nextPhone: string, forceResend: boolean, current: number) {
    const startedAt = perfStart();
    try {
      const result = await requestPhoneCode(driver, nextPhone, {
        forceResend,
        onAutoCode(code, id) {
          if (current !== generation || !awaitingCode()) return;
          if (id) verificationId = id;
          autoCode = code;
          emit();
        },
        onInstant(id) {
          if (current !== generation || !awaitingCode() || !phone) return;
          if (id) verificationId = id;
          void instantToken(driver, phone, id, null)
            .then((token) => {
              if (token && current === generation && awaitingCode()) markVerified(token);
            })
            .catch(() => undefined);
        },
      });
      perfLog(result.instant ? "firebase-instant-verified" : "firebase-code-sent", startedAt);
      if (current !== generation) return;
      verificationId = result.verificationId ?? verificationId;
      autoCode = result.autoCode ?? autoCode;
      if (result.instant) {
        const token = await instantToken(driver, nextPhone, result.verificationId, result.autoCode);
        if (current !== generation) return;
        if (token) {
          markVerified(token);
          return;
        }
        // Nothing to confirm and no SMS was sent: the user must request a new code.
        if (!verificationId) throw new PhoneSignupStepError("instant-unavailable");
      }
      step = "code-sent";
      emit();
    } catch (error) {
      perfLog("firebase-send-failed", startedAt);
      if (current !== generation) return;
      verificationId = autoCode = null;
      sendError = error;
      step = "send-failed";
      emit();
    }
  }

  /**
   * API first (rate limit, duplicate check) so a refused number never costs an SMS;
   * then the OTP screen can open while Firebase sends. False when superseded.
   */
  async function begin(nextPhone: string, forceResend: boolean): Promise<boolean> {
    const api = requireApi();
    const driver = requireDriver();
    const current = ++generation;
    await timed("api-start", () => api.start(nextPhone));
    // A resend lost the race to a confirm of the previous code: keep that verification.
    if (current !== generation || (forceResend && step === "verified")) return false;
    phone = nextPhone;
    verificationId = idToken = autoCode = null;
    sendError = null;
    confirming = null;
    step = "sending";
    emit();
    delivering = deliver(driver, nextPhone, forceResend, current);
    return true;
  }

  return {
    /** Stable object between changes (safe for useSyncExternalStore). */
    snapshot(): PhoneSignupSnapshot {
      return snapshot;
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    /**
     * Resolves true as soon as the API accepted the number (step "sending"): show the
     * OTP screen right away. API errors reject; Firebase errors become "send-failed".
     * False when a newer start or a reset superseded this one while the API answered.
     */
    start(nextPhone: string): Promise<boolean> {
      return begin(nextPhone, false);
    },
    /** Same as start for the current phone, forcing Firebase to send a new SMS. */
    resend(): Promise<boolean> {
      if (!phone) return Promise.reject(new PhoneSignupStepError("no-phone"));
      if (step === "sending") return Promise.resolve(false);
      return begin(phone, true);
    },
    /** Settles when the Firebase part of the latest send has finished (never rejects). */
    delivered(): Promise<void> {
      return delivering;
    },
    /** One sign-in per verification even if the auto code and a manual tap race. */
    confirm(code: string): Promise<string> {
      if (step === "verified" && idToken) return Promise.resolve(idToken);
      if (confirming) return confirming;
      const id = verificationId;
      if (step !== "code-sent" || !id) return Promise.reject(new PhoneSignupStepError("no-phone"));
      const current = generation;
      let driver: PhoneAuthDriver;
      try {
        driver = requireDriver();
      } catch (error) {
        return Promise.reject(error);
      }
      const pending: Promise<string> = timed("confirm", () => driver.signInWithCode(id, code))
        .then((token) => {
          if (current === generation) markVerified(token);
          return token;
        })
        .finally(() => {
          if (confirming === pending) confirming = null;
        });
      confirming = pending;
      return pending;
    },
    complete(password: string): Promise<void> {
      if (completing) return completing;
      if (step !== "verified" || !phone || !idToken) return Promise.reject(new PhoneSignupStepError("not-verified"));
      let api: FlowApi;
      try {
        api = requireApi();
      } catch (error) {
        return Promise.reject(error);
      }
      const driver = deps.driver();
      const verifiedPhone = phone;
      const verifiedToken = idToken;
      completing = timed("create-password-complete", async () => {
        // Not forced: Firebase refreshes only an expired token (user idle > ~1 h).
        const token = (await driver?.currentIdToken().catch(() => null)) ?? verifiedToken;
        await api.finish(verifiedPhone, token, password);
        generation++;
        step = "completed";
        phone = verificationId = idToken = autoCode = null;
        sendError = null;
        emit();
        void driver?.cleanup().catch(() => undefined);
      }).finally(() => {
        completing = null;
      });
      return completing;
    },
    /** "Đổi số", leaving the flow early, or starting over. */
    reset() {
      generation++;
      const hadFirebaseUser = step === "verified";
      phone = verificationId = idToken = autoCode = null;
      sendError = null;
      step = "idle";
      confirming = null;
      emit();
      if (hadFirebaseUser) void deps.driver()?.cleanup().catch(() => undefined);
    },
  };
}

export type PhoneVerificationSession = ReturnType<typeof createPhoneVerificationSession>;
export type PhoneSignupSession = PhoneVerificationSession;

/** SMS sign-up: start → code → complete (creates the account and applies its session). */
export function createPhoneSignupSession(deps: {
  driver: () => PhoneAuthDriver | null;
  api: () => PhoneSignupApi | null;
  setSession(tokens: { access_token: string; refresh_token: string }): Promise<void>;
}): PhoneVerificationSession {
  return createPhoneVerificationSession({
    driver: deps.driver,
    api() {
      const api = deps.api();
      if (!api) return null;
      return {
        start: (phone) => api.phoneSignupStart(phone),
        async finish(phone, idToken, password) {
          const tokens = await timed("complete-api", () => api.phoneSignupComplete(phone, idToken, password));
          const access = tokens?.access_token;
          const refresh = tokens?.refresh_token;
          if (typeof access !== "string" || typeof refresh !== "string") {
            throw new PhoneSignupStepError("invalid-session");
          }
          // Supabase setSession validates the tokens with one GET /auth/v1/user.
          await timed("complete-set-session", () => deps.setSession({ access_token: access, refresh_token: refresh }));
        },
      };
    },
  });
}

/** SMS password recovery: reset-start → code → reset (new password; the user signs in afterwards). */
export function createPhoneResetSession(deps: {
  driver: () => PhoneAuthDriver | null;
  api: () => PhoneResetApi | null;
}): PhoneVerificationSession {
  return createPhoneVerificationSession({
    driver: deps.driver,
    api() {
      const api = deps.api();
      if (!api) return null;
      return {
        start: (phone) => api.phoneResetStart(phone),
        async finish(phone, idToken, password) {
          await timed("complete-api", () => api.phoneReset(phone, idToken, password));
        },
      };
    },
  });
}
