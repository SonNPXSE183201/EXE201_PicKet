type PreferenceKeys={reminders:string;reminderRead:string;budgetDelivered:string;deviceLock:string};
export type PreferenceRetirementSource={
  isRetired(owner:string):Promise<boolean>;
  scheduled():Promise<string[]>;presented():Promise<string[]>;
  cancel(id:string):Promise<void>;dismiss(id:string):Promise<void>;
  removeKey(key:string):Promise<void>;forgetBudget(owner:string):void;
};
function validateOwner(owner:string){
  // Auth UUIDs have a fixed layout: legacy punctuation sanitizing cannot alias
  // another owner. Reject arbitrary strings instead of inventing colliding keys.
  if(owner!=="device-guest"&&!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(owner))throw Error("Invalid preference owner");
}
export function ownerPreferenceKeys(owner:string):PreferenceKeys{
  validateOwner(owner);const suffix=owner.replace(/[^a-zA-Z0-9]/g,"_");
  return {reminders:`picket_reminders_${suffix}`,reminderRead:`picket_reminder_read_${suffix}`,budgetDelivered:`picket_budget_delivered_${suffix}`,deviceLock:`picket_device_lock_${suffix}`};
}
export function isOwnerReminder(identifier:string,owner:string):boolean{
  validateOwner(owner);return identifier.startsWith(`picket-${owner}-`);
}
export async function purgeOwnerPreferences(owner:string,source:PreferenceRetirementSource):Promise<void>{
  const keys=ownerPreferenceKeys(owner);
  if(!await source.isRetired(owner))throw Error("Preference owner must be retired before erasure");
  for(const id of await source.scheduled())if(isOwnerReminder(id,owner))await source.cancel(id);
  for(const id of await source.presented())if(isOwnerReminder(id,owner))await source.dismiss(id);
  for(const key of Object.values(keys))await source.removeKey(key);
  source.forgetBudget(owner);
}
