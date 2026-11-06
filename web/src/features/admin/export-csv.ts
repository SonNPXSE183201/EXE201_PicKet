function cell(value: unknown): string {
  let text =
    value == null
      ? ""
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);
  // Spreadsheet applications must not execute formulas from user-controlled
  // account names, email local parts, ticket titles or incident descriptions.
  if (/^[\s\u0000-\u001f]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text))
    text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}
export function exportCsv(data: unknown): string {
  const records: Record<string, unknown>[] = [];
  if (Array.isArray(data)) {
    for (const item of data)
      if (item && typeof item === "object") records.push(item);
  } else if (data && typeof data === "object") {
    for (const [part, value] of Object.entries(data)) {
      if (Array.isArray(value)) {
        for (const item of value)
          if (item && typeof item === "object")
            records.push({ report_part: part, ...item });
      }
    }
  }
  const keys = [...new Set(records.flatMap(Object.keys))];
  return (
    "\ufeff" +
    [
      keys.map(cell).join(","),
      ...records.map((row) => keys.map((key) => cell(row[key])).join(",")),
    ].join("\r\n")
  );
}
