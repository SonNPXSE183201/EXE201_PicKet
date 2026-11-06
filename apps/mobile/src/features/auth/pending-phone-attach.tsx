import { useEffect, useRef } from "react";
import { picketApi } from "@/core/api/client";
import { supabase } from "@/core/supabase/client";
import { useAuth } from "./auth-context";
import { pendingPhone } from "./phone-sign-in";

/**
 * A phone chosen at sign-up is attached once the email OTP has created a
 * session, then removed from user metadata. It stays "unverified" until an
 * SMS provider confirms ownership. Failures retry on the next session.
 */
export function PendingPhoneAttach() {
  const { session } = useAuth();
  const done = useRef<string | null>(null);
  const phone = pendingPhone(session?.user);
  const token = session?.access_token;
  useEffect(() => {
    if (!phone || !token || !picketApi || done.current === `${session?.user.id}:${phone}`) return;
    done.current = `${session?.user.id}:${phone}`;
    void picketApi
      .accountPhone(token, { phone })
      .catch((error: { status?: number }) => {
        // 409/23505: the number belongs to another account; drop it rather than retry forever.
        if (error?.status !== 409 && error?.status !== 400) {
          done.current = null;
          throw error;
        }
      })
      .then(() => supabase?.auth.updateUser({ data: { pending_phone: null } }))
      .catch(() => undefined);
  }, [phone, session?.user.id, token]);
  return null;
}
