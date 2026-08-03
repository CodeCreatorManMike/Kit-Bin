import { PDFDocument } from 'pdf-lib';

export async function mergePdfs(files: File[], onProgress?: (message: string) => void): Promise<Blob> {
  const merged = await PDFDocument.create();
  for (let i = 0; i < files.length; i++) {
    onProgress?.(`Reading file ${i + 1} of ${files.length}…`);
    const file = files[i];
    const bytes = await file.arrayBuffer();
    const doc = await PDFDocument.load(bytes);
    const pages = await merged.copyPages(doc, doc.getPageIndices());
    pages.forEach((page) => merged.addPage(page));
  }
  onProgress?.('Finalizing merged PDF…');
  const bytes = await merged.save();
  return new Blob([bytes] as BlobPart[], { type: 'application/pdf' });
}
