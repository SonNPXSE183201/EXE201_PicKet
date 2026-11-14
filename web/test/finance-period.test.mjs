import assert from 'node:assert/strict';
import test from 'node:test';
import {bucketKeys,bucketLabel,financeRange,parseAnchor,parseFinancePeriod,shiftAnchor,chartPlan,weekKey} from '../src/features/admin/finance-period.ts';
test('ranges use Vietnam midnight boundaries',()=>{
 const d=financeRange('day','2026-11-13');
 assert.equal(d.from,'2026-11-12T17:00:00.000Z');assert.equal(d.to,'2026-11-13T17:00:00.000Z');
 const w=financeRange('week','2026-11-13'); // Friday
 assert.equal(w.start,'2026-11-09');assert.equal(w.end,'2026-11-15');
 const m=financeRange('month','2026-02-10');assert.equal(m.end,'2026-02-28');
 const q=financeRange('quarter','2026-11-13');assert.equal(q.start,'2026-10-01');assert.equal(q.end,'2026-12-31');assert.equal(q.label,'Quý 4/2026');
 const y=financeRange('year','2026-11-13');assert.equal(y.start,'2026-01-01');assert.equal(y.end,'2026-12-31');
});
test('anchor rejects invalid and future values',()=>{
 const now=new Date('2026-11-13T05:00:00Z');
 assert.equal(parseAnchor('2026-13-40',now),'2026-11-13');
 assert.equal(parseAnchor('2030-01-01',now),'2026-11-13');
 assert.equal(parseAnchor('2026-11-01',now),'2026-11-01');
 assert.equal(parseFinancePeriod('x'),'month');
});
test('navigation and chart plan',()=>{
 assert.equal(shiftAnchor('month','2026-03-31',-1),'2026-02-01');
 assert.equal(shiftAnchor('quarter','2026-11-13',-1),'2026-07-01');
 assert.equal(chartPlan('week','2026-11-13').bucket,'week');
 assert.equal(chartPlan('quarter','2026-11-13').bucket,'quarter');
 assert.equal(chartPlan('year','2026-11-13').rpcBucket,'month');
 assert.equal(weekKey('2026-11-15'),'2026-11-09');
});
import {canViewAdminSection} from '../src/features/admin/admin-permissions.ts';
test('finance menu needs revenue.read only',()=>{
 assert.equal(canViewAdminSection('staff','finance',['revenue.read']),true);
 assert.equal(canViewAdminSection('staff','finance',['payments.read']),false);
});
test('chart shows every unit even without revenue',()=>{
 const m=chartPlan('day','2026-11-13');
 assert.equal(bucketKeys(m.bucket,m.start,m.end).length,30);
 const q=chartPlan('quarter','2026-11-13');
 assert.deepEqual(bucketKeys(q.bucket,q.start,q.end),['2026-01-01','2026-04-01','2026-07-01','2026-10-01']);
 const y=chartPlan('year','2026-11-13');
 assert.deepEqual(bucketKeys(y.bucket,y.start,y.end).map(k=>bucketLabel('year',k)),['2023','2024','2025','2026']);
 const w=chartPlan('week','2026-11-13');
 assert.equal(bucketKeys(w.bucket,w.start,w.end).length,14);
 assert.equal(bucketKeys('month',chartPlan('month','2026-11-13').start,chartPlan('month','2026-11-13').end).length,12);
});
