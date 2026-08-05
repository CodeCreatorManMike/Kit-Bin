import * as XLSX from 'xlsx';
import { zipSync, strToU8 } from 'fflate';

export interface ExcelResult {
  blob: Blob;
  filename: string;
}

const EXCEL_EXTENSIONS = ['.xlsx', '.xls', '.xlsm'];

/** True when the filename looks like a workbook this tool can read. */
export function isExcelFile(name: string): boolean {
  const lower = name.toLowerCase();
  return EXCEL_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function baseName(name: string): string {
  return name.replace(/\.(xlsx|xls|xlsm)$/i, '');
}

/** Sheet names can contain characters that are illegal in filenames. */
function safeName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '-').trim() || 'sheet';
}

async function readWorkbook(file: File): Promise<XLSX.WorkBook> {
  const bytes = await file.arrayBuffer();
  // cellDates gives real Date values for date-formatted cells instead of the
  // raw serial number. Formulas are never returned as text: SheetJS reads the
  // cached computed value that the spreadsheet app last wrote to the file.
  return XLSX.read(new Uint8Array(bytes), { type: 'array', cellDates: true });
}

/** Sheet names (tab names) in workbook order. */
export async function listSheets(file: File): Promise<string[]> {
  const workbook = await readWorkbook(file);
  return [...workbook.SheetNames];
}

function sheetToCsv(workbook: XLSX.WorkBook, sheetName: string): string {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error(`Sheet "${sheetName}" is not in this workbook.`);
  return XLSX.utils.sheet_to_csv(sheet);
}

/** Converts one sheet to a plain .csv. With no sheet chosen, a single-sheet
 * workbook still returns one .csv, and a multi-sheet workbook returns a ZIP
 * holding one .csv per sheet. */
export async function excelToCsv(file: File, sheetName?: string): Promise<ExcelResult> {
  const workbook = await readWorkbook(file);
  const names = workbook.SheetNames;
  if (names.length === 0) throw new Error('This workbook has no sheets.');
  const base = baseName(file.name);

  if (sheetName) {
    const csv = sheetToCsv(workbook, sheetName);
    const suffix = names.length > 1 ? `-${safeName(sheetName)}` : '';
    return {
      blob: new Blob([csv], { type: 'text/csv' }),
      filename: `${base}${suffix}.csv`,
    };
  }

  if (names.length === 1) {
    const csv = sheetToCsv(workbook, names[0]!);
    return { blob: new Blob([csv], { type: 'text/csv' }), filename: `${base}.csv` };
  }

  const entries: Record<string, Uint8Array> = {};
  names.forEach((name, i) => {
    // Prefix with the index so duplicate sanitized names can't overwrite each other.
    entries[`${String(i + 1).padStart(2, '0')}-${safeName(name)}.csv`] = strToU8(
      sheetToCsv(workbook, name),
    );
  });
  const zipped = zipSync(entries);
  return {
    blob: new Blob([zipped] as BlobPart[], { type: 'application/zip' }),
    filename: `${base}-sheets.zip`,
  };
}

/** Converts one sheet to a JSON array of objects, using the first row as keys.
 * With no sheet chosen, the first sheet in the workbook is used. */
export async function excelToJson(file: File, sheetName?: string): Promise<ExcelResult> {
  const workbook = await readWorkbook(file);
  const names = workbook.SheetNames;
  if (names.length === 0) throw new Error('This workbook has no sheets.');

  const target = sheetName ?? names[0]!;
  const sheet = workbook.Sheets[target];
  if (!sheet) throw new Error(`Sheet "${target}" is not in this workbook.`);

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  const json = JSON.stringify(rows, null, 2);

  const base = baseName(file.name);
  const suffix = sheetName && names.length > 1 ? `-${safeName(sheetName)}` : '';
  return {
    blob: new Blob([json], { type: 'application/json' }),
    filename: `${base}${suffix}.json`,
  };
}
