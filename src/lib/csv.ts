/**
 * CSV encoding with spreadsheet formula-injection protection: cells that
 * start with = + - @ (or tab/CR) are prefixed with an apostrophe.
 */
export function csvCell(value: unknown): string {
  let s = Array.isArray(value)
    ? value.map((v) => (typeof v === "object" && v !== null ? Object.values(v).join(": ") : String(v))).join("; ")
    : value === null || value === undefined
      ? ""
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(columns: { key: string; label: string }[], rows: Record<string, unknown>[]): string {
  const lines = [columns.map((c) => csvCell(c.label)).join(",")];
  for (const row of rows) lines.push(columns.map((c) => csvCell(row[c.key])).join(","));
  // BOM so Excel opens UTF-8 (en dashes, accents) correctly.
  return "﻿" + lines.join("\r\n") + "\r\n";
}
