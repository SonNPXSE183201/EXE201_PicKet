import type { LearningActivityEvent,LearningActivityDocument,CloudLearningProgress } from "@picket/domain";
import type { LearningProgress } from "./progress";
import { reviewDueDays, weekStartForDay, type PracticeEvent } from "./practice";

export function pendingLearningActivity(progress:LearningProgress,practice:PracticeEvent[],verified:CloudLearningProgress[],cloud:LearningActivityDocument,today:string):LearningActivityEvent[]{
  const week=weekStartForDay(today);
  const events:LearningActivityEvent[]=[];
  for(const row of progress.completed){
    const server=verified.find(item=>item.lesson_id===row.lessonId&&item.content_version===row.version);
    if(!server)continue;
    const due=reviewDueDays(new Date(server.completed_at).toISOString().slice(0,10));
    for(const offset of row.reviewedOffsets??[]){
      if((offset!==7&&offset!==30)||due[offset===7?0:1]>today||cloud.reviews.some(item=>item.lessonId===row.lessonId&&item.contentVersion===row.version&&item.offset===offset))continue;
      events.push({kind:"review",lessonId:row.lessonId,contentVersion:row.version,offset});
    }
  }
  for(const row of practice){
    if(row.weekStart>week)continue;
    const existing=cloud.practice.find(item=>item.weekStart===row.weekStart);
    if(!existing||(existing.skipped&&!row.skipped))events.push({kind:"practice",weekStart:row.weekStart,skipped:row.skipped});
  }
  return events;
}
