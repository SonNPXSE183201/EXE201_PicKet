export function paperTextStyle(style: { fontSize?: number; lineHeight?: number; fontFamily?: string; fontWeight?: string | number }, fontsReady: boolean, nested = false): { fontFamily?: string; fontSize?: number; lineHeight?: number } {
  if (nested) return {};
  const fontSize = style.fontSize ?? 15;
  const weight = style.fontWeight === "bold" ? 700 : Number(style.fontWeight ?? 400);
  const family = weight >= 800 ? "PicketExtraBold" : weight >= 700 ? "PicketBold" : weight >= 500 ? "PicketSemibold" : "PicketDisplay";
  return {
    fontFamily: style.fontFamily && style.fontFamily !== "PicketDisplay" ? style.fontFamily : fontsReady ? family : undefined,
    fontSize,
    lineHeight: style.lineHeight ?? Math.ceil(fontSize * (fontSize >= 24 ? 1.3 : 1.45)),
  };
}
