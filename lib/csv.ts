const FORMULA_PREFIX_RE = /^[=+\-@\t\r]/;

/**
 * Formats a CSV cell safely with RFC-4180 quote escaping and formula-injection neutralization.
 */
export function formatCsvCell(raw: unknown): string {
  if (raw === null || raw === undefined) return '""';
  let str = String(raw);
  if (FORMULA_PREFIX_RE.test(str)) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Parses RFC-4180 CSV text into rows of fields, preserving multiline quoted fields
 * and unescaping doubled quotes (`""` -> `"`).
 */
export function parseCsvMatrix(csvData: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < csvData.length; i++) {
    const char = csvData[i];
    const nextChar = csvData[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (!inQuotes) {
      if (char === ',') {
        currentRow.push(currentField);
        currentField = '';
        continue;
      }

      if (char === '\r') {
        continue;
      }

      if (char === '\n') {
        currentRow.push(currentField);
        if (currentRow.some((cell) => cell.trim() !== '') || currentRow.length > 1) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
        continue;
      }
    }

    currentField += char;
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.some((cell) => cell.trim() !== '') || currentRow.length > 1) {
      rows.push(currentRow);
    }
  }

  return rows;
}
