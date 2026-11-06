import { colors as sharedColors, radii as baseRadii } from "@picket/design-tokens";
import { paperShape } from "../theme/paper-foundations";
import { paperLight } from "../theme/themes";
export { spacing } from "@picket/design-tokens";
export const typography = {
  display: { fontSize: 26, lineHeight: 34, fontWeight: "800" },
  title: { fontSize: 18, lineHeight: 25, fontWeight: "700" },
  body: { fontSize: 15, lineHeight: 22, fontWeight: "400" },
  label: { fontSize: 12, lineHeight: 18, fontWeight: "600" },
  amount: { fontSize: 32, lineHeight: 40, fontWeight: "800" },
} as const;
export const radii = { ...baseRadii, small: paperShape.input, medium: 24, card: paperShape.card } as const;

/** Mobile appearance evolves independently from the web palette. */
export const colors = {
  ...sharedColors,
  onPrimary: "#FFFFFF",
  cream: paperLight.canvas,
  peach: paperLight.elevated,
  coral: paperLight.pocketCoral,
  mauve: paperLight.primary,
  ink: paperLight.text,
  muted: paperLight.muted,
  line: paperLight.border,
} as const;
