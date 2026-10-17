export const colors = {
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
} as const;

export const radii = {
  small: 12,
  medium: 18,
  large: 24,
  card: 24,
  pill: 999,
} as const;

export const spacing = {
  xsmall: 6,
  small: 10,
  medium: 16,
  screen: 20,
  section: 24,
  large: 32,
} as const;

export const typography = {
  display: { fontSize: 29, lineHeight: 35, fontWeight: "800" },
  title: { fontSize: 20, lineHeight: 26, fontWeight: "700" },
  body: { fontSize: 15, lineHeight: 23, fontWeight: "400" },
  label: { fontSize: 12, lineHeight: 16, fontWeight: "700" },
  amount: { fontSize: 38, lineHeight: 44, fontWeight: "800" },
} as const;

export const shadows = {
  card: {
    elevation: 0,
    shadowColor: "#4A2C2A",
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
  },
  floating: {
    elevation: 8,
    shadowColor: "#4A2C2A",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
} as const;
