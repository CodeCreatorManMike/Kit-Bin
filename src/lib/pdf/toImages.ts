import * as pdfjs from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { zipSync } from 'fflate';

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

export interface ToImagesResult {
  blob: Blob;
  filename: string;
}

export async function pdfToImages(file: File): Promise<ToImagesResult> {
  const bytes = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: bytes, standardFontDataUrl: '/standard_fonts/' }).promise;
  const baseName = file.name.replace(/\.pdf$/i, '');
  const files: Record<string, Uint8Array> = {};

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    const blob: Blob = await new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Render failed'))), 'image/png'),
    );
    files[`${baseName}-page-${i}.png`] = new Uint8Array(await blob.arrayBuffer());
  }

  if (doc.numPages === 1) {
    const [name, bytes] = Object.entries(files)[0];
    return { blob: new Blob([bytes] as BlobPart[], { type: 'image/png' }), filename: name };
  }

  const zipped = zipSync(files);
  return { blob: new Blob([zipped] as BlobPart[], { type: 'application/zip' }), filename: `${baseName}-pages.zip` };
}
