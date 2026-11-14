/** Firebase web config for SMS sign-up (Firebase Phone Auth). */
export type FirebaseWebConfig = { apiKey: string; authDomain: string; projectId: string };

// Read inside the function: runtime configuration, never a build arg (same as Turnstile).
export function firebaseWebConfig(env: Record<string, string | undefined> = process.env): FirebaseWebConfig | undefined {
  const apiKey = env.FIREBASE_WEB_API_KEY?.trim();
  const projectId = env.FIREBASE_PROJECT_ID?.trim();
  if (!apiKey || !projectId) return undefined;
  const authDomain = env.FIREBASE_AUTH_DOMAIN?.trim() || `${projectId}.firebaseapp.com`;
  return { apiKey, authDomain, projectId };
}
