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
  // Local Supabase/isolated Auth fixtures are usable only in a development
  // build on loopback or Android's host bridge. Release preflight stays HTTPS.
  const localDevelopmentAuth =
    typeof __DEV__ !== "undefined" && __DEV__ &&
    /^http:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)(:\d+)?\/?$/.test(supabaseUrl);

  if (
    (!/^https:\/\//.test(supabaseUrl) && !localDevelopmentAuth) ||
    !supabasePublishableKey ||
    /replace_me|your-project/i.test(
      `${supabaseUrl} ${supabasePublishableKey}`,
    )
  ) {
    return null;
  }

  return { apiUrl, supabaseUrl, supabasePublishableKey };
}
