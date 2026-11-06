import { curriculum, type Completion } from "./curriculum";
import { weekStartForDay, type PracticeEvent } from "./practice";
export type LearningMilestone="firstLesson"|"threeLessons"|"allLessons"|"reviewedLesson"|"practicedWeek";
export function learningMilestones(owner:string,completed:Completion[],practice:PracticeEvent[]):{xp:number;badges:LearningMilestone[]}{
  const lessons=new Map(completed.filter(row=>row.owner===owner&&row.xp===20&&curriculum.lessons.some(item=>item.lessonId===row.lessonId&&item.version===row.version)).map(row=>[`${row.lessonId}:${row.version}`,row]));
  const weeks=new Set(practice.filter(row=>row.owner===owner&&!row.skipped&&row.xp===10&&row.action==="review-records"&&weekStartForDay(row.weekStart)===row.weekStart).map(row=>row.weekStart));
  const badges:LearningMilestone[]=[];
  if(lessons.size>=1)badges.push("firstLesson");
  if(lessons.size>=3)badges.push("threeLessons");
  if(lessons.size===curriculum.lessons.length)badges.push("allLessons");
  if([...lessons.values()].some(row=>row.reviewedOffsets?.some(offset=>offset===7||offset===30)))badges.push("reviewedLesson");
  if(weeks.size>0)badges.push("practicedWeek");
  return {xp:lessons.size*20+weeks.size*10,badges};
}
