import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export function csvToJson(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const json = JSON.stringify(result.data, null, 2);
        resolve(new Blob([json], { type: 'application/json' }));
      },
      error: reject,
    });
  });
}

export async function jsonToCsv(file: File): Promise<Blob> {
  const text = await file.text();
  const data = JSON.parse(text);
  const rows = Array.isArray(data) ? data : [data];
  const csv = Papa.unparse(rows);
  return new Blob([csv], { type: 'text/csv' });
}

export function csvToExcel(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const sheet = XLSX.utils.json_to_sheet(result.data as Record<string, unknown>[]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1');
        const out = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
        resolve(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      },
      error: reject,
    });
  });
}

export interface CsvCleanResult {
  blob: Blob;
  rowsBefore: number;
  rowsAfter: number;
}

/** Trims whitespace, drops fully-empty rows/columns, and removes exact
 * duplicate rows. Deliberately simple defaults — see docs/TOOL_SPECS.md. */
export function csvClean(file: File): Promise<CsvCleanResult> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const rowsBefore = result.data.length;
        const fields = result.meta.fields ?? [];

        const trimmed = result.data.map((row) => {
          const out: Record<string, string> = {};
          for (const key of fields) out[key] = (row[key] ?? '').trim();
          return out;
        });

        const nonEmptyFields = fields.filter((f) => trimmed.some((row) => row[f] !== ''));
        const projected = trimmed
          .filter((row) => nonEmptyFields.some((key) => row[key] !== ''))
          .map((row) => {
            const out: Record<string, string> = {};
            for (const key of nonEmptyFields) out[key] = row[key];
            return out;
          });

        const seen = new Set<string>();
        const deduped = projected.filter((row) => {
          const key = JSON.stringify(row);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        const csv = Papa.unparse(deduped);
        resolve({ blob: new Blob([csv], { type: 'text/csv' }), rowsBefore, rowsAfter: deduped.length });
      },
      error: reject,
    });
  });
}
