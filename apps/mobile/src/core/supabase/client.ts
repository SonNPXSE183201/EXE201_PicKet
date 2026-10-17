import "react-native-url-polyfill/auto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { readPublicConfig } from "@/core/config/public-config";
import { secureAuthStorage } from "@/core/storage/secure-auth-storage";

const config = readPublicConfig();
// Same namespace as the SDK default; preserve existing installed sessions.
export const authStorageKey = config
  ? `sb-${new URL(config.supabaseUrl).hostname.split(".")[0]}-auth-token`
  : null;

export const supabase: SupabaseClient | null = config
  ? createClient(config.supabaseUrl, config.supabasePublishableKey, {
      auth: {
        storageKey: authStorageKey!,
        storage: secureAuthStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;
