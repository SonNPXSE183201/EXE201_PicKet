import assert from "node:assert/strict";
import { test } from "node:test";
import { curriculum, gradeQuiz } from "./curriculum";
test("sparse answer arrays are incomplete rather than a submitted zero",()=>{
 assert.throws(()=>gradeQuiz(curriculum.lessons[0],new Array(3)));
});
