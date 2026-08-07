import * as pdfjs from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

interface PdfTextItem {
  str: string;
  hasEOL?: boolean;
}

export interface PdfToTextResult {
  blob: Blob;
  filename: string;
  pageCount: number;
  characterCount: number;
}

/** Extracts the text layer that already exists in a PDF. It intentionally does not perform OCR. */
export async function pdfToText(
  file: File,
  onProgress?: (message: string) => void,
): Promise<PdfToTextResult> {
  const bytes = await file.arrayBuffer();
  const document = await pdfjs.getDocument({ data: bytes, standardFontDataUrl: '/standard_fonts/' }).promise;

  try {
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      onProgress?.(`Reading page ${pageNumber} of ${document.numPages}…`);
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = content.items
        .map((item) => {
          const textItem = item as PdfTextItem;
          return `${textItem.str}${textItem.hasEOL ? '\n' : ' '}`;
        })
        .join('')
        .replace(/[ \t]+\n/g, '\n')
        .trim();
      pages.push(text);
    }

    const output = pages.join('\n\n');
    return {
      blob: new Blob([output], { type: 'text/plain;charset=utf-8' }),
      filename: file.name.replace(/\.pdf$/i, '.txt'),
      pageCount: document.numPages,
      characterCount: output.length,
    };
  } finally {
    document.cleanup();
  }
}
