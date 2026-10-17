import assert from "node:assert/strict";
import test from "node:test";

import { parseEditedConflictPayload } from "./conflict-resolution";

test("accepts an edited object payload for retry", () => {
  assert.deepEqual(
    parseEditedConflictPayload('{"id":"item","request":{"expectedVersion":4,"title":"Mới"}}'),
    { id: "item", request: { expectedVersion: 4, title: "Mới" } },
  );
});

test("rejects arrays, scalars and invalid JSON", () => {
  for (const value of ["[]", "null", '"text"', "not-json"]) {
    assert.throws(() => parseEditedConflictPayload(value), /JSON object/);
  }
});
