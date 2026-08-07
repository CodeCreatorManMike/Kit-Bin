import { PDFDocument } from 'pdf-lib';

export interface DeletePagesResult {
  blob: Blob;
  filename: string;
  pageCount: number;
  keptCount: number;
}

/** Creates a new PDF containing every source page except the selected pages. */
export async function deletePdfPages(
  file: File,
  pagesToDelete: number[],
  onProgress?: (message: string) => void,
): Promise<DeletePagesResult> {
  const bytes = await file.arrayBuffer();
  const source = await PDFDocument.load(bytes);
  const pageCount = source.getPageCount();
  const deleted = new Set(pagesToDelete);
  const pagesToKeep = source.getPageIndices().filter((pageIndex) => !deleted.has(pageIndex));

  if (pagesToKeep.length === 0) {
    throw new Error('Choose at least one page to keep. This tool cannot create an empty PDF.');
  }

  onProgress?.(`Copying ${pagesToKeep.length} page${pagesToKeep.length === 1 ? '' : 's'}…`);
  const output = await PDFDocument.create();
  const copiedPages = await output.copyPages(source, pagesToKeep);
  for (const page of copiedPages) output.addPage(page);

  const result = await output.save();
  const baseName = file.name.replace(/\.pdf$/i, '');
  return {
    blob: new Blob([result] as BlobPart[], { type: 'application/pdf' }),
    filename: `${baseName}-pages-removed.pdf`,
    pageCount,
    keptCount: pagesToKeep.length,
  };
}
