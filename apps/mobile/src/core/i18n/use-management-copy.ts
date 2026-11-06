import { useTranslation } from "react-i18next";
export function useManagementCopy(){
 const {t}=useTranslation("management");
 return (key:string,values:Record<string,string|number>={})=>t(key,{...values,nsSeparator:false});
}
