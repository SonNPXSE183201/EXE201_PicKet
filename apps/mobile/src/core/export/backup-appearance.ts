import { parseDeviceSettings, type ThemeMode } from "../../features/settings/device-settings";
type BackupAppearance={themeMode?:ThemeMode|null;languageMode?:string|null;colorSchemeId?:string|null};
/** Optional fields remain absent in old backups; null clears an account default. */
export function backupAppearance(value:unknown):BackupAppearance{
  if(!value||typeof value!=="object"||Array.isArray(value))throw new Error("Invalid backup preferences");
  const fields=value as Record<string,unknown>;
  const keys=["themeMode","languageMode","colorSchemeId"] as const;
  const present=Object.fromEntries(keys.filter(key=>fields[key]!==undefined&&fields[key]!==null).map(key=>[key,fields[key]]));
  const {version,...parsed}=parseDeviceSettings(JSON.stringify({version:1,...present}));
  void version;
  return {...parsed,...Object.fromEntries(keys.filter(key=>fields[key]===null).map(key=>[key,null]))};
}
