'use client';
import Link from 'next/link';
import { useState } from 'react';
import { vietnamDate } from '@/core/finance/overview';
export function ReceiptCalendar({dates,initialMonth,selectedDay}:{dates:string[];initialMonth:string;selectedDay?:string}){
 const [month,setMonth]=useState(initialMonth);const [year,m]=month.split('-').map(Number),first=new Date(Date.UTC(year,m-1,1)),offset=(first.getUTCDay()+6)%7,count=new Date(Date.UTC(year,m,0)).getUTCDate();
 const counts=new Map<string,number>();for(const d of dates){const key=vietnamDate(d);counts.set(key,(counts.get(key)??0)+1);}
 const shift=(n:number)=>{const d=new Date(month+'-15T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+n);setMonth(d.toISOString().slice(0,7));};
 return <section className="data-panel receipt-calendar" aria-labelledby="receipt-calendar-title"><div className="panel-heading"><h2 id="receipt-calendar-title">Lịch hóa đơn</h2><Link href="/capture">Thêm ảnh</Link></div><div className="calendar-period"><button type="button" aria-label="Tháng trước" onClick={()=>shift(-1)}>‹</button><strong>Tháng {m}, {year}</strong><button type="button" aria-label="Tháng sau" onClick={()=>shift(1)}>›</button></div><div className="calendar-grid">{['T2','T3','T4','T5','T6','T7','CN'].map(d=><span className="calendar-weekday" key={d}>{d}</span>)}{Array.from({length:offset},(_,i)=><span key={'blank'+i}/>)}{Array.from({length:count},(_,i)=>{const date=month+'-'+String(i+1).padStart(2,'0'),n=counts.get(date)??0;return <Link key={date} className={n?'has-receipt':''} href={'/receipts?day='+date} aria-current={date===selectedDay?'date':undefined} aria-label={`${i+1}/${m}/${year}, ${n} hóa đơn`}><span>{i+1}</span>{n>0&&<small>{n} ảnh</small>}</Link>;})}</div><p>Chạm vào ngày để xem hóa đơn đã lưu.</p></section>;
}
