import assert from "node:assert/strict";
import test from "node:test";

import { colors, radii, shadows, spacing, typography } from "@picket/design-tokens";

test("Expo and Next share the complete legacy Picket visual language", () => {
  assert.deepEqual(colors, {
    cream: "#FFF8F0",
    peach: "#FFD6BA",
    coral: "#FFB4A2",
    mauve: "#96606D",
    ink: "#4A2C2A",
    muted: "#806268",
    expense: "#BD3152",
    income: "#147D62",
    white: "#FFFFFF",
    line: "#F2E7DF",
    successSurface: "#E8F5EF",
    dangerSurface: "#FBEFF2",
  });
  assert.equal(spacing.screen, 20);
  assert.equal(spacing.section, 24);
  assert.equal(radii.card, 24);
  assert.equal(typography.display.fontSize, 29);
  assert.equal(typography.display.fontWeight, "800");
  assert.equal(shadows.card.elevation, 0);
});
