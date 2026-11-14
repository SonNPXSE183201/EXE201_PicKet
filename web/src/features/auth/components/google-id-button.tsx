"use client";

import { useEffect, useRef } from "react";

import { createClient } from "@/core/supabase/client";

interface GoogleIdentity {
  initialize(options: {
    client_id: string;
    nonce: string;
    callback(response: { credential: string }): void;
    ux_mode: "popup";
    use_fedcm_for_button: boolean;
    itp_support: boolean;
  }): void;
  renderButton(container: HTMLElement, options: {
    theme: "outline";
    shape: "pill";
    size: "large";
    text: "continue_with";
    locale: "vi";
    width: number;
  }): void;
}

function googleIdentity(): GoogleIdentity | undefined {
  return (window as Window & { google?: { accounts?: { id?: GoogleIdentity } } }).google?.accounts?.id;
}

let scriptPromise: Promise<GoogleIdentity> | undefined;

function loadGoogleIdentity(): Promise<GoogleIdentity> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const ready = googleIdentity();
    if (ready) return resolve(ready);
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    const timeout = window.setTimeout(() => fail(), 15000);
    function fail() {
      window.clearTimeout(timeout);
      reject(new Error("Google Identity Services unavailable"));
    }
    script.onerror = fail;
    script.onload = () => {
      window.clearTimeout(timeout);
      const identity = googleIdentity();
      if (identity) resolve(identity);
      else fail();
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

interface GoogleIdButtonProps {
  googleClientId: string;
  disabled?: boolean;
  onSuccess(): void | Promise<void>;
  onError(): void;
  onUnavailable(): void;
}

export function GoogleIdButton({ googleClientId, disabled, onSuccess, onError, onUnavailable }: GoogleIdButtonProps) {
  const container = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onSuccess, onError, onUnavailable, disabled });
  useEffect(() => {
    callbacks.current = { onSuccess, onError, onUnavailable, disabled };
  }, [onSuccess, onError, onUnavailable, disabled]);

  useEffect(() => {
    let active = true;
    let exchanging = false;
    const target = container.current;
    async function initialize() {
      try {
        const identity = await loadGoogleIdentity();
        const bytes = crypto.getRandomValues(new Uint8Array(32));
        const rawNonce = btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
        const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rawNonce));
        const hashedNonce = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
        if (!active || !target) return;
        identity.initialize({
          client_id: googleClientId,
          nonce: hashedNonce,
          ux_mode: "popup",
          use_fedcm_for_button: true,
          itp_support: true,
          callback: async (response) => {
            if (!active || exchanging || callbacks.current.disabled) return;
            exchanging = true;
            try {
              const { error } = await createClient().auth.signInWithIdToken({
                provider: "google", token: response.credential, nonce: rawNonce,
              });
              if (error) throw error;
              if (active) await callbacks.current.onSuccess();
            } catch {
              if (active) callbacks.current.onError();
            } finally {
              exchanging = false;
            }
          },
        });
        identity.renderButton(target, {
          theme: "outline", shape: "pill", size: "large", text: "continue_with", locale: "vi",
          width: Math.min(target.getBoundingClientRect().width, 400),
        });
      } catch {
        if (active) callbacks.current.onUnavailable();
      }
    }
    void initialize();
    return () => {
      active = false;
      target?.replaceChildren();
    };
  }, [googleClientId]);

  return <div ref={container} aria-label="Đăng nhập bằng Google" inert={disabled} style={{ width: "100%" }} />;
}
