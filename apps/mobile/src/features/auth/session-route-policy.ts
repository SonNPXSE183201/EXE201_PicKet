/** Redirecting screens must not consume a cold deep link during auth recovery. */
export function canMountSessionRoutes(loading: boolean) {
  return !loading;
}
