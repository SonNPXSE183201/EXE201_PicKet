"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { confirmHuman } from "@/features/auth/auth-actions";

type Turnstile = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
};
declare global {
  interface Window { turnstile?: Turnstile }
}

let scriptPromise: Promise<void> | undefined;
function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        scriptPromise = undefined;
        reject(new Error("Turnstile unavailable"));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

function TurnstileWidget({ siteKey, onToken }: { siteKey: string; onToken: (token: string) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let disposed = false;
    let id: string | undefined;
    void loadScript().then(() => {
      if (disposed || !container.current || !window.turnstile) return;
      id = window.turnstile.render(container.current, {
        sitekey: siteKey,
        theme: "auto",
        language: "vi",
        "response-field": false,
        callback: (value: string) => { onToken(value); setFailed(false); },
        "expired-callback": () => onToken(""),
        "error-callback": () => { onToken(""); setFailed(true); },
      });
    }).catch(() => { if (!disposed) setFailed(true); });
    return () => {
      disposed = true;
      if (id !== undefined) window.turnstile?.remove(id);
    };
  }, [siteKey, onToken]);
  return <>
    <div ref={container} className="pa-turnstile" />
    {failed && <p role="alert">Không tải được xác minh chống bot. Vui lòng tải lại trang.</p>}
  </>;
}

/**
 * Turnstile in front of the browser's own auth calls. The browser still talks to Supabase/API
 * directly (so their per-IP limits see the real visitor); the server only checks the one-time
 * token first. Without a site key the gate is open (local dev, or before keys are installed).
 */
export function useTurnstileGate(siteKey?: string): { widget: ReactNode; check: () => Promise<string | null> } {
  const [token, setToken] = useState("");
  const [round, setRound] = useState(0);
  const onToken = useCallback((value: string) => setToken(value), []);
  const check = useCallback(async () => {
    if (!siteKey) return null;
    try {
      const { error } = await confirmHuman(token);
      return error;
    } catch {
      return "Không thể kết nối. Kiểm tra mạng rồi thử lại.";
    } finally {
      // Tokens are single-use: render a fresh widget after every attempt.
      setToken("");
      setRound((value) => value + 1);
    }
  }, [siteKey, token]);
  const widget = siteKey ? <TurnstileWidget key={round} siteKey={siteKey} onToken={onToken} /> : null;
  return { widget, check };
}
