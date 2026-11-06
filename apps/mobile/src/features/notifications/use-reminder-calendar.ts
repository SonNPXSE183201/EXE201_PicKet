import {useEffect,useState} from "react";
import {AppState} from "react-native";
function calendar(){
 const date=new Date();
 const month=String(date.getFullYear())+"-"+String(date.getMonth()+1).padStart(2,"0");
 return {month,day:month+"-"+String(date.getDate()).padStart(2,"0"),offset:date.getTimezoneOffset(),now:date.getTime()};
}
/** Recompute date-dependent reminders without rebuilding the native batch every minute. */
export function useReminderCalendar(){
 const [value,setValue]=useState(calendar);
 useEffect(()=>{
  let active=true;
  const refresh=()=>{if(!active)return;const next=calendar();setValue(previous=>previous.day===next.day&&previous.offset===next.offset?previous:next);};
  const timer=setInterval(refresh,60_000);
  const listener=AppState.addEventListener("change",state=>{if(state==="active")refresh();});
  return()=>{active=false;clearInterval(timer);listener.remove();};
 },[]);
 return value;
}
