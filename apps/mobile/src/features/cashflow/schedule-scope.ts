import type { CashflowSchedule } from "./schedules";
export function scopeSchedules(rows:CashflowSchedule[],accounts:string[],currency:string):CashflowSchedule[]{
 if(!accounts.length||new Set(accounts).size!==accounts.length||!/^[A-Z]{3}$/.test(currency))throw new Error("Invalid schedule wallet scope");
 const eligible=rows.filter(row=>row.active&&row.currency===currency);
 if(eligible.some(row=>!row.walletId))throw new Error("Assign a wallet to all active schedules first");
 return eligible.filter(row=>accounts.includes(row.walletId!));
}
