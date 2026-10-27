export const CSV_BOM = '﻿';
export const CSV_SEPARATOR = ',';

const FORMULA_PREFIX = /^[=+\-@\t\r]/;

export function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  let text = value instanceof Date ? value.toISOString() : String(value);

  // evita inyeccion de formulas al abrir el archivo en Excel
  if (typeof value === 'string' && FORMULA_PREFIX.test(text)) {
    text = `'${text}`;
  }
  if (/[",\r\n]/.test(text)) {
    text = `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function toCsvRow(values: unknown[]): string {
  return values.map(escapeCsvValue).join(CSV_SEPARATOR) + '\r\n';
}
