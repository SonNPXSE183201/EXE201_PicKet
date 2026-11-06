import type { ReceiptTextLine } from "./receipt-parser";
import {receiptHasTableColumns} from "./receipt-table-layout";
// Keep crop edges away from thin glyphs and table rules.
const CROP_MARGIN_GRID_PX = 50;
const clean=(text:string)=>text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d").replace(/\s+/g," ").trim();
/** Refine only a complete left-to-right table; keep original coordinates for merging. */
export function receiptTableCrop(lines: ReceiptTextLine[]): {originX:number; originY:number; width:number; height:number}|null {
 if(!receiptHasTableColumns(lines))return null;
 const positioned=lines.filter((line):line is ReceiptTextLine&{left:number;right:number;top:number;bottom:number}=>
  [line.left,line.right,line.top,line.bottom].every(value=>typeof value==='number'&&Number.isFinite(value))&&line.right!>line.left!&&line.bottom!>line.top!);
 const names=positioned.filter(line=>/^(ten (?:san pham|hang hoa)(?:,? dich vu)?|san pham|mat hang|item|description)$/.test(clean(line.text)));
 if(names.length!==1)return null;const name=names[0],padding=(name.bottom-name.top)*2;
 const headers=positioned.filter(line=>Math.abs(line.top-name.top)<=padding&&/^(so luong|sl|qty|don gia|unit price|price|thanh tien|amount|total)$/.test(clean(line.text)));
 const last=headers.find(line=>/^(thanh tien|amount|total)$/.test(clean(line.text)));
 if(!last||last.left<=name.left||headers.length<3)return null;
 const end=Math.min(Infinity,...positioned.filter(line=>line.top>name.bottom&&/^(tong|total|subtotal|tien hang|tien thue|tien thanh toan|hang hoa\s*\/\s*dich vu)\b/.test(clean(line.text))).map(line=>line.top));
 const body=positioned.filter(line=>line.top>=name.top-padding&&line.bottom<end&&line.top>=name.top);
 if(body.length<6)return null;
 const left=Math.max(0,Math.floor(Math.min(...body.map(line=>line.left))-padding));
 const right=Math.ceil(Math.max(...body.map(line=>line.right))+padding);
 const top=Math.max(0,Math.floor((name.top-padding)/CROP_MARGIN_GRID_PX)*CROP_MARGIN_GRID_PX);
 const bottom=Math.min(end,Math.ceil((Math.max(...body.map(line=>line.bottom))+padding)/CROP_MARGIN_GRID_PX)*CROP_MARGIN_GRID_PX);
 return bottom>top&&right>left?{originX:left,originY:top,width:right-left,height:bottom-top}:null;
}
