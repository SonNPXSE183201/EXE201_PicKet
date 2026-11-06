import { useEffect } from "react";
import { useProfile } from "@/features/profile/profile-context";
import { useAppTheme } from "./appearance-provider";

/** Mounted inside the owner-keyed profile tree; device overrides stay outside it. */
export function AccountAppearance() {
  const { profile } = useProfile();
  const { setAccountDefaults } = useAppTheme();
  const { id, locale, themeMode, languageMode, colorSchemeId } = profile ?? {};
  useEffect(() => {
    setAccountDefaults(id ? { locale, themeMode, languageMode, colorSchemeId } : {});
    return () => setAccountDefaults({});
  }, [id, locale, themeMode, languageMode, colorSchemeId, setAccountDefaults]);
  return null;
}
