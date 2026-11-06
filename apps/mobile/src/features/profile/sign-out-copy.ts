export function signOutCopy(pending: number, conflicts: number) {
  return pending > 0 || conflicts > 0 ? "signOutPending" : "signOutClean";
}
