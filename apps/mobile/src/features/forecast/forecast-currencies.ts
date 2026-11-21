/** Currencies the user holds, with the profile currency first. */
export function forecastCurrencies(accounts: { currencyCode: string; archived: boolean; deletedAt: string | null }[], preferred: string): string[] {
  const codes = [...new Set(accounts.filter(a => !a.archived && !a.deletedAt).map(a => a.currencyCode))];
  return codes.includes(preferred) ? [preferred, ...codes.filter(code => code !== preferred)] : codes;
}
