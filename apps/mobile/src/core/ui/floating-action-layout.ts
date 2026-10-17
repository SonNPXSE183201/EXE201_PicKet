/** Reserve room for two-line navigation labels at enlarged Android font scales. */
export function floatingActionBottom(fontScale: number, bottomInset: number): number {
  return Math.max(100, 88 + bottomInset + Math.max(0, fontScale - 1) * 80);
}
