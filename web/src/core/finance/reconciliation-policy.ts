/** Existing Supabase reconciliation RPC rejects dates after current_date (UTC). */
export function latestStatementDay(now=new Date()){return now.toISOString().slice(0,10);}
export function validStatementDay(value:string,latest:string){return /^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value&&value<=latest;}
