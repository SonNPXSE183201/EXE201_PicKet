export function calendarDate(month: string, day: number) {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month);
  if (!match || !Number.isInteger(day) || day < 1 || day > new Date(Number(match[1]), Number(match[2]), 0).getDate()) throw new Error("Invalid calendar date.");
  return `${month}-${String(day).padStart(2, "0")}`;
}
export function displayCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "Chọn ngày";
  return value.split("-").reverse().join("/");
}
export function shiftCalendarMonth(month: string, offset: number) {
  const [year, number] = month.split("-").map(Number);
  const date = new Date(year, number - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2,"0")}`;
}
