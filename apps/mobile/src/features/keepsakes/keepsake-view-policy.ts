export function keepsakeCollectionState(loading: boolean, failed: boolean, visibleCount: number, query: string) {
  if (visibleCount > 0) return "items";
  if (loading) return "loading";
  if (failed) return "error";
  return query.trim() ? "no-results" : "empty";
}
