import { PDFDocument } from 'pdf-lib';

export type SignPageTarget = 'all' | 'first' | 'last';

export interface SignOptions {
  /** Which page(s) get the signature stamped on. */
  target: SignPageTarget;
  /** Normalized top-left X of the signature box, 0-1 range relative to page width. */
  x: number;
  /** Normalized top-left Y of the signature box, 0-1 range relative to page height,
   *  measured from the TOP of the page (matches on-screen preview coordinates —
   *  converted to pdf-lib's bottom-left origin internally). */
  y: number;
  /** Normalized width of the signature box, 0-1 range relative to page width. */
  width: number;
  /** Normalized height of the signature box, 0-1 range relative to page height. */
  height: number;
}

/**
 * Stamp a signature PNG onto a PDF. `signaturePng` must be PNG bytes (a data
 * URL, ArrayBuffer, Uint8Array, or Blob all work) with a transparent
 * background so it composites onto the page without a white box around it.
 *
 * Position/size are normalized (0-1) so the caller never needs to know the
 * PDF's actual point dimensions — real coordinates are computed here from
 * each target page's own `getSize()`.
 */
export async function signPdf(
  file: File,
  signaturePng: string | ArrayBuffer | Uint8Array | Blob,
  options: SignOptions
): Promise<Blob> {
  const bytes = await file.arrayBuffer();
  const doc = await PDFDocument.load(bytes);
  const pageCount = doc.getPageCount();
  if (pageCount === 0) throw new Error('This PDF has no pages.');

  const pngBytes = await toUint8Array(signaturePng);
  const signatureImage = await doc.embedPng(pngBytes);

  const pages = doc.getPages();
  const targetIndexes = resolveTargetIndexes(options.target, pageCount);

  for (const i of targetIndexes) {
    const page = pages[i];
    const { width: pageWidth, height: pageHeight } = page.getSize();

    const boxWidth = options.width * pageWidth;
    const boxHeight = options.height * pageHeight;
    const drawX = options.x * pageWidth;
    // Flip from top-left-origin (preview/screen coordinates) to pdf-lib's
    // bottom-left origin, and account for the box's own height.
    const drawY = pageHeight - options.y * pageHeight - boxHeight;

    page.drawImage(signatureImage, {
      x: drawX,
      y: drawY,
      width: boxWidth,
      height: boxHeight,
    });
  }

  const outBytes = await doc.save();
  return new Blob([outBytes] as BlobPart[], { type: 'application/pdf' });
}

/** Read a PDF's page count and first-page aspect ratio, used to size the preview. */
export async function getPdfPreviewInfo(file: File): Promise<{ pageCount: number; width: number; height: number }> {
  const bytes = await file.arrayBuffer();
  const doc = await PDFDocument.load(bytes);
  const pageCount = doc.getPageCount();
  if (pageCount === 0) throw new Error('This PDF has no pages.');
  const { width, height } = doc.getPages()[0].getSize();
  return { pageCount, width, height };
}

function resolveTargetIndexes(target: SignPageTarget, pageCount: number): number[] {
  if (target === 'first') return [0];
  if (target === 'last') return [pageCount - 1];
  return Array.from({ length: pageCount }, (_, i) => i);
}

async function toUint8Array(input: string | ArrayBuffer | Uint8Array | Blob): Promise<Uint8Array> {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  if (input instanceof Blob) return new Uint8Array(await input.arrayBuffer());
  // data URL
  const match = /^data:image\/png;base64,(.*)$/.exec(input);
  const base64 = match ? match[1] : input;
  const binary = atob(base64);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
  return arr;
}
