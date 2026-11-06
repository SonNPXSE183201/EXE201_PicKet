import assert from "node:assert/strict";
import test from "node:test";
import {offsetReceiptCropLines} from "./receipt-crop-coordinates";
test("detail retry translates line and word frames together without mutating OCR input",()=>{
 const line={text:'2 20000',left:2,right:90,top:3,bottom:20,elements:[{text:'2',left:2,right:10,top:3,bottom:20}]};
 const result=offsetReceiptCropLines([line],30,200)[0];
 assert.equal(result.top,203);assert.equal(result.left,32);
 assert.deepEqual(result.elements?.[0],{text:'2',left:32,right:40,top:203,bottom:220});
 assert.equal(line.top,3);assert.equal(line.elements[0].top,3);
});
