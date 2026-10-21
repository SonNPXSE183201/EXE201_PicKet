/** VND is entered as whole units; keep raw digit strings for existing validators. */
export function normalizeMoneyInput(value: string): string {
  return /^-?[\d.,\s]*$/.test(value) ? value.replace(/[.,\s]/g, "") : value;
}

export function formatMoneyInput(value: string): string {
  const raw = normalizeMoneyInput(value);
  if (!/^-?\d+$/.test(raw)) return raw;
  return raw.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function editMoneyInput(previous: string, next: string, selection?: { start: number; end: number }) {
  let start = 0;
  while (start < previous.length && start < next.length && previous[start] === next[start]) start++;
  let end = previous.length, nextEnd = next.length;
  while (end > start && nextEnd > start && previous[end - 1] === next[nextEnd - 1]) { end--; nextEnd--; }
  let caret = Math.max(0, Math.min(next.length, selection ? selection.end + next.length - previous.length : nextEnd));
  // Backspacing a grouping mark must remove a digit rather than reinsert the
  // same separator forever. Never coerce long digit strings through Number.
  if (previous.slice(start, end) === "." && nextEnd === start && start > 0 && /\d/.test(previous[start - 1])) {
    next = next.slice(0, start - 1) + next.slice(start);
    caret = start - 1;
  }
  const raw = normalizeMoneyInput(next);
  const rawCaret = normalizeMoneyInput(next.slice(0, caret)).length;
  const display = formatMoneyInput(raw);
  let seen = 0, position = 0;
  while (position < display.length && seen < rawCaret) { if (display[position] !== ".") seen++; position++; }
  return { raw, selection: { start: position, end: position } };
}
