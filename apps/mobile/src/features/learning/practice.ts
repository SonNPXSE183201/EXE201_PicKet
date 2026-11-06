export type NeedWantChoice = "need" | "want" | "depends";
/** Context is part of the question; no category of real spending is judged here. */
export const needWantScenarios = [
  { id: "medicine", accepted: ["need"] as NeedWantChoice[], vi: "Thuốc được kê để điều trị bệnh hiện tại.", en: "Prescribed medicine for a current illness.", whyVi: "Trong tình huống này thuốc phục vụ sức khỏe cần thiết; không đề nghị bỏ thuốc để tiết kiệm.", whyEn: "Here the medicine meets an essential health need; skipping treatment is not a savings action." },
  { id: "commute", accepted: ["need","depends"] as NeedWantChoice[], vi: "Chi phí đi làm, chưa rõ có phương án di chuyển phù hợp khác hay không.", en: "Travel to work, with no information about suitable alternatives.", whyVi: "Đi làm có thể là nhu cầu cần thiết. Mức chi phù hợp còn tùy an toàn, khả năng tiếp cận và phương án thực tế.", whyEn: "Getting to work can be essential. The suitable cost depends on safety, accessibility and realistic alternatives." },
  { id: "upgrade", accepted: ["want"] as NeedWantChoice[], vi: "Đổi sang điện thoại mới chỉ vì thích màu mới; máy hiện tại vẫn đáp ứng nhu cầu.", en: "Replacing a working phone solely to get a new color; the current phone meets your needs.", whyVi: "Theo dữ kiện này, đây là mong muốn. Mong muốn không xấu; bạn có thể cân nhắc sau nghĩa vụ và dự phòng.", whyEn: "Given these facts, this is a want. Wants are not bad; consider them alongside obligations and a buffer." },
] as const;
export function classifyNeedWant(id: string, choice: NeedWantChoice) {
  const scenario = needWantScenarios.find(row => row.id === id);
  if (!scenario || !["need","want","depends"].includes(choice)) throw new Error("Unknown practice choice");
  return { accepted: scenario.accepted.includes(choice), whyVi: scenario.whyVi, whyEn: scenario.whyEn };
}
function day(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Invalid review date");
  const parsed = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0,10) !== value) throw new Error("Invalid review day");
  return parsed;
}
export function reviewDueDays(completedDay: string) {
  const start = day(completedDay).getTime();
  return [7,30].map(offset => new Date(start+offset*86400000).toISOString().slice(0,10));
}
export function weekStartForDay(value:string) {
  const date=day(value);
  date.setUTCDate(date.getUTCDate()-(date.getUTCDay()+6)%7);
  return date.toISOString().slice(0,10);
}
type PracticeIdentity = { owner: string; weekStart: string; action: "review-records" };
export type PracticeEvent = PracticeIdentity & { skipped: boolean; xp: number };
export function completeWeeklyPractice(previous: PracticeEvent[], identity: PracticeIdentity, skipped: boolean): PracticeEvent[] {
  if (!/^[A-Za-z0-9_-]{1,200}$/.test(identity.owner) || day(identity.weekStart).getUTCDay() !== 1 || identity.action !== "review-records") throw new Error("Invalid weekly practice");
  const existing=previous.find(row => row.owner === identity.owner && row.weekStart === identity.weekStart && row.action === identity.action);
  if(existing) return existing.skipped && !skipped ? previous.map(row=>row===existing ? {...row,skipped:false,xp:10} : row) : [...previous];
  return [...previous,{...identity,skipped,xp:skipped ? 0 : 10}];
}
