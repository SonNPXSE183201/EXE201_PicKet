/** Native Android font family (app.json expo-font plugin) holding Nunito 400/600/700/800 as real weights. */
export const picketNativeFamily = "PicketNunito";

export function paperTextStyle(style: { fontSize?: number; lineHeight?: number; fontFamily?: string; fontWeight?: string | number }, fontsReady: boolean, nested = false): { fontFamily?: string; fontSize?: number; lineHeight?: number; fontWeight?: "400" | "600" | "700" | "800" } {
  if (nested) return {};
  const fontSize = style.fontSize ?? 15;
  const weight = style.fontWeight === "bold" ? 700 : Number(style.fontWeight ?? 400);
  const bucket = weight >= 800 ? "800" : weight >= 700 ? "700" : weight >= 500 ? "600" : "400";
  const custom = style.fontFamily && style.fontFamily !== "PicketDisplay" && style.fontFamily !== picketNativeFamily;
  return {
    // One family with real weights keeps Android text measurement and drawing on the same face (separate single-weight families clipped bold text).
    ...(custom ? { fontFamily: style.fontFamily } : fontsReady ? { fontFamily: picketNativeFamily, fontWeight: bucket } : {}),
    fontSize,
    lineHeight: style.lineHeight ?? Math.ceil(fontSize * (fontSize >= 24 ? 1.3 : 1.45)),
  };
}
