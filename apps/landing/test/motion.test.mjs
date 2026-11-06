import assert from 'node:assert/strict';
import test from 'node:test';
import { addDemoExpense, emptyDemo, demoBudget } from '../site/launch-assets/paper-motion-state.js';

test('interactive preview totals only its published examples and preserves previous state',()=>{
 const initial=emptyDemo();const first=addDemoExpense(initial,'coffee');const second=addDemoExpense(first,'groceries');const third=addDemoExpense(second,'transport');
 assert.equal(third.total,135000);assert.equal(demoBudget-third.total,65000);assert.equal(third.count,3);assert.equal(third.last.label,'Di chuyển');
 assert.deepEqual(initial,emptyDemo());assert.equal(first.total,35000);
});
test('unknown examples never change preview totals',()=>{
 assert.throws(()=>addDemoExpense(emptyDemo(),'999999'),RangeError);
 assert.deepEqual(emptyDemo(),{total:0,count:0,last:null});
});
test('preview can exceed its example budget without hiding the recorded amount',()=>{
 let state=emptyDemo();for(let i=0;i<3;i++)state=addDemoExpense(state,'groceries');
 assert.equal(state.total,240000);assert.equal(demoBudget-state.total,-40000);
});
