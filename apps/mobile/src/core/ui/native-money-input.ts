import { formatMoneyInput, normalizeMoneyInput } from "./money-input";

type Selection = { start: number; end: number };
/** Do not replay a controlled caret over a user's tap or select-all operation. */
export function shouldReleaseMoneySelection(selected: Selection, target?: Selection, native?: unknown) {
  const echo = native as Selection | undefined;
  return !!target && !(selected.start === target.start && selected.end === target.end)
    && !(echo && selected.start === echo.start && selected.end === echo.end);
}

/** Selection belongs to `next` in the same Android text-change event, not a separate cursor event. */
export function editNativeMoneyInput(previous: string, next: string, nativeSelection?: unknown) {
  let start = 0;
  while (start < previous.length && start < next.length && previous[start] === next[start]) start++;
  let end = previous.length, nextEnd = next.length;
  while (end > start && nextEnd > start && previous[end - 1] === next[nextEnd - 1]) { end--; nextEnd--; }
  const selection = nativeSelection as { start?: number; end?: number } | null | undefined;
  let caret = selection && Number.isInteger(selection.start) && Number.isInteger(selection.end)
    && selection.start! >= 0 && selection.end! >= selection.start! && selection.end! <= next.length
    ? selection.end! : nextEnd;
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
