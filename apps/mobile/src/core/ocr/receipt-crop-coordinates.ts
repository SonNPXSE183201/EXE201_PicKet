import type {ReceiptTextLine} from "./receipt-parser";

/** Keep word and line frames in the same full-image coordinate space. */
export function offsetReceiptCropLines(lines:ReceiptTextLine[],originX:number,originY:number):ReceiptTextLine[]{
 return lines.map(line=>({...line,
  left:line.left===undefined?undefined:line.left+originX,right:line.right===undefined?undefined:line.right+originX,
  top:line.top===undefined?undefined:line.top+originY,bottom:line.bottom===undefined?undefined:line.bottom+originY,
  elements:line.elements?.map(word=>({...word,left:word.left+originX,right:word.right+originX,top:word.top+originY,bottom:word.bottom+originY})),
 }));
}
