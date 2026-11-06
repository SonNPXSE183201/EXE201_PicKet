export function parseScenarioMoney(value:string):number {
  if(!/^-?\d{1,13}$/.test(value))throw new Error("Enter whole minor units without separators");
  const amount=Number(value);
  if(!Number.isSafeInteger(amount)||Math.abs(amount)>9e12)throw new Error("Amount exceeds scenario limit");
  return amount;
}
