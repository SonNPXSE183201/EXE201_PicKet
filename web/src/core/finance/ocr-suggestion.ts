export function ocrSuggestion(result:Record<string,unknown>){
 const value:{merchant?:string;amount?:string;date?:string}={};
 if(typeof result.merchant==='string'&&result.merchant.trim().length<=160)value.merchant=result.merchant.trim();
 const amount=result.amount??result.detectedTotal??result.total;
 if(typeof amount==='number'&&Number.isSafeInteger(amount)&&amount>0&&amount<=9e12)value.amount=String(amount);
 const date=result.date??result.purchasedAt;
 if(typeof date==='string'&&/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(date)&&!Number.isNaN(Date.parse(date)))value.date=date.slice(0,10);
 return value;
}
