import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {test} from "node:test";
import {createAppI18n} from "../../core/i18n/instance";
import {settlementCloudVi,settlementCloudEn} from "../../core/i18n/settlement-cloud-resources";
test("manual settlement synchronization explains replacement and durable retry in both locales",async()=>{
 const i18n=createAppI18n("vi");
 assert.match(i18n.t("settlementCloudPublish",{ns:"cashflow"}),/toàn bộ/);
 await i18n.changeLanguage("en");
 assert.match(i18n.t("settlementCloudPending",{ns:"cashflow"}),/not send it automatically/);
 assert.equal(i18n.t("settlementCloudNumber",{ns:"cashflow",count:23}),"Link 23");
 for(const key of Object.keys(settlementCloudVi))assert.ok(settlementCloudEn[key as keyof typeof settlementCloudEn]);
 const ui=readFileSync(resolve(process.cwd(),"src/features/cashflow/settlement-cloud-card.tsx"),"utf8");
 assert.match(ui,/EXPO_PUBLIC_CASHFLOW_CLOUD_ENABLED/);assert.match(ui,/session\?\.user.id!==owner/);
 assert.match(ui,/state!=="active"/);assert.match(ui,/setReview\(null\);setRecovery\(false\)/);
 assert.doesNotMatch(ui,/setInterval|console\.log/);
});
