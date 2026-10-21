/** Reserve room for two-line navigation labels at enlarged Android font scales. */
export function floatingActionBottom(fontScale: number, bottomInset: number): number {
  return Math.max(100, 88 + bottomInset + Math.max(0, fontScale - 1) * 80);
}

/** Keep extended labels from covering most of a compact, enlarged-text screen. */
export function floatingActionIconOnly(requested: boolean, fontScale: number, width: number): boolean {
  return requested || fontScale >= 1.5 || width < 360;
}
