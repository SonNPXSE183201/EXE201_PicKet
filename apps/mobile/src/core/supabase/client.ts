import "react-native-url-polyfill/auto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { readPublicConfig } from "@/core/config/public-config";
import { secureAuthStorage } from "@/core/storage/secure-auth-storage";

const config = readPublicConfig();

export const supabase: SupabaseClient | null = config
  ? createClient(config.supabaseUrl, config.supabasePublishableKey, {
      auth: {
        storage: secureAuthStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;
