import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { ownerPreferenceKeys, isOwnerReminder, purgeOwnerPreferences, type PreferenceRetirementSource } from "./owner-preferences";
import { createBudgetNoticeDelivery } from "../../features/notifications/budget-notice-delivery";
import { createOwnerCacheLifecycle } from "../sync/owner-cache-lifecycle";

const a="aaaaaaaa-1111-4111-8111-111111111111", b="bbbbbbbb-1111-4111-8111-111111111111";
function fixture(){
  const keys=new Set([...Object.values(ownerPreferenceKeys(a)),...Object.values(ownerPreferenceKeys(b)),...Object.values(ownerPreferenceKeys("device-guest")),"picket_device_appearance_v1","picket_offline_cache_key_v1","sb-project-auth-token"]);
  const scheduled=new Set([`picket-${a}-bill:one`,`picket-${b}-bill:two`,"picket-device-guest-bill:guest","picket-global-update"]);
  const presented=new Set([`picket-${a}-budget:food:2026-10`,`picket-${b}-budget:food:2026-10`]);
  const forgotten:string[]=[];
  const source:PreferenceRetirementSource={isRetired:async()=>true,scheduled:async()=>[...scheduled],presented:async()=>[...presented],
    cancel:async id=>{scheduled.delete(id);},dismiss:async id=>{presented.delete(id);},removeKey:async key=>{keys.delete(key);},forgetBudget:owner=>{forgotten.push(owner);},
  };return {keys,scheduled,presented,forgotten,source};
}

test("owner keys preserve the existing native namespace while malformed identities cannot collide",()=>{
  const suffix=a.replaceAll("-","_");
  assert.deepEqual(ownerPreferenceKeys(a),{reminders:`picket_reminders_${suffix}`,reminderRead:`picket_reminder_read_${suffix}`,budgetDelivered:`picket_budget_delivered_${suffix}`,deviceLock:`picket_device_lock_${suffix}`});
  for(const owner of ["", "../b", a.replace("-","_"),"a-b","a_b",a+"-suffix"])assert.throws(()=>ownerPreferenceKeys(owner),/owner/);
  assert.equal(isOwnerReminder(`picket-${a}-bill:one`,a),true);
  assert.equal(isOwnerReminder(`picket-${b}-bill:one`,a),false);
  assert.equal(isOwnerReminder(`picket-${a}x-bill:one`,a),false);
});

test("preference retirement cancels/dismisses only owned notifications and removes only the four owned keys",async()=>{
  const f=fixture();await purgeOwnerPreferences(a,f.source);await purgeOwnerPreferences(a,f.source);
  assert.deepEqual([...f.scheduled].sort(),[`picket-${b}-bill:two`,"picket-device-guest-bill:guest","picket-global-update"].sort());
  assert.deepEqual([...f.presented],[`picket-${b}-budget:food:2026-10`]);
  assert.ok(Object.values(ownerPreferenceKeys(a)).every(key=>!f.keys.has(key)));
  assert.ok(Object.values(ownerPreferenceKeys(b)).every(key=>f.keys.has(key)));
  assert.ok(Object.values(ownerPreferenceKeys("device-guest")).every(key=>f.keys.has(key)));
  for(const key of ["picket_device_appearance_v1","picket_offline_cache_key_v1","sb-project-auth-token"])assert.ok(f.keys.has(key));
  assert.deepEqual(f.forgotten,[a,a]);
});

test("active owners are not purged; notification and key failures propagate and remain retryable",async()=>{
  const f=fixture();
  await assert.rejects(purgeOwnerPreferences(a,{...f.source,isRetired:async()=>false}),/retired/);
  await assert.rejects(purgeOwnerPreferences(a,{...f.source,cancel:async()=>{throw Error("OS error");}}),/OS error/);
  assert.ok(f.keys.has(ownerPreferenceKeys(a).reminders));
  await assert.rejects(purgeOwnerPreferences(a,{...f.source,removeKey:async()=>{throw Error("keystore error");}}),/keystore error/);
  assert.deepEqual(f.forgotten,[]);await purgeOwnerPreferences(a,f.source);
});

test("budget delivery forgets only the retired owner's in-memory acknowledgement",async()=>{
  const stored=new Map<string,string[]>(),shown:string[]=[];
  const delivery=createBudgetNoticeDelivery({read:async owner=>stored.get(owner)??[],save:async(owner,ids)=>{stored.set(owner,ids);},show:async owner=>{shown.push(owner);}});
  const id="budget:food:2026-10";await delivery.deliver(a,[id]);await delivery.deliver(b,[id]);
  const forget=Reflect.get(delivery,"forgetOwner") as (owner:string)=>void;assert.equal(typeof forget,"function");
  forget(a);stored.delete(a);await delivery.deliver(a,[id]);await delivery.deliver(b,[id]);
  assert.deepEqual(shown,[a,b,a]);
});

test("a dispatched late OS schedule drains before erasure and later owner writes remain blocked",{timeout:2000},async()=>{
  const f=fixture();let release!:()=>void,started!:()=>void;
  const entered=new Promise<void>(resolve=>{started=resolve;}),gate=new Promise<void>(resolve=>{release=resolve;});
  const retired=new Set<string>();const lifecycle=createOwnerCacheLifecycle({isRetired:async owner=>retired.has(owner),retire:async owner=>{retired.add(owner);},resume:async owner=>{retired.delete(owner);}});
  const scheduling=lifecycle.run(a,async()=>{started();await gate;f.scheduled.add(`picket-${a}-late-reminder`);});
  await entered;const retirement=lifecycle.retire(a).then(()=>purgeOwnerPreferences(a,{...f.source,isRetired:lifecycle.isRetired}));
  release();await scheduling;await retirement;
  assert.ok(![...f.scheduled].some(id=>isOwnerReminder(id,a)));
  await assert.rejects(lifecycle.run(a,async()=>{f.keys.add(ownerPreferenceKeys(a).deviceLock);}),/retired/);
});

test("native reminder scheduling, read-state and device-lock writes share the retirement fence",()=>{
  const reminders=readFileSync(new URL("../../features/notifications/reminders.ts",import.meta.url),"utf8");
  const lock=readFileSync(new URL("../../features/security/device-lock.tsx",import.meta.url),"utf8");
  const retirement=readFileSync(new URL("../../features/auth/account-local-retirement.ts",import.meta.url),"utf8");
  assert.match(reminders,/withLocalOwnerAccess\(userId/);
  assert.match(reminders,/storedRemindersEnabled\(userId\)/);
  assert.match(reminders,/purgeOwnerPreferences/);assert.match(reminders,/budgetNoticeDelivery.forgetOwner/);
  assert.match(lock,/withLocalOwnerAccess\(session.user.id/);assert.match(lock,/ownerPreferenceKeys/);
  assert.match(retirement,/await purgeRetiredOwnerPreferences\(owner\)/);
});
