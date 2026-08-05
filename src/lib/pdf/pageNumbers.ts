import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export type PageNumberPosition = 'bottom-center' | 'bottom-right' | 'bottom-left';

export interface PageNumberOptions {
  position: PageNumberPosition;
  /** Number printed on the first page that gets a number. */
  startAt: number;
  /** Leave the first page of the document blank, common for cover pages. */
  skipFirstPage: boolean;
}

const MARGIN = 36; // 0.5 inch
const FONT_SIZE = 11;

/** Draws page numbers as new text on top of each page. Existing page content is
 * left as it is. Each page is measured with getSize() so documents that mix page
 * sizes still get the number placed correctly relative to that page. */
export async function addPageNumbers(file: File, opts: PageNumberOptions): Promise<Blob> {
  const bytes = await file.arrayBuffer();
  const doc = await PDFDocument.load(bytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();

  let current = opts.startAt;
  for (let i = 0; i < pages.length; i++) {
    if (opts.skipFirstPage && i === 0) continue;

    const page = pages[i];
    const { width } = page.getSize();
    const label = String(current);
    const textWidth = font.widthOfTextAtSize(label, FONT_SIZE);

    let x: number;
    if (opts.position === 'bottom-left') {
      x = MARGIN;
    } else if (opts.position === 'bottom-right') {
      x = width - MARGIN - textWidth;
    } else {
      x = (width - textWidth) / 2;
    }

    page.drawText(label, {
      x,
      y: MARGIN,
      size: FONT_SIZE,
      font,
      color: rgb(0, 0, 0),
    });

    current++;
  }

  const out = await doc.save();
  return new Blob([out] as BlobPart[], { type: 'application/pdf' });
}
