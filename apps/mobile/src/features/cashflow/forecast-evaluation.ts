export type BalanceDay={day:string;balance:number;currency:string};
function calendarDay(value:string){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new Error("Invalid evaluation day");
  const time=Date.parse(`${value}T00:00:00Z`);
  if(!Number.isFinite(time)||new Date(time).toISOString().slice(0,10)!==value)throw new Error("Invalid evaluation day");
  return time;
}
/** Evaluate an aligned, fully observed 7/30-day path. Never fills missing truth
 * with zero or chooses/activates a forecast model from these metrics alone. */
export function evaluateForecast(predicted:BalanceDay[],actual:BalanceDay[]){
  if(![7,30].includes(predicted.length)||actual.length!==predicted.length)throw new Error("Incomplete evaluation horizon");
  const origin=calendarDay(predicted[0].day),currency=predicted[0].currency;
  if(!/^[A-Z]{3}$/.test(currency))throw new Error("Invalid evaluation currency");
  let absoluteError=0,missedLowBalanceDays=0,falseLowBalanceDays=0,predictedMinimum=0,actualMinimum=0;
  for(let index=0;index<predicted.length;index++){
    for(const row of [predicted[index],actual[index]]){
      if(row.currency!==currency||calendarDay(row.day)!==origin+index*86400000||!Number.isSafeInteger(row.balance)||Math.abs(row.balance)>9e12)throw new Error("Misaligned or invalid evaluation truth");
    }
    const estimate=predicted[index].balance,truth=actual[index].balance;
    absoluteError+=Math.abs(estimate-truth);
    if(estimate>=0&&truth<0)missedLowBalanceDays++;
    if(estimate<0&&truth>=0)falseLowBalanceDays++;
    if(estimate<predicted[predictedMinimum].balance)predictedMinimum=index;
    if(truth<actual[actualMinimum].balance)actualMinimum=index;
  }
  return {currency,evaluatedDays:predicted.length,mae:absoluteError/predicted.length,
    missedLowBalanceDays,falseLowBalanceDays,minimumDayError:Math.abs(predictedMinimum-actualMinimum)};
}
