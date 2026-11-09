import { MAX_MONEY } from "@picket/domain";

/** One receipt line while editing; all fields are text from inputs. */
export type EditableReceiptLine = { key: string; name: string; quantity: string; unitPrice: string; total: string };

export type ReceiptLineInput = { name: string; quantity: number; unitPrice: number | null; total: number; confidence: number | null };

export const MAX_RECEIPT_LINES = 100;

export function editableReceiptLines(items: { id?: string; name: string; quantity: number; unitPrice: number | null; total: number }[], keyPrefix = "line"): EditableReceiptLine[] {
  return items.map((item, index) => ({
    key: item.id ?? `${keyPrefix}-${index}`,
    name: item.name,
    quantity: String(item.quantity),
    unitPrice: item.unitPrice === null ? "" : String(item.unitPrice),
    total: String(item.total),
  }));
}

export function blankReceiptLine(key: string): EditableReceiptLine {
  return { key, name: "", quantity: "1", unitPrice: "", total: "" };
}

/** Editing quantity or unit price recomputes the line total when both are valid. */
export function updateReceiptLine(lines: EditableReceiptLine[], key: string, field: keyof Omit<EditableReceiptLine, "key">, value: string): EditableReceiptLine[] {
  return lines.map((line) => {
    if (line.key !== key) return line;
    const next = { ...line, [field]: value };
    if (field === "quantity" || field === "unitPrice") {
      const quantity = Number(next.quantity.replace(",", "."));
      const unitPrice = Number.parseInt(next.unitPrice.replace(/\D/g, ""), 10);
      if (quantity > 0 && Number.isSafeInteger(unitPrice) && unitPrice >= 0) next.total = String(Math.round(quantity * unitPrice));
    }
    return next;
  });
}

/** Validates edited lines exactly like the server contract; returns a message key on the first invalid line. */
export function parseReceiptLines(lines: EditableReceiptLine[]): { ok: true; lines: ReceiptLineInput[] } | { ok: false; message: string } {
  if (lines.length > MAX_RECEIPT_LINES) return { ok: false, message: "Một hóa đơn chỉ hỗ trợ tối đa 100 sản phẩm." };
  const parsed: ReceiptLineInput[] = [];
  for (const line of lines) {
    const quantity = Number(line.quantity.replace(",", "."));
    const totalText = line.total.replace(/\D/g, "");
    const unitText = line.unitPrice.replace(/\D/g, "");
    const total = Number.parseInt(totalText, 10);
    const unitPrice = unitText === "" ? null : Number.parseInt(unitText, 10);
    const invalid = !line.name.trim() || line.name.trim().length > 200 ||
      !Number.isFinite(quantity) || quantity <= 0 || quantity > 1_000_000 ||
      !/^\d+$/.test(totalText) || total <= 0 || total > MAX_MONEY ||
      (unitPrice !== null && (unitPrice > MAX_MONEY || Math.abs(Math.round(quantity * unitPrice) - total) > 1));
    if (invalid) return { ok: false, message: "Kiểm tra tên, số lượng, đơn giá và thành tiền của từng sản phẩm." };
    parsed.push({ name: line.name.trim(), quantity, unitPrice, total, confidence: null });
  }
  return { ok: true, lines: parsed };
}

/** Lines are only sent to the server when they actually changed. */
export function receiptLinesChanged(before: EditableReceiptLine[], after: EditableReceiptLine[]) {
  const shape = (lines: EditableReceiptLine[]) => JSON.stringify(lines.map(({ name, quantity, unitPrice, total }) => [name.trim(), quantity, unitPrice, total]));
  return shape(before) !== shape(after);
}

export function receiptLinesTotal(lines: EditableReceiptLine[]) {
  return lines.reduce((sum, line) => {
    const value = Number.parseInt(line.total.replace(/\D/g, ""), 10);
    return sum + (Number.isSafeInteger(value) ? value : 0);
  }, 0);
}
