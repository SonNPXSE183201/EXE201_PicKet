export interface CashflowSchedule {
  id:string;startDay:string;endDay?:string;frequency:"once"|"weekly"|"monthly";
  amount:number;currency:string;active:boolean;
  /** Omitted on legacy/manual schedules; required for a verified wallet scenario. */
  walletId?:string;
}
export interface CashflowScheduleDocument {
  schemaVersion:1;revision:number;schedules:CashflowSchedule[];
  /** Revision at which this idempotent mutation originally applied. */
  appliedRevision?:number;
}
