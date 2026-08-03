import { PDFDocument, rgb } from 'pdf-lib';

export async function watermarkPdf(file: File, text: string): Promise<Blob> {
  const bytes = await file.arrayBuffer();
  const doc = await PDFDocument.load(bytes);
  const font = await doc.embedFont('Helvetica');

  for (const page of doc.getPages()) {
    const { width, height } = page.getSize();
    const fontSize = Math.min(width, height) / 10;
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    page.drawText(text, {
      x: (width - textWidth) / 2,
      y: height / 2,
      size: fontSize,
      font,
      color: rgb(0.5, 0.5, 0.5),
      opacity: 0.3,
    });
  }

  const out = await doc.save();
  return new Blob([out] as BlobPart[], { type: 'application/pdf' });
}
