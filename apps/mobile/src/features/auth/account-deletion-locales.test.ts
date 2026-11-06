import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {test} from "node:test";
import {createAppI18n} from "../../core/i18n/instance";
test("account deletion copy explains pre-request erasure and confirmed-deletion sign-out retry in vi/en",async()=>{
 const copy=createAppI18n("vi");assert.match(copy.t("localNotice",{ns:"accountDeletion"}),/trước khi gửi/);await copy.changeLanguage("en");
 assert.match(copy.t("deletedSignOut",{ns:"accountDeletion"}),/Do not send account deletion again/);
 const screen=readFileSync(resolve(process.cwd(),"src/app/delete-account.tsx"),"utf8");
 assert.match(screen,/retireLocal:.*retireAccountLocalData/);assert.match(screen,/if\(remoteDeleted\)\{await signOut\(\)/);assert.match(screen,/\{t\(message\)\}/);
 const retirement=readFileSync(resolve(process.cwd(),"src/features/auth/account-local-retirement.ts"),"utf8");
 assert.ok(retirement.indexOf("await retireOfflineCacheOwner")<retirement.indexOf("await purgeRetiredMutationOwner"));
 assert.match(screen,/result\?\.deleted!==true/);
 assert.match(screen,/requestOwnerRecovery\(owner,true\)/);
 assert.match(screen,/requestOwnerRecovery\(owner\)/);
 assert.match(screen,/requestOwnerRecovery\(owner,false,"cleanupFailed"\)/);
 assert.doesNotMatch(screen,/>[^<\n]*[À-ỹĐđ][^<\n]*</);
});
