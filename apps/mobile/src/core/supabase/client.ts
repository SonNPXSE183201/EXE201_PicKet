import "react-native-url-polyfill/auto";

import { createClient, processLock, type SupabaseClient } from "@supabase/supabase-js";
import { fetch as expoFetch } from "expo/fetch";

import { readPublicConfig } from "@/core/config/public-config";
import { secureAuthStorage } from "@/core/storage/secure-auth-storage";
import { createAuthFetch } from "@/features/auth/auth-fetch";

const config = readPublicConfig();
// Same namespace as the SDK default; preserve existing installed sessions.
export const authStorageKey = config
  ? `sb-${new URL(config.supabaseUrl).hostname.split(".")[0]}-auth-token`
  : null;

export const supabase: SupabaseClient | null = config
  ? createClient(config.supabaseUrl, config.supabasePublishableKey, {
      global: { fetch: createAuthFetch(globalThis.fetch.bind(globalThis), `${config.supabaseUrl.replace(/\/$/, "")}/auth/v1`, 10_000, expoFetch) },
      auth: {
        storageKey: authStorageKey!,
        storage: secureAuthStorage,
        // Shared with explicit offline logout cleanup. Keep covered against
        // the installed SDK: its legacy custom lock path is still supported.
        lock: processLock,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;
