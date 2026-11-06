import { useTranslation } from "react-i18next";
import { formatMoney,localeFor } from "@/core/i18n/formatters";
import { useAppTheme } from "@/features/settings/appearance-provider";
import { renderTransactionNotice,type TransactionNotice } from "./transaction-copy";
export type { TransactionNotice } from "./transaction-copy";
export function useTransactionCopy(){
 const {t}=useTranslation("transactions"),{language}=useAppTheme();
 return {tx:(key:TransactionNotice,options:Record<string,string|number>={})=>renderTransactionNotice(key,language,(value,values)=>t(value,{...values,nsSeparator:false}),options),
  locale:localeFor(language),money:(amount:number)=>formatMoney(amount,language,"VND")};
}
