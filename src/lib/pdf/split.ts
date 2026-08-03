import { PDFDocument } from 'pdf-lib';
import { zipSync } from 'fflate';

export interface SplitResult {
  blob: Blob;
  filename: string;
}

/** Splits every page of the input PDF into its own single-page PDF.
 * Returns a zip when there's more than one output file. */
export async function splitPdf(file: File): Promise<SplitResult> {
  const bytes = await file.arrayBuffer();
  const src = await PDFDocument.load(bytes);
  const pageCount = src.getPageCount();
  const baseName = file.name.replace(/\.pdf$/i, '');

  if (pageCount <= 1) {
    return { blob: new Blob([bytes] as BlobPart[], { type: 'application/pdf' }), filename: `${baseName}.pdf` };
  }

  const files: Record<string, Uint8Array> = {};
  for (let i = 0; i < pageCount; i++) {
    const doc = await PDFDocument.create();
    const [page] = await doc.copyPages(src, [i]);
    doc.addPage(page);
    files[`${baseName}-page-${i + 1}.pdf`] = await doc.save();
  }

  const zipped = zipSync(files);
  return { blob: new Blob([zipped] as BlobPart[], { type: 'application/zip' }), filename: `${baseName}-split.zip` };
}
