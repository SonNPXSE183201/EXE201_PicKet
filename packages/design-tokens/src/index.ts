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

/** Fixed mobile geometry from the 360 px Final UI reference. */
export const mobileLayout = {
  screenWidth: 360,
  screenInset: 20,
  dockInset: 16,
  dockHeight: 68,
  dockBottom: 14,
  floatingActionSize: 56,
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

/** Figma "Final UI" light theme (file EyBH1sJNAXqUH9auOUk0WI). Mobile reads these through the paper theme. */
export const figmaColors = {
  canvas: "#FFF8ED",
  surface: "#FFFCF5",
  paper: "#FFFFFF",
  border: "#EADDD5",
  text: "#302132",
  muted: "#72636E",
  primary: "#793268",
  onPrimary: "#FFFFFF",
  camera: "#793268",
  onCamera: "#FFFFFF",
  selectedSurface: "#FDE6D8",
  elevated: "#FBEBDD",
  expense: "#9F2545",
  income: "#116044",
  success: "#166534",
  successSurface: "#E8F5EF",
  warning: "#854D0E",
  warningSurface: "#FFF3CD",
  pocketCoral: "#FFB4A2",
  pocketBlue: "#B8D8E2",
  pocketMint: "#BCE0B4",
  pocketLilac: "#DDCBE8",
} as const;

/** Nunito text styles from Figma (fontWeight 600/700/800 map to PicketSemibold/Bold/ExtraBold). */
export const figmaType = {
  display: { fontSize: 22, lineHeight: 29, fontWeight: "800", letterSpacing: -0.3 },
  amountHero: { fontSize: 34, lineHeight: 42, fontWeight: "800", letterSpacing: -0.6 },
  amountPocket: { fontSize: 18, lineHeight: 26, fontWeight: "800" },
  amountRow: { fontSize: 14, lineHeight: 21, fontWeight: "800" },
  titleSection: { fontSize: 16, lineHeight: 26, fontWeight: "800" },
  overline: { fontSize: 11, lineHeight: 16, fontWeight: "800", letterSpacing: 1.1 },
  bodyStrong: { fontSize: 14, lineHeight: 21, fontWeight: "700" },
  bodySmall: { fontSize: 12, lineHeight: 18, fontWeight: "600" },
  captionStrong: { fontSize: 12, lineHeight: 18, fontWeight: "700" },
  button: { fontSize: 13, lineHeight: 19, fontWeight: "800" },
  micro: { fontSize: 10, lineHeight: 15, fontWeight: "800", letterSpacing: 0.3 },
  tab: { fontSize: 10, lineHeight: 16, fontWeight: "600" },
  tabActive: { fontSize: 10, lineHeight: 16, fontWeight: "800" },
} as const;

export const figmaRadii = { pill: 999, card: 24, receipt: 18, tile: 12, pocketTab: 14, dock: 34, pouch: 32, pouchCorner: 16, chip: 999, button: 24, iconButton: 22 } as const;

export const figmaShadows = {
  stub: { color: "#302133", opacity: 0.12, offsetY: 2, radius: 6 },
  paper: { color: "#302133", opacity: 0.07, offsetY: 3, radius: 10 },
  camera: { color: "#793268", opacity: 0.3, offsetY: 3, radius: 8 },
  dock: { color: "#783369", opacity: 0.1, offsetY: 8, radius: 24 },
} as const;
