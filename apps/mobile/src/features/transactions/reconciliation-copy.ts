import {createInstance} from "i18next";
import {formatMoney,type AppLanguage} from "../../core/i18n/formatters";
import {reconciliationVi,reconciliationEn} from "../../core/i18n/reconciliation-resources";
const copy=createInstance();
void copy.init({lng:"vi",fallbackLng:"vi",initAsync:false,keySeparator:false,
  interpolation:{escapeValue:false},resources:{vi:{reconciliation:reconciliationVi},en:{reconciliation:reconciliationEn}}});
export type ReconciliationNotice = { difference:number; local:boolean; refreshFailed:boolean };
export function reconciliationNoticeCopy(notice:ReconciliationNotice, language:AppLanguage):string {
  const t=copy.getFixedT(language,"reconciliation");
  const success=notice.difference===0 ? t("success") : t(notice.local ? "adjustedLocal" : "adjusted",{amount:formatMoney(Math.abs(notice.difference),language,"VND")});
  return success+(notice.refreshFailed ? t("refreshFailed") : "");
}
