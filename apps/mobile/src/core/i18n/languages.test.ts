import assert from "node:assert/strict";
import { test } from "node:test";
import { languageCodes, languages } from "./languages";
test("registered languages carry complete namespaces and placeholder sets", () => {
  const namespaces=Object.keys(languages.vi).filter(key=>!["name","locale","direction"].includes(key)) as (keyof Omit<typeof languages.vi,"name"|"locale"|"direction">)[];
  for (const id of languageCodes) for (const namespace of namespaces) {
    const expected = languages.vi[namespace], actual = languages[id][namespace];
    assert.deepEqual(Object.keys(actual).sort(),Object.keys(expected).sort());
    for (const key of Object.keys(expected)) {
      const placeholders = (text:string) => [...text.matchAll(/{{\s*(\w+)\s*}}/g)].map(m=>m[1]).sort();
      assert.deepEqual(placeholders((actual as Record<string,string>)[key]),placeholders((expected as Record<string,string>)[key]));
    }
  }
});
