/** One source for dock visibility and content clearance, including enlarged text. */
export function dockVisibleOn(pathname: string) {
  return ["/", "/transactions", "/accounts", "/budgets", "/planning", "/profile"].includes(pathname.replace(/\/$/, "") || "/");
}

export function screenBottomPadding(pathname: string, bottomInset: number, fontScale: number) {
  return dockVisibleOn(pathname)
    ? 124 + bottomInset + Math.max(0, fontScale - 1) * 80
    : 24 + bottomInset;
}
