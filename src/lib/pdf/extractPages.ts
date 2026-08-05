import { PDFDocument } from 'pdf-lib';
import { zipSync } from 'fflate';

export type ExtractMode = 'single' | 'separate';

export interface ExtractResult {
  blob: Blob;
  filename: string;
}

/** Reads a PDF just far enough to report how many pages it has. */
export async function getPageCount(file: File): Promise<number> {
  const bytes = await file.arrayBuffer();
  const doc = await PDFDocument.load(bytes);
  return doc.getPageCount();
}

/** Parses a page-range string like "1-3, 7, 10-12" into 0-indexed page numbers.
 * Order is preserved as typed, repeats are dropped after their first occurrence.
 * Anything unparseable or out of range throws with a message meant for the user. */
export function parsePageRanges(input: string, pageCount: number): number[] {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error('Enter at least one page number, for example 1-3, 7.');
  }

  const pages: number[] = [];
  const seen = new Set<number>();

  const addPage = (oneBased: number) => {
    if (!seen.has(oneBased)) {
      seen.add(oneBased);
      pages.push(oneBased - 1);
    }
  };

  const parseNumber = (raw: string, context: string): number => {
    const token = raw.trim();
    if (!/^\d+$/.test(token)) {
      throw new Error(`"${context}" isn't a page number. Use numbers like 1-3, 7.`);
    }
    const value = Number(token);
    if (value < 1) {
      throw new Error(`Pages start at 1, so "${context}" isn't valid.`);
    }
    if (value > pageCount) {
      throw new Error(`This PDF has ${pageCount} page${pageCount === 1 ? '' : 's'}, so "${context}" is out of range.`);
    }
    return value;
  };

  for (const rawPart of trimmed.split(',')) {
    const part = rawPart.trim();
    if (!part) {
      throw new Error('There is an empty entry in the page range. Remove the extra comma.');
    }

    const dashCount = (part.match(/-/g) ?? []).length;
    if (dashCount === 0) {
      addPage(parseNumber(part, part));
      continue;
    }
    if (dashCount > 1) {
      throw new Error(`"${part}" isn't a valid range. Use one dash, like 10-12.`);
    }

    const [rawStart, rawEnd] = part.split('-');
    const start = parseNumber(rawStart, part);
    const end = parseNumber(rawEnd, part);
    if (start > end) {
      throw new Error(`"${part}" counts backwards. Write ranges low to high, like ${end}-${start}.`);
    }
    for (let p = start; p <= end; p++) addPage(p);
  }

  return pages;
}

/** Copies the chosen pages out of the source PDF. `single` keeps them together in
 * one document in the order given, `separate` returns a zip of one PDF per page.
 * The source file is only read, never modified. */
export async function extractPages(
  file: File,
  pages: number[],
  mode: ExtractMode,
  onProgress?: (message: string) => void,
): Promise<ExtractResult> {
  if (pages.length === 0) {
    throw new Error('No pages selected. Enter a page range like 1-3, 7.');
  }

  const bytes = await file.arrayBuffer();
  const src = await PDFDocument.load(bytes);
  const baseName = file.name.replace(/\.pdf$/i, '');

  if (mode === 'single') {
    onProgress?.(`Copying ${pages.length} page${pages.length === 1 ? '' : 's'}…`);
    const doc = await PDFDocument.create();
    const copied = await doc.copyPages(src, pages);
    for (const page of copied) doc.addPage(page);
    const out = await doc.save();
    return {
      blob: new Blob([out] as BlobPart[], { type: 'application/pdf' }),
      filename: `${baseName}-extracted.pdf`,
    };
  }

  const files: Record<string, Uint8Array> = {};
  for (let i = 0; i < pages.length; i++) {
    onProgress?.(`Copying page ${i + 1} of ${pages.length}…`);
    const doc = await PDFDocument.create();
    const [page] = await doc.copyPages(src, [pages[i]]);
    doc.addPage(page);
    files[`${baseName}-page-${pages[i] + 1}.pdf`] = await doc.save();
  }

  onProgress?.('Zipping files…');
  const zipped = zipSync(files);
  return {
    blob: new Blob([zipped] as BlobPart[], { type: 'application/zip' }),
    filename: `${baseName}-extracted.zip`,
  };
}
