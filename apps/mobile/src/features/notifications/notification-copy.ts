import { formatCalendarDate,localeFor,type AppLanguage } from "../../core/i18n/formatters";
import { createInstance } from "i18next";
import { notificationsVi,notificationsEn } from "../../core/i18n/notification-resources";
const instance=createInstance();
void instance.init({lng:"vi",fallbackLng:"vi",initAsync:false,keySeparator:false,interpolation:{escapeValue:false},resources:{vi:{notifications:notificationsVi},en:{notifications:notificationsEn}}});
function copy(language:AppLanguage){return instance.getFixedT(language,"notifications");}
export type ReminderKind="bill"|"subscription"|"return"|"warranty"|"budget";
export function reminderLabel(kind:ReminderKind,title:string,dueAt:string,language:AppLanguage="vi"):string{
 const date=kind==="bill"?(/^\d{4}-\d{2}-\d{2}$/.test(dueAt)?formatCalendarDate(dueAt,language):new Intl.DateTimeFormat(localeFor(language)).format(new Date(dueAt))):"";
 return copy(language)(kind+"Label",{title,date});
}
export function privateReminderCopy(kind:"budget"|"reminder",language:AppLanguage="vi"):{title:string;body:string;channel:string}{
 const t=copy(language);return {title:t(kind+"Title"),body:t(kind+"Body"),channel:t("channel")};
}
