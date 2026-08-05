import Papa from 'papaparse';

export interface MergeResult {
  blob: Blob;
  filename: string;
  note: string;
}

interface ParsedFile {
  name: string;
  fields: string[];
  rows: Record<string, string>[];
}

function parseCsv(file: File): Promise<ParsedFile> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        resolve({
          name: file.name,
          fields: (result.meta.fields ?? []).filter((f) => f !== ''),
          rows: result.data,
        });
      },
      error: reject,
    });
  });
}

/** Stacks the rows of several CSV files into one file. Headers are unioned, so
 * the output has a column for every header seen in any input file and a blank
 * cell wherever a file did not have that column. This is a vertical merge, not
 * a join on a key. */
export async function mergeCsvFiles(
  files: File[],
  onProgress?: (message: string) => void,
): Promise<MergeResult> {
  if (files.length < 2) throw new Error('Pick at least two CSV files to merge.');

  const parsed: ParsedFile[] = [];
  for (let i = 0; i < files.length; i++) {
    onProgress?.(`Reading file ${i + 1} of ${files.length}…`);
    parsed.push(await parseCsv(files[i]!));
  }

  // Union of headers, in first-seen order.
  const union: string[] = [];
  for (const file of parsed) {
    for (const field of file.fields) {
      if (!union.includes(field)) union.push(field);
    }
  }
  if (union.length === 0) throw new Error('None of these files had a header row with columns.');

  const mismatched = parsed.some(
    (file) => file.fields.length !== union.length || file.fields.some((f, i) => f !== union[i]),
  );

  onProgress?.('Merging rows…');
  const merged: Record<string, string>[] = [];
  for (const file of parsed) {
    for (const row of file.rows) {
      const out: Record<string, string> = {};
      for (const key of union) out[key] = row[key] ?? '';
      merged.push(out);
    }
  }

  const csv = Papa.unparse(merged, { columns: union });

  const noteParts = [
    `${files.length} files merged`,
    `${merged.length} total rows`,
    `${union.length} columns`,
  ];
  const note = mismatched
    ? `${noteParts.join(', ')}. Headers did not match across all files, so missing cells were left blank.`
    : `${noteParts.join(', ')}. All files had matching headers.`;

  return { blob: new Blob([csv], { type: 'text/csv' }), filename: 'merged.csv', note };
}
