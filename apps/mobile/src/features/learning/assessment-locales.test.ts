import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createAppI18n } from "../../core/i18n/instance";
import { assessmentVi, assessmentEn } from "../../core/i18n/assessment-resources";
import { assessmentCriteria } from "./assessment-draft";

test("assessment rubric and storage states have complete vi/en copy without translating the draft", async () => {
  assert.deepEqual(Object.keys(assessmentVi).sort(), Object.keys(assessmentEn).sort());
  const i18n = createAppI18n("vi");
  for (const language of ["vi", "en"] as const) {
    await i18n.changeLanguage(language);
    for (const key of Object.keys(assessmentVi)) assert.ok(i18n.exists(key, { ns: "assessment" }));
    for (const criterion of assessmentCriteria) { assert.ok(i18n.exists(criterion.id, { ns: "assessment" })); assert.ok(i18n.exists(`${criterion.id}Hint`, { ns: "assessment" })); }
  }
  assert.equal(i18n.t("characters", { ns: "assessment", count: 23, max: 4000 }), "23/4000 characters");
  assert.equal(i18n.t("clearError", { ns: "assessment" }), assessmentEn.clearError);
  const source = readFileSync("src/app/learning-preview.tsx", "utf8");
  assert.match(source, /if \(!featureFlags\.learning \|\| !owner\) return <Redirect/);
  assert.match(source, /AssessmentDraftCard key=\{owner\} owner=\{owner\}/);
});
