import { createBrowserClient } from "@supabase/ssr";

import { getSupabasePublicConfig } from "@/core/supabase/config";

export function createClient() {
  const { publishableKey, url } = getSupabasePublicConfig();
  return createBrowserClient(url, publishableKey);
}
