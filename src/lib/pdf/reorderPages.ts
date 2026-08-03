import { PDFDocument } from 'pdf-lib';

export async function getPageCount(file: File): Promise<number> {
  const doc = await PDFDocument.load(await file.arrayBuffer());
  return doc.getPageCount();
}

/** order is a 0-indexed array covering every original page exactly once. */
export async function reorderPages(file: File, order: number[]): Promise<Blob> {
  const bytes = await file.arrayBuffer();
  const src = await PDFDocument.load(bytes);
  const pageCount = src.getPageCount();

  const valid =
    order.length === pageCount &&
    new Set(order).size === pageCount &&
    order.every((i) => i >= 0 && i < pageCount);
  if (!valid) throw new Error(`Order must list all ${pageCount} pages exactly once.`);

  const out = await PDFDocument.create();
  const pages = await out.copyPages(src, order);
  pages.forEach((p) => out.addPage(p));

  const outBytes = await out.save();
  return new Blob([outBytes] as BlobPart[], { type: 'application/pdf' });
}
