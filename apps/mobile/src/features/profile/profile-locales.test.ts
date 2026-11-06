import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import ts from "typescript";
import { profileVi,profileEn } from "../../core/i18n/profile-resources";

test("profile UI and its controlled messages have English resources",()=>{
  const file=resolve(process.cwd(),"src/app/profile.tsx");
  const source=ts.createSourceFile(file,readFileSync(file,"utf8"),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const keys=new Set<string>();
  function visit(node:ts.Node){
    if(ts.isStringLiteral(node)&&/[À-ỹĐđ]/.test(node.text)&&node.text!=="Đã")keys.add(node.text);
    if(ts.isJsxText(node)&&/[À-ỹĐđ]/.test(node.text.trim()))keys.add(node.text.trim());
    ts.forEachChild(node,visit);
  }
  visit(source);
  for(const key of keys){assert.ok((profileVi as Record<string,string>)[key],`Missing Vietnamese key: ${key}`);assert.ok((profileEn as Record<string,string>)[key],`Missing English key: ${key}`);}
  assert.equal(profileEn["Đi làm"],"Working");
});
