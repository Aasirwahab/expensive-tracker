// Escape a single CSV cell, with protection against CSV/formula injection.
function csvCell(value: string | number | null | undefined): string {
  let s = value == null ? "" : String(value);
  // Neutralize cells that a spreadsheet might treat as a formula.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  // Quote if the cell contains a comma, quote, or newline.
  if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(
  headers: string[],
  rows: (string | number | null | undefined)[][],
): string {
  const lines = [headers.map(csvCell).join(",")];
  for (const row of rows) lines.push(row.map(csvCell).join(","));
  return lines.join("\r\n");
}
