export interface PublicConfig {
  apiUrl: string;
  supabaseUrl: string;
  supabasePublishableKey: string;
}

const fallbackApiUrl = "http://10.0.2.2:8080";

export function readPublicConfig(): PublicConfig | null {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL?.trim() || fallbackApiUrl;
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const supabasePublishableKey =
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";

  if (
    !/^https:\/\//.test(supabaseUrl) ||
    !supabasePublishableKey ||
    /replace_me|your-project/i.test(
      `${supabaseUrl} ${supabasePublishableKey}`,
    )
  ) {
    return null;
  }

  return { apiUrl, supabaseUrl, supabasePublishableKey };
}
