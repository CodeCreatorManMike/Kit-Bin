import { PDFDocument, degrees } from 'pdf-lib';

export async function rotatePdf(file: File, degreesAmount: 90 | 180 | 270): Promise<Blob> {
  const bytes = await file.arrayBuffer();
  const doc = await PDFDocument.load(bytes);
  for (const page of doc.getPages()) {
    const current = page.getRotation().angle;
    page.setRotation(degrees((current + degreesAmount) % 360));
  }
  const out = await doc.save();
  return new Blob([out] as BlobPart[], { type: 'application/pdf' });
}
