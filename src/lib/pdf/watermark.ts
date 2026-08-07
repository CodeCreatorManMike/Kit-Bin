import { PDFDocument, rgb, degrees } from 'pdf-lib';

const WATERMARK_ANGLE_DEGREES = 45;

export async function watermarkPdf(file: File, text: string): Promise<Blob> {
  const bytes = await file.arrayBuffer();
  const doc = await PDFDocument.load(bytes);
  const font = await doc.embedFont('Helvetica');

  for (const page of doc.getPages()) {
    const { width, height } = page.getSize();
    const fontSize = Math.min(width, height) / 10;
    const textWidth = font.widthOfTextAtSize(text, fontSize);

    // Text is drawn diagonally, so its true footprint is a rotated bounding
    // box, not fontSize/textWidth — offset the draw origin so the rotated
    // text still lands centered on the page rather than centered on an
    // unrotated placement, which would push it visibly off-center.
    const angleRad = (WATERMARK_ANGLE_DEGREES * Math.PI) / 180;
    const x = width / 2 - (textWidth / 2) * Math.cos(angleRad);
    const y = height / 2 - (textWidth / 2) * Math.sin(angleRad);

    page.drawText(text, {
      x,
      y,
      size: fontSize,
      font,
      color: rgb(0.5, 0.5, 0.5),
      opacity: 0.3,
      rotate: degrees(WATERMARK_ANGLE_DEGREES),
    });
  }

  const out = await doc.save();
  return new Blob([out] as BlobPart[], { type: 'application/pdf' });
}
