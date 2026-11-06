import { formatMoney,type AppLanguage } from "../../core/i18n/formatters";
export type TransactionNotice=string|{key:string;values?:Record<string,string|number>;money?:number};
export function renderTransactionNotice(notice:TransactionNotice,language:AppLanguage,translate:(key:string,values:Record<string,string|number>)=>string,options:Record<string,string|number>={}){
 return typeof notice==="string"?translate(notice,options):translate(notice.key,{...notice.values,...(notice.money===undefined?{}:{amount:formatMoney(notice.money,language,"VND")})});
}
