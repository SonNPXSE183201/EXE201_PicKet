import assert from 'node:assert/strict';import test from 'node:test';
import {inferReceiptRotation,orientReceiptLines} from './receipt-direction';
for(const [angle,expected] of [[1,0],[179,180],[91,270],[-89,90]] as const)test(`native text direction ${angle} chooses correction ${expected} without another OCR pass`,()=>{
 const lines=['PICKET DEMO','Ngày mua','Tổng thanh toán'].map((text,index)=>({text,angle,confidence:0.95,top:10+index*30,bottom:30+index*30,left:10,right:150}));
 assert.equal(inferReceiptRotation(lines),expected);
});
test('conflicting text directions do not authorize an orientation guess',()=>{
 const lines=[0,180,0,180].map(angle=>({text:'Product label',angle,confidence:0.95}));assert.equal(inferReceiptRotation(lines),null);
});
test('rotated bounding boxes return to upright document coordinates',()=>{
 const result=orientReceiptLines([{text:'PICKET DEMO',left:60,right:90,top:170,bottom:190}],100,200,180);
 assert.deepEqual(result.map(({left,right,top,bottom})=>({left,right,top,bottom})),[{left:10,right:40,top:10,bottom:30}]);
});
