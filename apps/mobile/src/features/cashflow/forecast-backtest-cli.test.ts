import assert from "node:assert/strict";
import {mkdtempSync,readFileSync,writeFileSync,unlinkSync,rmdirSync} from "node:fs";
import {tmpdir} from "node:os";
import {join,resolve} from "node:path";
import {spawnSync} from "node:child_process";
import {test} from "node:test";
test("offline benchmark CLI reports synthetic provenance and refuses overwrites without logging input",()=>{
 const directory=mkdtempSync(join(tmpdir(),"picket-backtest-")),output=join(directory,"report.json"),input=join(directory,"bad.json");
 const run=(args:string[])=>spawnSync(process.execPath,["--import","tsx",resolve("scripts/forecast-backtest.ts"),...args],{encoding:"utf8",timeout:20000});
 try{
  const first=run(["--synthetic","--output",output]);assert.equal(first.status,0,first.stderr);
  const before=readFileSync(output,"utf8"),report=JSON.parse(before);assert.equal(report.source.kind,"synthetic");assert.equal(report.origins.length,14);assert.equal(report.excludedOrigins,2);assert.equal(report.promotionDecision,"not-evaluated");
  assert.equal(run(["--synthetic","--output",output]).status,1);assert.equal(readFileSync(output,"utf8"),before);
  writeFileSync(input,'{"private":"never-echo-this-value"}');const bad=run(["--input",input,"--output",join(directory,"unused.json")]);assert.equal(bad.status,1);assert.doesNotMatch(bad.stderr+bad.stdout,/never-echo-this-value/);
 }finally{try{unlinkSync(output);}catch{/* Failed first creation has no output. */}try{unlinkSync(input);}catch{/* An earlier assertion may precede fixture creation. */}rmdirSync(directory);}
});
