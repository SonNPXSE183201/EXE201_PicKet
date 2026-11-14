export const otpLength = 6;
export const otpResendCooldownMs = 45_000;
/** Local guard; Supabase and Firebase also limit attempts on their side. */
export const otpMaxAttempts = 5;

export type OtpState = {
  code: string;
  attemptsLeft: number;
  status: "editing" | "verifying" | "verified" | "locked";
  error: "wrong" | "expired" | "other" | null;
  message: string | null;
  resendAvailableAt: number;
};

export type OtpAction =
  | { type: "input"; value: string }
  | { type: "submit" }
  | { type: "wrongCode" }
  | { type: "expired"; message: string }
  | { type: "failed"; message: string }
  | { type: "verified" }
  | { type: "resent"; now: number };

export function initialOtpState(now: number): OtpState {
  return { code: "", attemptsLeft: otpMaxAttempts, status: "editing", error: null, message: null, resendAvailableAt: now + otpResendCooldownMs };
}

export function sanitizeOtpInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, otpLength);
}

export function canSubmitOtp(state: OtpState): boolean {
  return state.status === "editing" && state.code.length === otpLength;
}

export function otpReducer(state: OtpState, action: OtpAction): OtpState {
  switch (action.type) {
    case "input":
      if (state.status === "verifying" || state.status === "verified") return state;
      return { ...state, code: sanitizeOtpInput(action.value), error: state.status === "locked" ? state.error : null, message: state.status === "locked" ? state.message : null };
    case "submit":
      return canSubmitOtp(state) ? { ...state, status: "verifying", error: null, message: null } : state;
    case "wrongCode": {
      if (state.status !== "verifying") return state;
      const attemptsLeft = Math.max(0, state.attemptsLeft - 1);
      return { ...state, attemptsLeft, status: attemptsLeft === 0 ? "locked" : "editing", error: "wrong", message: null };
    }
    case "expired":
      return state.status === "verified" ? state : { ...state, status: "locked", error: "expired", message: action.message };
    case "failed":
      return state.status === "verified" ? state : { ...state, status: state.status === "locked" ? "locked" : "editing", error: "other", message: action.message };
    case "verified":
      return { ...state, status: "verified", error: null, message: null };
    case "resent":
      return state.status === "verified" ? state : { ...initialOtpState(action.now) };
  }
}

/** Seconds until "Gửi lại mã" is available again (0 = available). */
export function resendSecondsLeft(state: Pick<OtpState, "resendAvailableAt">, now: number): number {
  return Math.max(0, Math.ceil((state.resendAvailableAt - now) / 1000));
}

export function formatCountdown(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
