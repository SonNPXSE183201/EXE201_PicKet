/** VND is entered as whole units; keep raw digit strings for existing validators. */
export function normalizeMoneyInput(value: string): string {
  return /^-?[\d.,\s]*$/.test(value) ? value.replace(/[.,\s]/g, "") : value;
}

export function formatMoneyInput(value: string): string {
  const raw = normalizeMoneyInput(value);
  if (!/^-?\d+$/.test(raw)) return raw;
  return raw.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
