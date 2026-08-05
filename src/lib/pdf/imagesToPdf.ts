/** Builds a PDF from a list of images, one image per page, in the order given.
 *
 * pdf-lib can only embed JPEG and PNG natively (`embedJpg` / `embedPng`).
 * Anything else (WebP, GIF, BMP, AVIF, HEIC-derived output, ...) is decoded
 * with the shared jSquash/Canvas helpers in `lib/image/codec.ts` and re-encoded
 * to PNG first, so the pixels survive losslessly through the conversion step. */
import { PDFDocument } from 'pdf-lib';
import type { PDFImage } from 'pdf-lib';
import { decodeImage, encodeImage } from '../image/codec';

/** A4 at 72 points per inch (595.28 x 841.89 pt). */
const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;

export type PageSize = 'fit-to-image' | 'a4';
export type Orientation = 'auto' | 'portrait' | 'landscape';

export interface ImagesToPdfOptions {
  /** `fit-to-image` gives each page the image's own pixel dimensions (as points).
   * `a4` puts every image on an A4 page, scaled to fit inside the margins. */
  pageSize: PageSize;
  /** A4 pages only. `auto` picks per image: landscape when the image is wider than tall. */
  orientation?: Orientation;
  /** A4 pages only. Margin on all four sides, in points. 72 pt = 1 inch. */
  margin?: number;
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot + 1).toLowerCase();
}

function isJpeg(file: File): boolean {
  const ext = extensionOf(file.name);
  return file.type === 'image/jpeg' || file.type === 'image/jpg' || ext === 'jpg' || ext === 'jpeg';
}

function isPng(file: File): boolean {
  return file.type === 'image/png' || extensionOf(file.name) === 'png';
}

/** Embeds one image, converting to PNG first when pdf-lib can't take it directly. */
async function embed(doc: PDFDocument, file: File): Promise<PDFImage> {
  if (isJpeg(file)) {
    try {
      return await doc.embedJpg(await file.arrayBuffer());
    } catch {
      // Mislabeled or unusual JPEG. Fall through to the decode/re-encode path.
    }
  } else if (isPng(file)) {
    try {
      return await doc.embedPng(await file.arrayBuffer());
    } catch {
      // Same as above.
    }
  }

  let png: Blob;
  try {
    const imageData = await decodeImage(file);
    png = await encodeImage(imageData, 'image/png');
  } catch {
    throw new Error(`${file.name} could not be decoded as an image, so it can't be added to the PDF.`);
  }
  return doc.embedPng(await png.arrayBuffer());
}

/** Converts images to a single PDF, one image per page, in the order supplied. */
export async function imagesToPdf(
  files: File[],
  opts: ImagesToPdfOptions,
  onProgress?: (message: string) => void,
): Promise<Blob> {
  if (files.length === 0) throw new Error('Select at least one image.');

  const margin = opts.margin ?? 36;
  const orientation = opts.orientation ?? 'auto';
  const doc = await PDFDocument.create();

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onProgress?.(`Adding image ${i + 1} of ${files.length}…`);

    const image = await embed(doc, file);
    const { width: imgWidth, height: imgHeight } = image;

    if (opts.pageSize === 'fit-to-image') {
      // The page is exactly the image's pixel dimensions, so the image is drawn
      // at 1:1 with no scaling and no margins.
      const page = doc.addPage([imgWidth, imgHeight]);
      page.drawImage(image, { x: 0, y: 0, width: imgWidth, height: imgHeight });
      continue;
    }

    const landscape =
      orientation === 'landscape' || (orientation === 'auto' && imgWidth > imgHeight);
    const pageWidth = landscape ? A4_HEIGHT : A4_WIDTH;
    const pageHeight = landscape ? A4_WIDTH : A4_HEIGHT;

    const availableWidth = Math.max(pageWidth - margin * 2, 1);
    const availableHeight = Math.max(pageHeight - margin * 2, 1);

    // One scale factor for both axes keeps the aspect ratio exactly. The image
    // is never stretched, only scaled up or down as a whole.
    const scale = Math.min(availableWidth / imgWidth, availableHeight / imgHeight);
    const drawWidth = imgWidth * scale;
    const drawHeight = imgHeight * scale;

    const page = doc.addPage([pageWidth, pageHeight]);
    page.drawImage(image, {
      x: (pageWidth - drawWidth) / 2,
      y: (pageHeight - drawHeight) / 2,
      width: drawWidth,
      height: drawHeight,
    });
  }

  onProgress?.('Writing PDF…');
  const bytes = await doc.save();
  return new Blob([bytes] as BlobPart[], { type: 'application/pdf' });
}
