/** Shared geometry for every palette; circles, photos and charts keep their own shape. */
export const paperShape = {
  card: 22,
  pocketCorner: 14,
  input: 14,
  button: 24,
  chip: 14,
  icon: 16,
  sheet: 28,
} as const;
export const paperSpace = { screen: 20, section: 24, field: 16, row: 12, compact: 8 } as const;
export const paperControl = { height: 48, cardPadding: 16, rowHeight: 64, iconSize: 36 } as const;
export const paperType = { family: "PicketDisplay", handwriting: "PicketHandwriting", body: 15, caption: 12 } as const;
