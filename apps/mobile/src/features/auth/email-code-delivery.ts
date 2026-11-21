import { useSyncExternalStore } from "react";

import { timed } from "./perf-log";

/**
 * Email sign-up code send (Supabase signInWithOtp) tracked outside the screens,
 * so the OTP screen can open the moment the user taps "Gửi mã xác thực" and show
 * "sending", then the result or the error, while the request is in flight.
 */
export type EmailCodeStatus = "idle" | "sending" | "sent" | "failed";
export type EmailCodeSnapshot = { status: EmailCodeStatus; email: string | null; error: unknown };

export function createEmailCodeDelivery() {
  let generation = 0;
  let snapshot: EmailCodeSnapshot = { status: "idle", email: null, error: null };
  let delivering: Promise<void> = Promise.resolve();
  const listeners = new Set<() => void>();
  const set = (next: EmailCodeSnapshot) => {
    snapshot = next;
    listeners.forEach((listener) => listener());
  };

  return {
    snapshot(): EmailCodeSnapshot {
      return snapshot;
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    /**
     * Sends without waiting; failures land in the snapshot, never as a rejection.
     * A second tap while the same email is still sending is ignored (false).
     */
    start(email: string, send: (email: string) => Promise<void>): boolean {
      if (snapshot.status === "sending" && snapshot.email === email) return false;
      // A resend after a code already went out: if it fails, that code still works.
      const resend = snapshot.status === "sent" && snapshot.email === email;
      const current = ++generation;
      set({ status: "sending", email, error: null });
      delivering = timed("email-send", () => send(email)).then(
        () => {
          if (current === generation) set({ status: "sent", email, error: null });
        },
        (error: unknown) => {
          // "sent" with an error: the resend failed, the earlier code can still be entered.
          if (current === generation) set({ status: resend ? "sent" : "failed", email, error });
        },
      );
      return true;
    },
    /** Settles when the latest send has finished (never rejects). */
    delivered(): Promise<void> {
      return delivering;
    },
    /** "Đổi email" or leaving: a late result of the old send is ignored. */
    reset() {
      generation++;
      set({ status: "idle", email: null, error: null });
    },
  };
}

export type EmailCodeDelivery = ReturnType<typeof createEmailCodeDelivery>;

/** Why the latest send for `email` failed, if it did (also a failed resend, see `start`). */
export function emailCodeErrorFor(snapshot: EmailCodeSnapshot, email: string): unknown {
  return snapshot.email === email ? snapshot.error : null;
}

/** OTP screen state for `email`: a send for another address (or none) counts as already sent. */
export function emailCodeStateFor(snapshot: EmailCodeSnapshot, email: string): "sending" | "ready" | "failed" {
  if (snapshot.email !== email) return "ready";
  if (snapshot.status === "sending") return "sending";
  if (snapshot.status === "failed") return "failed";
  return "ready";
}

/** One email sign-up send at a time, shared by register → OTP. */
export const emailCodeDelivery = createEmailCodeDelivery();

export function useEmailCodeDelivery(): EmailCodeSnapshot {
  return useSyncExternalStore(emailCodeDelivery.subscribe, emailCodeDelivery.snapshot, emailCodeDelivery.snapshot);
}
